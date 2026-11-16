/**
 * In-memory fake of the slice of the GitHub REST API that CMS Studio uses.
 *
 * It replaces globalThis.fetch (both @octokit/rest and raw fetch() calls in src/lib go through it), keeps a
 * real commit graph (commits -> flattened trees -> blobs), refs, pull requests, reviews, issues, comments and
 * collaborators, and throws on anything it does not implement so a test can never reach the real GitHub.
 */
import crypto from "node:crypto";

export const OWNER = "blackscythe123";
export const REPO = "CC-Website-2026";
export const FULL_NAME = `${OWNER}/${REPO}`;

type Tree = Map<string, string>; // path -> blob sha

interface Identity {
  name: string;
  email: string;
  date: string;
}
interface Commit {
  sha: string;
  tree: string;
  parents: string[];
  message: string;
  author: Identity;
  committer: Identity;
  /** GitHub login the author email resolves to (null when it resolves to nobody). */
  authorLogin: string | null;
}
export interface Review {
  id: number;
  user: { login: string };
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED";
  commit_id: string;
  body: string;
  submitted_at: string;
}
export interface Comment {
  id: number;
  user: { login: string };
  body: string;
  created_at: string;
}
export interface Pull {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  merged: boolean;
  user: string;
  headRef: string;
  headRepo: string;
  /** For PRs from another repository the head commit lives here instead of in refs. */
  forkSha?: string;
  frozenHeadSha?: string;
  baseRef: string;
  created_at: string;
  merge_commit_sha?: string;
}
export interface Issue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  state_reason: string | null;
  user: string;
  labels: string[];
  created_at: string;
  closed_by: string | null;
}
export interface LoggedRequest {
  method: string;
  path: string;
  query: string;
  user: string | null;
  status: number;
  body?: unknown;
}

interface Ctx {
  method: string;
  path: string; // decoded path, with the /repos/<owner>/<repo> prefix removed when present
  url: URL;
  query: URLSearchParams;
  body: any;
  user: string | null;
}
interface Result {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const sha1 = (s: string | Buffer) => crypto.createHash("sha1").update(s).digest("hex");
const blobSha = (b: Buffer) => sha1(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b]));
const toBuf = (v: string | Buffer) => (typeof v === "string" ? Buffer.from(v, "utf-8") : v);

export class FakeGitHub {
  private blobs = new Map<string, Buffer>();
  private trees = new Map<string, Tree>();
  private commits = new Map<string, Commit>();
  private refs = new Map<string, string>(); // "heads/main" -> commit sha
  pulls: Pull[] = [];
  private issues: Issue[] = [];
  private reviews = new Map<number, Review[]>();
  private comments = new Map<number, Comment[]>();
  private nextNumber = 1;
  private nextId = 1000;
  private clock = Date.parse("2026-11-01T09:00:00Z");
  private counter = 0;

  users = new Map<string, { login: string; name: string }>(); // token -> user
  collaborators = new Set<string>([OWNER]);
  invitations = new Set<string>();

  log: LoggedRequest[] = [];
  /** Requests nothing in the fake knows how to answer. Tests assert this stays empty. */
  unhandled: string[] = [];
  private failures: ((c: Ctx) => number | undefined)[] = [];
  private afterHooks: ((c: Ctx, r: Result) => void)[] = [];

  constructor() {
    this.addUser(OWNER, "Repo Owner");
  }

  // ---------------------------------------------------------------- identities
  addUser(login: string, name?: string, opts: { collaborator?: boolean } = {}): string {
    const token = `tok-${login}`;
    this.users.set(token, { login, name: name || login });
    if (opts.collaborator) this.collaborators.add(login);
    return token;
  }
  tokenFor(login: string) {
    return `tok-${login}`;
  }
  private canPush(login: string | null) {
    return !!login && (login === OWNER || this.collaborators.has(login));
  }

  // ---------------------------------------------------------------- clock / ids
  now(): string {
    this.clock += 30_000;
    return new Date(this.clock).toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  // ---------------------------------------------------------------- object store
  private putBlob(b: Buffer): string {
    const s = blobSha(b);
    this.blobs.set(s, b);
    return s;
  }
  private makeTree(t: Tree): string {
    const s = sha1([...t.entries()].sort().map(([p, b]) => `${p}\0${b}`).join("\n"));
    this.trees.set(s, new Map(t));
    return s;
  }
  private makeCommit(o: {
    tree: string;
    parents: string[];
    message: string;
    authorLogin: string | null;
    author?: { name: string; email: string; date?: string };
    committer?: { name: string; email: string; date?: string };
  }): string {
    const date = this.now();
    const author = { name: o.author?.name || "unknown", email: o.author?.email || "unknown@example.com", date: o.author?.date || date };
    const committer = { name: o.committer?.name || author.name, email: o.committer?.email || author.email, date: o.committer?.date || date };
    const sha = sha1(`${o.tree}\n${o.parents.join(",")}\n${o.message}\n${++this.counter}\n${date}`);
    this.commits.set(sha, { sha, tree: o.tree, parents: o.parents, message: o.message, author, committer, authorLogin: o.authorLogin });
    return sha;
  }
  private treeOfCommit(sha: string): Tree {
    const c = this.commits.get(sha);
    if (!c) throw new HttpError(404, "Not Found");
    return new Map(this.trees.get(c.tree)!);
  }
  private ancestors(sha: string): Set<string> {
    const seen = new Set<string>();
    const stack = [sha];
    while (stack.length) {
      const s = stack.pop()!;
      if (seen.has(s)) continue;
      seen.add(s);
      stack.push(...(this.commits.get(s)?.parents || []));
    }
    return seen;
  }
  private mergeBase(a: string, b: string): string | null {
    const anc = this.ancestors(b);
    const queue = [a];
    const seen = new Set<string>();
    while (queue.length) {
      const s = queue.shift()!;
      if (seen.has(s)) continue;
      seen.add(s);
      if (anc.has(s)) return s;
      queue.push(...(this.commits.get(s)?.parents || []));
    }
    return null;
  }
  private resolveRef(ref: string | null | undefined): string | null {
    if (!ref) return this.refs.get("heads/main") || null;
    const r = ref.replace(/^refs\//, "");
    if (this.refs.has(r)) return this.refs.get(r)!;
    if (this.refs.has(`heads/${r}`)) return this.refs.get(`heads/${r}`)!;
    if (this.commits.has(ref)) return ref;
    return null;
  }
  private loginFromEmail(email: string | undefined): string | null {
    const m = email?.match(/^(?:\d+\+)?([^@+]+)@users\.noreply\.github\.com$/);
    return m ? m[1] : null;
  }

  // ---------------------------------------------------------------- public state helpers (for tests)
  seedMain(files: Record<string, string | Buffer>) {
    const t: Tree = new Map();
    for (const [p, c] of Object.entries(files)) t.set(p, this.putBlob(toBuf(c)));
    const sha = this.makeCommit({
      tree: this.makeTree(t),
      parents: [],
      message: "chore: initial content",
      authorLogin: OWNER,
      author: { name: "Seed", email: "seed@example.com" },
    });
    this.refs.set("heads/main", sha);
  }
  tip(ref = "main"): string {
    const s = this.resolveRef(ref);
    if (!s) throw new Error(`fake: no such ref ${ref}`);
    return s;
  }
  hasBranch(name: string) {
    return this.refs.has(`heads/${name}`);
  }
  branches(prefix = ""): string[] {
    return [...this.refs.keys()].filter((k) => k.startsWith("heads/")).map((k) => k.slice(6)).filter((n) => n.startsWith(prefix));
  }
  readFile(ref: string, path: string): Buffer | null {
    const sha = this.resolveRef(ref);
    if (!sha) return null;
    const b = this.treeOfCommit(sha).get(path);
    return b ? this.blobs.get(b)! : null;
  }
  readText(ref: string, path: string): string | null {
    return this.readFile(ref, path)?.toString("utf-8") ?? null;
  }
  readJson<T = any>(ref: string, path: string): T {
    const t = this.readText(ref, path);
    if (t === null) throw new Error(`fake: ${path} missing on ${ref}`);
    return JSON.parse(t);
  }
  listFiles(ref: string): string[] {
    return [...this.treeOfCommit(this.tip(ref)).keys()].sort();
  }
  /** Commit messages from the tip of a ref back to the root (newest first). */
  history(ref = "main"): Commit[] {
    const out: Commit[] = [];
    let s: string | undefined = this.tip(ref);
    while (s) {
      const c: Commit = this.commits.get(s)!;
      out.push(c);
      s = c.parents[0];
    }
    return out;
  }
  /** Files a branch changes relative to main (three-dot diff). */
  changedFiles(branchOrSha: string): { filename: string; status: string; previous_filename?: string }[] {
    const head = this.tip(branchOrSha);
    const base = this.mergeBase(this.tip("main"), head)!;
    return this.diff(this.treeOfCommit(base), this.treeOfCommit(head)).map(({ filename, status, previous_filename }) => ({
      filename,
      status,
      ...(previous_filename ? { previous_filename } : {}),
    }));
  }
  createBranch(name: string, from = "main") {
    if (this.refs.has(`heads/${name}`)) throw new Error(`fake: branch ${name} exists`);
    this.refs.set(`heads/${name}`, this.tip(from));
  }
  /** Commit file changes (null deletes) straight onto a branch, as if someone pushed outside the CMS. */
  push(branch: string, changes: Record<string, string | Buffer | null>, o: { message?: string; author?: string } = {}): string {
    const tip = this.tip(branch);
    const t = this.treeOfCommit(tip);
    for (const [p, c] of Object.entries(changes)) {
      if (c === null) t.delete(p);
      else t.set(p, this.putBlob(toBuf(c)));
    }
    const sha = this.makeCommit({
      tree: this.makeTree(t),
      parents: [tip],
      message: o.message || "push",
      authorLogin: o.author || null,
      author: { name: o.author || "pusher", email: `${o.author || "pusher"}@users.noreply.github.com` },
    });
    this.refs.set(`heads/${branch}`, sha);
    return sha;
  }
  /** Open a PR directly in the fake (bypassing the CMS). */
  openPull(o: { author: string; head: string; title: string; body?: string; headRepo?: string; forkSha?: string; base?: string }): Pull {
    const p: Pull = {
      number: this.nextNumber++,
      title: o.title,
      body: o.body || "",
      state: "open",
      merged: false,
      user: o.author,
      headRef: o.head,
      headRepo: o.headRepo || FULL_NAME,
      forkSha: o.forkSha,
      baseRef: o.base || "main",
      created_at: this.now(),
    };
    this.pulls.push(p);
    return p;
  }
  pull(n: number): Pull {
    const p = this.pulls.find((x) => x.number === n);
    if (!p) throw new Error(`fake: no PR #${n}`);
    return p;
  }
  headSha(n: number): string {
    return this.pullHead(this.pull(n));
  }
  reviewsOf(n: number): Review[] {
    return [...(this.reviews.get(n) || [])];
  }
  commentsOf(n: number): Comment[] {
    return [...(this.comments.get(n) || [])];
  }
  issue(n: number): Issue {
    const i = this.issues.find((x) => x.number === n);
    if (!i) throw new Error(`fake: no issue #${n}`);
    return i;
  }
  /** What the issue's author can do themselves on github.com: edit the issue body. */
  editIssue(n: number, patch: { body?: string; title?: string }) {
    Object.assign(this.issue(n), patch);
  }
  acceptInvitation(login: string) {
    this.invitations.delete(login);
    this.collaborators.add(login);
  }
  requests(filter?: (r: LoggedRequest) => boolean): LoggedRequest[] {
    return filter ? this.log.filter(filter) : [...this.log];
  }
  mutations(): LoggedRequest[] {
    return this.log.filter((r) => r.method !== "GET" && r.status < 400);
  }
  /** Make requests matching pred fail with the given status. */
  failWhen(pred: (c: { method: string; path: string }) => number | undefined): () => void {
    const f = (c: Ctx) => pred({ method: c.method, path: c.path });
    this.failures.push(f);
    return () => {
      this.failures = this.failures.filter((x) => x !== f);
    };
  }
  /** Run something right after the fake has answered a request (e.g. commit a competing change). */
  afterRequest(fn: (c: { method: string; path: string }) => void): () => void {
    const h = (c: Ctx) => fn({ method: c.method, path: c.path });
    this.afterHooks.push(h);
    return () => {
      this.afterHooks = this.afterHooks.filter((x) => x !== h);
    };
  }

  // ---------------------------------------------------------------- diff / merge
  private diff(base: Tree, head: Tree) {
    const files: { filename: string; status: string; sha: string; previous_filename?: string }[] = [];
    const added: string[] = [];
    const removed: string[] = [];
    for (const [p, b] of head) {
      if (!base.has(p)) added.push(p);
      else if (base.get(p) !== b) files.push({ filename: p, status: "modified", sha: b });
    }
    for (const p of base.keys()) if (!head.has(p)) removed.push(p);
    // rename detection: identical content removed + added
    for (const r of [...removed]) {
      const i = added.findIndex((a) => head.get(a) === base.get(r));
      if (i >= 0) {
        files.push({ filename: added[i], status: "renamed", sha: head.get(added[i])!, previous_filename: r });
        added.splice(i, 1);
        removed.splice(removed.indexOf(r), 1);
      }
    }
    for (const p of added) files.push({ filename: p, status: "added", sha: head.get(p)! });
    for (const p of removed) files.push({ filename: p, status: "removed", sha: base.get(p)! });
    return files.sort((a, b) => a.filename.localeCompare(b.filename));
  }
  private pullHead(p: Pull): string {
    if (p.frozenHeadSha) return p.frozenHeadSha;
    if (p.headRepo !== FULL_NAME) return p.forkSha!;
    const s = this.refs.get(`heads/${p.headRef}`);
    if (!s) throw new HttpError(404, "Not Found");
    return s;
  }

  // ---------------------------------------------------------------- JSON shapes
  private ident(i: Identity) {
    return { name: i.name, email: i.email, date: i.date };
  }
  private commitJson(c: Commit) {
    return {
      sha: c.sha,
      node_id: c.sha,
      commit: { message: c.message, author: this.ident(c.author), committer: this.ident(c.committer), tree: { sha: c.tree } },
      author: c.authorLogin ? { login: c.authorLogin } : null,
      committer: null,
      parents: c.parents.map((sha) => ({ sha })),
    };
  }
  private userJson(login: string) {
    return { login, avatar_url: `https://avatars.example.com/${login}.png`, id: 1 };
  }
  private pullJson(p: Pull) {
    const head = this.pullHead(p);
    const base = p.state === "open" || !p.merge_commit_sha ? this.tip(p.baseRef) : this.commits.get(p.merge_commit_sha)!.parents[0];
    const baseNow = p.state === "open" || !p.merge_commit_sha ? this.tip(p.baseRef) : base;
    const mb = this.mergeBase(baseNow, head)!;
    const excl = this.ancestors(mb);
    return {
      number: p.number,
      state: p.state,
      title: p.title,
      body: p.body,
      changed_files: this.diff(this.treeOfCommit(mb), this.treeOfCommit(head)).length,
      commits: [...this.ancestors(head)].filter((x) => !excl.has(x)).length,
      html_url: `https://github.com/${FULL_NAME}/pull/${p.number}`,
      created_at: p.created_at,
      merged: p.merged,
      merge_commit_sha: p.merge_commit_sha || null,
      user: this.userJson(p.user),
      head: {
        ref: p.headRef,
        sha: head,
        repo: { full_name: p.headRepo, name: p.headRepo.split("/")[1], owner: { login: p.headRepo.split("/")[0] } },
      },
      base: { ref: p.baseRef, sha: base, repo: { full_name: FULL_NAME, name: REPO, owner: { login: OWNER } } },
    };
  }
  private issueJson(i: Issue) {
    return {
      number: i.number,
      title: i.title,
      body: i.body,
      state: i.state,
      state_reason: i.state_reason,
      created_at: i.created_at,
      user: this.userJson(i.user),
      labels: i.labels.map((name) => ({ name })),
      closed_by: i.closed_by ? this.userJson(i.closed_by) : null,
    };
  }
  private fileJson(path: string, blob: string) {
    const buf = this.blobs.get(blob)!;
    return {
      type: "file",
      name: path.split("/").pop(),
      path,
      sha: blob,
      size: buf.length,
      encoding: "base64",
      content: buf.toString("base64").replace(/(.{60})/g, "$1\n"),
    };
  }
  private paginate<T>(items: T[], c: Ctx): Result {
    const per = Math.min(100, Number(c.query.get("per_page")) || 30);
    const page = Math.max(1, Number(c.query.get("page")) || 1);
    const slice = items.slice((page - 1) * per, page * per);
    const headers: Record<string, string> = {};
    if (page * per < items.length) {
      const u = new URL(c.url.toString());
      u.searchParams.set("page", String(page + 1));
      headers.link = `<${u.toString()}>; rel="next"`;
    }
    return { status: 200, body: slice, headers };
  }

  // ---------------------------------------------------------------- request handling
  install(vi: { stubGlobal: (name: string, value: unknown) => unknown }) {
    vi.stubGlobal("fetch", (input: any, init?: any) => this.handle(input, init));
  }

  private async handle(input: any, init: any = {}): Promise<Response> {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(urlStr);
    const method = String(init.method || (typeof input === "object" && input.method) || "GET").toUpperCase();
    const hdrs = new Headers(init.headers || {});
    let body: any = undefined;
    if (typeof init.body === "string" && init.body.length) {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }

    // user from Authorization header
    let user: string | null = null;
    const auth = hdrs.get("authorization");
    let badCreds = false;
    if (auth) {
      const tok = auth.replace(/^(?:Bearer|token)\s+/i, "").trim();
      const u = this.users.get(tok);
      if (u) user = u.login;
      else badCreds = true;
    }

    const ctx: Ctx = { method, path: "", url, query: url.searchParams, body, user };
    let result: Result;
    try {
      if (url.hostname === "raw.githubusercontent.com") {
        ctx.path = decodeURIComponent(url.pathname);
        result = this.raw(ctx);
      } else if (url.hostname === "api.github.com") {
        ctx.path = decodeURIComponent(url.pathname);
        if (badCreds) throw new HttpError(401, "Bad credentials");
        const fail = this.failures.map((f) => f(ctx)).find((s) => s !== undefined);
        if (fail !== undefined) throw new HttpError(fail, "Injected failure");
        result = this.route(ctx);
      } else {
        this.unhandled.push(`${method} ${urlStr}`);
        throw new Error(`fake GitHub: refusing request to unexpected host ${url.hostname} (${method} ${urlStr})`);
      }
    } catch (e) {
      if (e instanceof HttpError) {
        result = { status: e.status, body: { message: e.message, documentation_url: "https://docs.github.com/rest" } };
      } else {
        throw e;
      }
    }
    this.log.push({
      method,
      path: ctx.path,
      query: url.search,
      user,
      status: result.status,
      body: method === "GET" ? undefined : body,
    });
    for (const h of [...this.afterHooks]) h(ctx, result);

    const headers: Record<string, string> = { "content-type": "application/json; charset=utf-8", ...(result.headers || {}) };
    if (result.status === 204 || result.body === undefined) return new Response(null, { status: result.status, headers });
    return new Response(JSON.stringify(result.body), { status: result.status, headers });
  }

  private raw(c: Ctx): Result {
    const m = c.path.match(/^\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!m || `${m[1]}/${m[2]}` !== FULL_NAME) return { status: 404, body: { message: "404: Not Found" } };
    const f = this.readFile(m[3], m[4]);
    if (!f) return { status: 404, body: { message: "404: Not Found" } };
    return { status: 200, body: JSON.parse(f.toString("utf-8")) };
  }

  private requirePush(c: Ctx) {
    if (!c.user) throw new HttpError(401, "Requires authentication");
    if (!this.canPush(c.user)) throw new HttpError(403, "Resource not accessible by personal access token");
  }
  private requireUser(c: Ctx) {
    if (!c.user) throw new HttpError(401, "Requires authentication");
    return c.user;
  }

  private route(c: Ctx): Result {
    const { method } = c;
    if (c.path === "/user" && method === "GET") {
      const login = this.requireUser(c);
      const u = [...this.users.values()].find((x) => x.login === login)!;
      return { status: 200, body: { login: u.login, name: u.name, avatar_url: `https://avatars.example.com/${u.login}.png`, id: 1 } };
    }
    let m = c.path.match(/^\/users\/([^/]+)$/);
    if (m && method === "GET") {
      const u = [...this.users.values()].find((x) => x.login.toLowerCase() === m![1].toLowerCase());
      if (!u) throw new HttpError(404, "Not Found");
      return { status: 200, body: { login: u.login, name: u.name, avatar_url: `https://avatars.example.com/${u.login}.png`, id: 1, type: "User" } };
    }

    const prefix = `/repos/${OWNER}/${REPO}`;
    if (!c.path.startsWith(prefix)) {
      this.unhandled.push(`${method} ${c.path}`);
      throw new Error(`fake GitHub: unhandled ${method} ${c.path}`);
    }
    const p = c.path.slice(prefix.length) || "/";
    const r = this.repoRoute(c, p);
    if (!r) {
      this.unhandled.push(`${method} ${c.path}`);
      throw new Error(`fake GitHub: unhandled ${method} ${c.path}`);
    }
    return r;
  }

  private repoRoute(c: Ctx, p: string): Result | null {
    const { method } = c;
    let m: RegExpMatchArray | null;

    if (p === "/" && method === "GET") {
      const push = this.canPush(c.user);
      return {
        status: 200,
        body: { full_name: FULL_NAME, default_branch: "main", permissions: { admin: c.user === OWNER, push, pull: true } },
      };
    }

    // ------------------------------------------------------------ git data
    if ((m = p.match(/^\/git\/ref\/(.+)$/)) && method === "GET") {
      const sha = this.refs.get(m[1]);
      if (!sha) throw new HttpError(404, "Not Found");
      return { status: 200, body: { ref: `refs/${m[1]}`, object: { sha, type: "commit" } } };
    }
    if ((m = p.match(/^\/git\/matching-refs\/(.+)$/)) && method === "GET") {
      const items = [...this.refs.entries()]
        .filter(([k]) => k.startsWith(m![1]))
        .map(([k, sha]) => ({ ref: `refs/${k}`, object: { sha, type: "commit" } }));
      return this.paginate(items, c);
    }
    if (p === "/git/refs" && method === "POST") {
      this.requirePush(c);
      const ref = String(c.body?.ref || "");
      const sha = String(c.body?.sha || "");
      const key = ref.replace(/^refs\//, "");
      if (!ref.startsWith("refs/heads/")) throw new HttpError(422, "Reference name is invalid");
      if (this.refs.has(key)) throw new HttpError(422, "Reference already exists");
      if (!this.commits.has(sha)) throw new HttpError(422, "Object does not exist");
      this.refs.set(key, sha);
      return { status: 201, body: { ref, object: { sha, type: "commit" } } };
    }
    if ((m = p.match(/^\/git\/refs\/(.+)$/))) {
      const key = m[1];
      if (method === "PATCH") {
        this.requirePush(c);
        const cur = this.refs.get(key);
        if (!cur) throw new HttpError(422, "Reference does not exist");
        const sha = String(c.body?.sha || "");
        if (!this.commits.has(sha)) throw new HttpError(422, "Object does not exist");
        if (!c.body?.force && !this.ancestors(sha).has(cur)) throw new HttpError(422, "Update is not a fast forward");
        this.refs.set(key, sha);
        return { status: 200, body: { ref: `refs/${key}`, object: { sha, type: "commit" } } };
      }
      if (method === "DELETE") {
        this.requirePush(c);
        if (!this.refs.has(key)) throw new HttpError(422, "Reference does not exist");
        if (key === "heads/main") throw new HttpError(422, "Cannot delete main");
        this.refs.delete(key);
        return { status: 204 };
      }
    }
    if ((m = p.match(/^\/git\/commits\/([0-9a-f]{40})$/)) && method === "GET") {
      const cm = this.commits.get(m[1]);
      if (!cm) throw new HttpError(404, "Not Found");
      return {
        status: 200,
        body: { sha: cm.sha, tree: { sha: cm.tree }, message: cm.message, author: this.ident(cm.author), committer: this.ident(cm.committer), parents: cm.parents.map((sha) => ({ sha })) },
      };
    }
    if (p === "/git/commits" && method === "POST") {
      this.requirePush(c);
      const b = c.body || {};
      if (!this.trees.has(b.tree)) throw new HttpError(422, "Tree SHA does not exist");
      for (const par of b.parents || []) if (!this.commits.has(par)) throw new HttpError(422, "Parent does not exist");
      const author = b.author as { name: string; email: string } | undefined;
      const sha = this.makeCommit({
        tree: b.tree,
        parents: b.parents || [],
        message: b.message,
        authorLogin: author ? this.loginFromEmail(author.email) : c.user,
        author,
        committer: b.committer,
      });
      const cm = this.commits.get(sha)!;
      return { status: 201, body: { sha, tree: { sha: cm.tree }, message: cm.message, author: this.ident(cm.author), parents: cm.parents.map((s) => ({ sha: s })) } };
    }
    if (p === "/git/trees" && method === "POST") {
      this.requirePush(c);
      const b = c.body || {};
      let t: Tree = new Map();
      if (b.base_tree) {
        const base = this.trees.get(b.base_tree);
        if (!base) throw new HttpError(422, "base_tree does not exist");
        t = new Map(base);
      }
      for (const e of b.tree || []) {
        if (typeof e.content === "string") t.set(e.path, this.putBlob(Buffer.from(e.content, "utf-8")));
        else if (e.sha) {
          if (!this.blobs.has(e.sha)) throw new HttpError(422, "blob does not exist");
          t.set(e.path, e.sha);
        } else t.delete(e.path);
      }
      return { status: 201, body: { sha: this.makeTree(t), tree: [] } };
    }
    if ((m = p.match(/^\/git\/trees\/(.+)$/)) && method === "GET") {
      let t: Tree | undefined = this.trees.get(m[1]);
      let sha = m[1];
      if (!t) {
        const cs = this.resolveRef(m[1]);
        if (!cs) throw new HttpError(404, "Not Found");
        sha = this.commits.get(cs)!.tree;
        t = this.trees.get(sha)!;
      }
      const tree = [...t.entries()].sort().map(([path, s]) => ({ path, mode: "100644", type: "blob", sha: s, size: this.blobs.get(s)!.length }));
      return { status: 200, body: { sha, tree, truncated: false } };
    }
    if ((m = p.match(/^\/git\/blobs\/([0-9a-f]{40})$/)) && method === "GET") {
      const b = this.blobs.get(m[1]);
      if (!b) throw new HttpError(404, "Not Found");
      return { status: 200, body: { sha: m[1], encoding: "base64", content: b.toString("base64"), size: b.length } };
    }

    // ------------------------------------------------------------ contents
    if ((m = p.match(/^\/contents\/(.+)$/))) {
      const path = m[1].replace(/\/+$/, "");
      if (method === "GET") {
        const sha = this.resolveRef(c.query.get("ref"));
        if (!sha) throw new HttpError(404, "No commit found for the ref");
        const t = this.treeOfCommit(sha);
        if (t.has(path)) return { status: 200, body: this.fileJson(path, t.get(path)!) };
        const dirPrefix = `${path}/`;
        const kids = new Map<string, { type: string; sha: string }>();
        for (const [fp, b] of t) {
          if (!fp.startsWith(dirPrefix)) continue;
          const rest = fp.slice(dirPrefix.length);
          const name = rest.split("/")[0];
          kids.set(name, rest.includes("/") ? { type: "dir", sha: "" } : { type: "file", sha: b });
        }
        if (kids.size === 0) throw new HttpError(404, "Not Found");
        return { status: 200, body: [...kids.entries()].map(([name, v]) => ({ name, path: `${path}/${name}`, type: v.type, sha: v.sha })) };
      }
      if (method === "PUT" || method === "DELETE") {
        this.requirePush(c);
        const b = c.body || {};
        const branch = String(b.branch || "main");
        const tip = this.refs.get(`heads/${branch}`);
        if (!tip) throw new HttpError(404, "Branch not found");
        const t = this.treeOfCommit(tip);
        const existing = t.get(path);
        let status = 200;
        if (method === "PUT") {
          if (typeof b.content !== "string") throw new HttpError(422, "content is not a valid Base64 string");
          if (existing && !b.sha) throw new HttpError(422, `Invalid request.\n\n"sha" wasn't supplied.`);
          if (existing && b.sha !== existing) throw new HttpError(409, `${path} does not match ${b.sha}`);
          if (!existing && b.sha) throw new HttpError(409, `${path} does not match ${b.sha}`);
          if (!existing) status = 201;
          t.set(path, this.putBlob(Buffer.from(b.content, "base64")));
        } else {
          if (!existing) throw new HttpError(404, "Not Found");
          if (b.sha !== existing) throw new HttpError(409, `${path} does not match ${b.sha}`);
          t.delete(path);
        }
        const author = b.author as { name: string; email: string } | undefined;
        const sha = this.makeCommit({
          tree: this.makeTree(t),
          parents: [tip],
          message: String(b.message || ""),
          authorLogin: author ? this.loginFromEmail(author.email) : c.user,
          author: author || { name: c.user!, email: `${c.user}@users.noreply.github.com` },
          committer: b.committer,
        });
        this.refs.set(`heads/${branch}`, sha);
        return {
          status,
          body: {
            content: method === "PUT" ? { name: path.split("/").pop(), path, sha: t.get(path) } : null,
            commit: { sha, message: b.message },
          },
        };
      }
    }

    // ------------------------------------------------------------ commits / compare
    if (p === "/commits" && method === "GET") {
      // first-parent history of a ref, newest first (enough for the Studio's "recent changes" reads)
      let sha = this.resolveRef(c.query.get("sha") || "main");
      if (!sha) throw new HttpError(404, "Not Found");
      const list: Commit[] = [];
      while (sha) {
        const cm: Commit = this.commits.get(sha)!;
        list.push(cm);
        sha = cm.parents[0];
      }
      return this.paginate(list.map((cm) => this.commitJson(cm)), c);
    }
    if ((m = p.match(/^\/commits\/(.+)$/)) && method === "GET") {
      const sha = this.resolveRef(m[1]);
      if (!sha) throw new HttpError(404, "No commit found for SHA");
      return { status: 200, body: this.commitJson(this.commits.get(sha)!) };
    }
    if ((m = p.match(/^\/compare\/(.+?)\.\.\.(.+)$/)) && method === "GET") {
      const base = this.resolveRef(m[1]);
      const head = this.resolveRef(m[2]);
      if (!base || !head) throw new HttpError(404, "Not Found");
      const mb = this.mergeBase(base, head)!;
      return { status: 200, body: { base_commit: { sha: base }, merge_base_commit: { sha: mb }, files: this.diff(this.treeOfCommit(mb), this.treeOfCommit(head)) } };
    }

    // ------------------------------------------------------------ pull requests
    if (p === "/pulls" && method === "GET") {
      const state = c.query.get("state") || "open";
      const base = c.query.get("base");
      let items = this.pulls.filter((x) => (state === "all" || x.state === state) && (!base || x.baseRef === base));
      items = [...items].sort((a, b) => b.number - a.number);
      return this.paginate(items.map((x) => this.pullJson(x)), c);
    }
    if (p === "/pulls" && method === "POST") {
      this.requirePush(c);
      const b = c.body || {};
      const head = String(b.head || "").replace(/^[^:]+:/, "");
      if (!this.refs.has(`heads/${head}`)) throw new HttpError(422, "Validation Failed: head invalid");
      if (!this.refs.has(`heads/${b.base}`)) throw new HttpError(422, "Validation Failed: base invalid");
      if (this.pulls.some((x) => x.state === "open" && x.headRef === head && x.headRepo === FULL_NAME)) {
        throw new HttpError(422, "A pull request already exists");
      }
      const pr = this.openPull({ author: c.user!, head, title: b.title, body: b.body, base: b.base });
      return { status: 201, body: this.pullJson(pr) };
    }
    if ((m = p.match(/^\/pulls\/(\d+)(?:\/(files|commits|reviews|merge))?$/))) {
      const pr = this.pulls.find((x) => x.number === Number(m![1]));
      if (!pr) throw new HttpError(404, "Not Found");
      const sub = m[2];
      if (!sub && method === "GET") return { status: 200, body: this.pullJson(pr) };
      if (!sub && method === "PATCH") {
        const user = this.requireUser(c);
        if (user !== pr.user) this.requirePush(c);
        const b = c.body || {};
        if (b.state === "closed" && pr.state === "open") {
          pr.frozenHeadSha = this.pullHead(pr);
          pr.state = "closed";
        }
        if (typeof b.title === "string") pr.title = b.title;
        return { status: 200, body: this.pullJson(pr) };
      }
      const head = this.pullHead(pr);
      const baseTip = this.tip(pr.baseRef);
      if (sub === "files" && method === "GET") {
        const mb = this.mergeBase(baseTip, head)!;
        const files = this.diff(this.treeOfCommit(mb), this.treeOfCommit(head));
        return this.paginate(files, c);
      }
      if (sub === "commits" && method === "GET") {
        const mb = this.mergeBase(baseTip, head)!;
        const exclude = this.ancestors(mb);
        const list = [...this.ancestors(head)].filter((s) => !exclude.has(s)).map((s) => this.commits.get(s)!);
        list.sort((a, b) => Date.parse(a.committer.date) - Date.parse(b.committer.date));
        return this.paginate(list.map((cm) => this.commitJson(cm)), c);
      }
      if (sub === "reviews" && method === "GET") return this.paginate(this.reviews.get(pr.number) || [], c);
      if (sub === "reviews" && method === "POST") {
        const user = this.requireUser(c);
        const b = c.body || {};
        const event = String(b.event || "");
        if ((event === "APPROVE" || event === "REQUEST_CHANGES") && user === pr.user) {
          throw new HttpError(422, `Can not ${event === "APPROVE" ? "approve" : "request changes on"} your own pull request`);
        }
        const state = event === "APPROVE" ? "APPROVED" : event === "REQUEST_CHANGES" ? "CHANGES_REQUESTED" : "COMMENTED";
        const commit = String(b.commit_id || head);
        if (!this.commits.has(commit)) throw new HttpError(422, "commit_id is not part of the pull request");
        const rv: Review = { id: this.nextId++, user: { login: user }, state, commit_id: commit, body: String(b.body || ""), submitted_at: this.now() };
        this.reviews.set(pr.number, [...(this.reviews.get(pr.number) || []), rv]);
        return { status: 200, body: rv };
      }
      if (sub === "merge" && method === "PUT") {
        this.requirePush(c);
        const b = c.body || {};
        if (pr.state !== "open") throw new HttpError(405, "Pull Request is not mergeable");
        if (b.sha && b.sha !== head) throw new HttpError(409, "Head branch was modified. Review and try the merge again.");
        const mb = this.mergeBase(baseTip, head)!;
        const baseTree = this.treeOfCommit(mb);
        const headTree = this.treeOfCommit(head);
        const target = this.treeOfCommit(baseTip);
        for (const f of this.diff(baseTree, headTree)) {
          const paths = f.status === "renamed" ? [f.previous_filename!, f.filename] : [f.filename];
          for (const path of paths) {
            const onMain = target.get(path);
            if (onMain !== baseTree.get(path) && onMain !== headTree.get(path)) throw new HttpError(405, "Merge conflict");
            if (headTree.has(path)) target.set(path, headTree.get(path)!);
            else target.delete(path);
          }
        }
        const title = String(b.commit_title || pr.title);
        const msg = b.commit_message ? `${title}\n\n${b.commit_message}` : title;
        const sha = this.makeCommit({
          tree: this.makeTree(target),
          parents: [baseTip],
          message: msg,
          authorLogin: pr.user,
          author: { name: pr.user, email: `${pr.user}@users.noreply.github.com` },
          committer: { name: "GitHub", email: "noreply@github.com" },
        });
        this.refs.set(`heads/${pr.baseRef}`, sha);
        pr.frozenHeadSha = head;
        pr.state = "closed";
        pr.merged = true;
        pr.merge_commit_sha = sha;
        return { status: 200, body: { sha, merged: true, message: "Pull Request successfully merged" } };
      }
    }

    // ------------------------------------------------------------ issues
    if (p === "/issues" && method === "GET") {
      const state = c.query.get("state") || "open";
      const creator = c.query.get("creator");
      const labels = c.query.get("labels")?.split(",");
      const all: { n: number; created: string; json: unknown }[] = [];
      for (const i of this.issues) {
        if (state !== "all" && i.state !== state) continue;
        if (creator && i.user.toLowerCase() !== creator.toLowerCase()) continue;
        if (labels && !labels.every((l) => i.labels.includes(l))) continue;
        all.push({ n: i.number, created: i.created_at, json: this.issueJson(i) });
      }
      for (const pr of this.pulls) {
        if (state !== "all" && pr.state !== state) continue;
        if (creator && pr.user.toLowerCase() !== creator.toLowerCase()) continue;
        if (labels) continue;
        all.push({ n: pr.number, created: pr.created_at, json: { ...this.pullAsIssue(pr) } });
      }
      all.sort((a, b) => b.n - a.n);
      return this.paginate(all.map((x) => x.json), c);
    }
    if (p === "/issues" && method === "POST") {
      const user = this.requireUser(c);
      const b = c.body || {};
      const issue: Issue = {
        number: this.nextNumber++,
        title: String(b.title || ""),
        body: String(b.body || ""),
        state: "open",
        state_reason: null,
        user,
        // GitHub silently drops labels from users without push access
        labels: this.canPush(user) ? [...(b.labels || [])] : [],
        created_at: this.now(),
        closed_by: null,
      };
      this.issues.push(issue);
      return { status: 201, body: this.issueJson(issue) };
    }
    if ((m = p.match(/^\/issues\/(\d+)(?:\/(comments|labels))?$/))) {
      const n = Number(m[1]);
      const sub = m[2];
      const issue = this.issues.find((x) => x.number === n);
      const pr = this.pulls.find((x) => x.number === n);
      if (!issue && !pr) throw new HttpError(404, "Not Found");
      if (!sub && method === "GET") return { status: 200, body: issue ? this.issueJson(issue) : this.pullAsIssue(pr!) };
      if (sub === "comments" && method === "GET") return this.paginate(this.comments.get(n) || [], c);
      if (sub === "comments" && method === "POST") {
        const user = this.requireUser(c);
        const cm: Comment = { id: this.nextId++, user: { login: user }, body: String(c.body?.body || ""), created_at: this.now() };
        this.comments.set(n, [...(this.comments.get(n) || []), cm]);
        return { status: 201, body: cm };
      }
      if (sub === "labels" && method === "POST") {
        this.requirePush(c);
        if (issue) issue.labels = [...new Set([...issue.labels, ...(c.body?.labels || [])])];
        return { status: 200, body: (issue?.labels || []).map((name) => ({ name })) };
      }
      if (!sub && method === "PATCH") {
        const user = this.requireUser(c);
        if (!issue) throw new HttpError(422, "fake: editing PRs through the issues API is not modelled");
        if (user !== issue.user && !this.canPush(user)) throw new HttpError(403, "Forbidden");
        const b = c.body || {};
        if (b.state === "closed" && issue.state === "open") {
          issue.state = "closed";
          issue.closed_by = user;
          issue.state_reason = b.state_reason || "completed";
        }
        if (b.state === "open") issue.state = "open";
        if (typeof b.title === "string") issue.title = b.title;
        if (typeof b.body === "string") issue.body = b.body;
        return { status: 200, body: this.issueJson(issue) };
      }
    }

    // ------------------------------------------------------------ collaborators
    if (p === "/collaborators" && method === "GET") {
      return this.paginate([...this.collaborators].map((l) => this.userJson(l)), c);
    }
    if (p === "/invitations" && method === "GET") {
      return this.paginate([...this.invitations].map((l) => ({ invitee: this.userJson(l) })), c);
    }
    if ((m = p.match(/^\/collaborators\/([^/]+)$/))) {
      this.requirePush(c); // NOTE: real GitHub requires admin here; modelled permissively on purpose
      const login = m[1];
      if (method === "PUT") {
        if (login === OWNER) throw new HttpError(422, "Repository owner cannot be added as a collaborator");
        if (this.collaborators.has(login)) return { status: 204 };
        this.invitations.add(login);
        return { status: 201, body: { id: this.nextId++, invitee: this.userJson(login) } };
      }
      if (method === "DELETE") {
        this.collaborators.delete(login);
        this.invitations.delete(login);
        return { status: 204 };
      }
    }
    return null;
  }

  private pullAsIssue(pr: Pull) {
    return {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      state_reason: null,
      created_at: pr.created_at,
      user: this.userJson(pr.user),
      labels: [],
      closed_by: null,
      pull_request: { url: `https://api.github.com/repos/${FULL_NAME}/pulls/${pr.number}` },
    };
  }
}
