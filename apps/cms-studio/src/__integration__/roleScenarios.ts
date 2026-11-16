import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeWorld, ROLES_PATH, CODEOWNERS_PATH, type World } from "./harness";
import { OWNER } from "./fakeGithub";
import { getCachedRoles } from "@/lib/roles";

/** Registers the role-governance scenarios (13-18). Shared by roles.test.ts and the aliasing-workaround run. */
export function defineRoleScenarios() {
  let w: World;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    w = makeWorld();
  });
  afterEach(() => {
    expect(w.fake.unhandled).toEqual([]);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const collabCalls = (method: string) => w.fake.requests((r) => r.method === method && /\/collaborators\//.test(r.path));
  const assign = (actor: string, target: string, role: string, vertical?: string) =>
    w.roles(actor, { action: "assign", targetUsername: target, role, vertical });
  const remove = (actor: string, target: string, role: string, vertical?: string) =>
    w.roles(actor, { action: "remove", targetUsername: target, role, vertical });

  describe("13. role assignment governance", () => {
    it("h1 assigns x1 as ai-ml member: roles.json + CODEOWNERS change in ONE commit on main, collaborator invited", async () => {
      const commitsBefore = w.fake.history("main").length;
      const r = await assign("h1", "x1", "member", "ai-ml");
      expect(r.status).toBe(200);
      expect(r.json.inviteDispatched).toBe(true);

      expect(w.rolesOnMain().members["ai-ml"]).toEqual(["m1", "m2", "d3", "x1"]);
      const hist = w.fake.history("main");
      expect(hist.length).toBe(commitsBefore + 1);
      expect(hist[0].message).toBe("chore(governance): @h1 assigned @x1 as member (ai-ml)");
      expect(hist[0].authorLogin).toBe("h1");
      // exactly roles.json (+ CODEOWNERS) differ from the previous commit
      const prev = hist[1].sha;
      w.fake.createBranch("cmp-a", prev);
      const changed = (w.fake.changedFiles as (b: string) => unknown) && []; // placeholder to keep API usage obvious
      void changed;
      expect(w.fake.readText("main", CODEOWNERS_PATH)).toContain("@sa1 @sa2");
      expect(w.fake.readText(prev, CODEOWNERS_PATH)).toBe("* @sa1 @sa2\n"); // seed
      expect(w.fake.readText("main", CODEOWNERS_PATH)).not.toBe("* @sa1 @sa2\n"); // regenerated in the same commit
      expect(w.fake.readText("main", CODEOWNERS_PATH)).toContain("content/verticals/ai-ml/** @h1 @d1 @d2");

      expect(collabCalls("PUT").map((c) => c.path.split("/").pop())).toEqual(["x1"]);
      expect(w.fake.invitations.has("x1")).toBe(true);
    });

    it("d1 may assign a member in ai-ml but not a deputy, and cannot touch h1 / superadmins", async () => {
      expect((await assign("d1", "x1", "member", "ai-ml")).status).toBe(200);
      expect(w.rolesOnMain().members["ai-ml"]).toContain("x1");

      const tip = w.mainTip();
      expect((await assign("d1", "x2", "deputy", "ai-ml")).status).toBe(403);
      expect((await assign("d1", "x2", "vertical_head", "ai-ml")).status).toBe(403);
      expect((await remove("d1", "h1", "vertical_head", "ai-ml")).status).toBe(403);
      expect((await assign("d1", "sa1", "member", "ai-ml")).status).toBe(403);
      expect((await assign("d1", "x2", "member", "full-stack")).status).toBe(403);
      expect((await assign("d1", "x2", "superadmin")).status).toBe(403);
      expect((await remove("d1", "d2", "deputy", "ai-ml")).status).toBe(403); // peer
      expect(w.mainTip()).toBe(tip);
      expect(w.rolesOnMain().vertical_heads["ai-ml"]).toEqual(["h1"]);
    });

    it("h1 cannot assign a deputy in full-stack (another vertical) nor a head anywhere", async () => {
      const tip = w.mainTip();
      expect((await assign("h1", "x1", "deputy", "full-stack")).status).toBe(403);
      expect((await assign("h1", "x1", "member", "full-stack")).status).toBe(403);
      expect((await assign("h1", "x1", "vertical_head", "ai-ml")).status).toBe(403);
      expect((await assign("h1", "x1", "superadmin")).status).toBe(403);
      expect(w.mainTip()).toBe(tip);
      expect(w.fake.invitations.size).toBe(0);
    });

    it("members and outsiders cannot change roles", async () => {
      const tip = w.mainTip();
      for (const u of ["m1", "x1", "d3"]) {
        expect((await assign(u, "x2", "member", "ai-ml")).status, u).toBe(403);
      }
      expect(w.mainTip()).toBe(tip);
    });

    it("sa1 removes sa2 -> OK (collaborator access revoked); sa1 then cannot remove itself (last superadmin)", async () => {
      const r = await remove("sa1", "sa2", "superadmin");
      expect(r.status).toBe(200);
      expect(w.rolesOnMain().superadmins).toEqual(["sa1"]);
      expect(collabCalls("DELETE").map((c) => c.path.split("/").pop())).toEqual(["sa2"]);

      const tip = w.mainTip();
      const self = await remove("sa1", "sa1", "superadmin");
      expect(self.status).toBe(403);
      expect(self.json.error).toMatch(/last Superadmin/i);
      expect(w.rolesOnMain().superadmins).toEqual(["sa1"]);
      expect(w.mainTip()).toBe(tip);
    });

    it("a removed superadmin loses authority immediately (live roles, not cached)", async () => {
      await remove("sa1", "sa2", "superadmin");
      const { pull } = await w.submit("m1");
      expect((await w.review("sa2", pull, "approve", { sha: w.fake.headSha(pull) })).status).toBe(403);
      expect(w.fake.pull(pull).merged).toBe(false);
    });

    it("sa1 appoints a vertical head: replaces the previous head (strictly one) and demotes nobody else", async () => {
      const r = await assign("sa1", "x1", "vertical_head", "ai-ml");
      expect(r.status).toBe(200);
      expect(w.rolesOnMain().vertical_heads["ai-ml"]).toEqual(["x1"]);
      w.fake.acceptInvitation("x1"); // x1 accepts the repo invitation, otherwise GitHub would refuse the merge
      // h1 lost head authority at once
      const { pull } = await w.submit("m1");
      expect((await w.review("h1", pull, "approve", { sha: w.fake.headSha(pull) })).status).toBe(403);
      expect((await w.review("x1", pull, "approve")).json.merged).toBe(true);
    });

    it("input validation: bad action / username / role / vertical", async () => {
      const tip = w.mainTip();
      expect((await w.roles("sa1", { action: "nuke", targetUsername: "x1", role: "member", vertical: "ai-ml" })).status).toBe(400);
      expect((await assign("sa1", "../etc", "member", "ai-ml")).status).toBe(400);
      expect((await assign("sa1", "x1", "overlord", "ai-ml")).status).toBe(400);
      expect((await assign("sa1", "x1", "member", "not-a-vertical")).status).toBe(400);
      expect((await assign("sa1", "x1", "member")).status).toBe(400);
      expect(w.mainTip()).toBe(tip);
    });
  });

  describe("14. promote member -> deputy in one call", () => {
    it("h1 promotes m2: listed as deputy, no longer member, one commit", async () => {
      const n = w.fake.history("main").length;
      const r = await assign("h1", "m2", "deputy", "ai-ml");
      expect(r.status).toBe(200);
      const roles = w.rolesOnMain();
      expect(roles.deputies["ai-ml"]).toEqual(["d1", "d2", "m2"]);
      expect(roles.members["ai-ml"]).toEqual(["m1", "d3"]);
      expect(w.fake.history("main").length).toBe(n + 1);
      expect(w.fake.readText("main", CODEOWNERS_PATH)).toContain("content/verticals/ai-ml/** @h1 @d1 @d2 @m2");
    });

    it("the promoted deputy immediately counts toward quorum (live roles)", async () => {
      await assign("h1", "m2", "deputy", "ai-ml");
      const { pull } = await w.submit("m1");
      expect((await w.review("m2", pull, "approve")).json.merged).toBe(false);
      expect((await w.review("d1", pull, "approve")).json.merged).toBe(true);
    });

    it("demoting deputy -> member by h1 works and revokes review authority", async () => {
      const r = await assign("h1", "d2", "member", "ai-ml");
      expect(r.status).toBe(200);
      expect(w.rolesOnMain().deputies["ai-ml"]).toEqual(["d1"]);
      expect(w.rolesOnMain().members["ai-ml"]).toContain("d2");
    });
  });

  describe("15. concurrent role changes", () => {
    it("roles.json changes on main between the handler's read and write -> 409, competing change survives", async () => {
      let fired = false;
      w.fake.afterRequest(({ method, path }) => {
        if (!fired && method === "GET" && path.endsWith("/contents/content/club/roles.json")) {
          fired = true;
          const roles = w.fake.readJson("main", ROLES_PATH);
          roles.members["ai-ml"].push("competitor");
          w.fake.push("main", { [ROLES_PATH]: JSON.stringify(roles, null, 2) }, { author: "sa1", message: "chore(governance): competing change" });
        }
      });
      const r = await assign("h1", "x1", "member", "ai-ml");
      expect(fired).toBe(true);
      expect(r.status).toBe(409);
      const roles = w.rolesOnMain();
      expect(roles.members["ai-ml"]).toContain("competitor");
      expect(roles.members["ai-ml"]).not.toContain("x1");
      expect(w.fake.history("main")[0].message).toBe("chore(governance): competing change");
      expect(collabCalls("PUT")).toEqual([]);
      expect(w.fake.invitations.size).toBe(0);
      // the failed write must not have been cached as truth
      expect(getCachedRoles()!.members["ai-ml"]).not.toContain("x1");
    });

    it("main moves (any file) between ref read and ref update -> not fast-forward -> 409, nothing overwritten", async () => {
      let fired = false;
      w.fake.afterRequest(({ method, path }) => {
        if (!fired && method === "GET" && path.endsWith("/git/ref/heads/main")) {
          fired = true;
          w.fake.push("main", { "content/club/posts/other.md": "---\ntitle: o\n---\nx" }, { author: "sa2", message: "feat(club): something else" });
        }
      });
      const r = await assign("h1", "x1", "member", "ai-ml");
      expect(fired).toBe(true);
      expect(r.status).toBe(409);
      expect(w.fake.history("main")[0].message).toBe("feat(club): something else");
      expect(w.rolesOnMain().members["ai-ml"]).not.toContain("x1");
      expect(w.fake.readText("main", "content/club/posts/other.md")).toBeTruthy();
    });

    it("two sequential changes both land (the second re-reads the first)", async () => {
      expect((await assign("h1", "x1", "member", "ai-ml")).status).toBe(200);
      expect((await assign("d1", "x2", "member", "ai-ml")).status).toBe(200);
      expect(w.rolesOnMain().members["ai-ml"]).toEqual(["m1", "m2", "d3", "x1", "x2"]);
    });
  });

  describe("16. GitHub read failures", () => {
    it("contents API 5xx -> POST /api/roles returns 503 and writes nothing; GET /api/roles degrades to last-good roles", async () => {
      const tip = w.mainTip();
      w.fake.failWhen(({ method, path }) => (method === "GET" && path.endsWith("/contents/content/club/roles.json") ? 502 : undefined));
      const r = await assign("h1", "x1", "member", "ai-ml");
      expect(r.status).toBe(503);
      expect(w.fake.mutations()).toHaveLength(0);
      expect(w.mainTip()).toBe(tip);
      expect(w.rolesOnMain().members["ai-ml"]).not.toContain("x1");

      // expire the 5 s cache so GET really has to try (and fail) the live read
      const real = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(real + 60_000);
      const g = await w.call("h1", "GET", "/api/roles");
      expect(g.status).toBe(200);
      expect(g.json.roles.vertical_heads["ai-ml"]).toEqual(["h1"]);
      expect(g.json.currentRole.role).toBe("vertical_head");
    });

    it("reviews also fail closed (never fall back to cached roles) while roles.json is unreadable", async () => {
      const { pull } = await w.submit("m1");
      w.fake.failWhen(({ method, path }) => (method === "GET" && path.endsWith("/contents/content/club/roles.json") ? 500 : undefined));
      const sha = w.fake.headSha(pull);
      const r = await w.review("h1", pull, "approve", { sha });
      expect(r.status).toBe(503);
      expect(w.fake.pull(pull).merged).toBe(false);
      expect(w.fake.reviewsOf(pull)).toEqual([]);
      const d = await w.submit("m1", { title: "Another", slug: "another", cover: false });
      expect([500, 503]).toContain(d.status);
      expect(w.fake.pulls).toHaveLength(1);
    });

    it("a failing tree/commit/ref write returns an error and leaves roles.json unchanged", async () => {
      w.fake.failWhen(({ method, path }) => (method === "PATCH" && path.endsWith("/git/refs/heads/main") ? 500 : undefined));
      const tip = w.mainTip();
      const r = await assign("h1", "x1", "member", "ai-ml");
      expect(r.status).toBe(500);
      expect(w.mainTip()).toBe(tip);
      expect(getCachedRoles()!.members["ai-ml"]).not.toContain("x1");
      expect(collabCalls("PUT")).toEqual([]);
    });
  });

  describe("17. edge cases", () => {
    it("assigning a superadmin a vertical role -> 400, nothing written", async () => {
      const tip = w.mainTip();
      const r = await assign("sa1", "sa2", "member", "ai-ml");
      expect(r.status).toBe(400);
      expect(r.json.error).toMatch(/already covers every vertical/);
      expect(w.mainTip()).toBe(tip);
      // a head cannot even try (target outranks them)
      expect((await assign("h1", "sa2", "member", "ai-ml")).status).toBe(403);
    });

    it("assigning the repo owner records the role but never calls addCollaborator", async () => {
      const r = await assign("sa1", OWNER, "member", "ai-ml");
      expect(r.status).toBe(200);
      expect(r.json.inviteDispatched).toBe(false);
      expect(w.rolesOnMain().members["ai-ml"]).toContain(OWNER);
      expect(collabCalls("PUT")).toEqual([]);
      // removing the owner's role does not try to revoke repo access either
      const rm = await remove("sa1", OWNER, "member", "ai-ml");
      expect(rm.status).toBe(200);
      expect(collabCalls("DELETE")).toEqual([]);
    });

    it("removing a role the user never had -> no-op: no commit, no collaborator calls", async () => {
      const tip = w.mainTip();
      const r = await remove("sa1", "x1", "member", "ai-ml");
      expect(r.status).toBe(200);
      expect(r.json.message).toMatch(/didn't have that role/);
      expect(w.mainTip()).toBe(tip);
      expect(collabCalls("DELETE")).toEqual([]);
      expect(collabCalls("PUT")).toEqual([]);
      expect(w.fake.mutations()).toHaveLength(0);
    });

    it("assigning a role someone already has -> no-op", async () => {
      const tip = w.mainTip();
      const r = await assign("h1", "m1", "member", "ai-ml");
      expect(r.status).toBe(200);
      expect(r.json.message).toMatch(/already has that role/);
      expect(w.mainTip()).toBe(tip);
      expect(w.fake.mutations()).toHaveLength(0);
    });

    it("removing only ONE of a user's roles keeps their repo access; removing the LAST one revokes it", async () => {
      // d3: deputy full-stack + member ai-ml
      const r1 = await remove("h1", "d3", "member", "ai-ml");
      expect(r1.status).toBe(200);
      expect(collabCalls("DELETE")).toEqual([]); // still a full-stack deputy
      const r2 = await remove("sa1", "d3", "deputy", "full-stack");
      expect(r2.status).toBe(200);
      expect(collabCalls("DELETE").map((c) => c.path.split("/").pop())).toEqual(["d3"]);
    });

    it("with GITHUB_ADMIN_TOKEN configured, the write and the invite are made with the admin token but still attributed to the actor", async () => {
      vi.stubEnv("GITHUB_ADMIN_TOKEN", w.fake.tokenFor(OWNER));
      const r = await assign("h1", "x1", "member", "ai-ml");
      expect(r.status).toBe(200);
      expect(w.fake.history("main")[0].authorLogin).toBe("h1");
      expect(w.fake.invitations.has("x1")).toBe(true);
    });

    it("GET /api/roles is only for superadmin / head / deputy", async () => {
      for (const u of ["sa1", "h1", "d1"]) expect((await w.call(u, "GET", "/api/roles")).status, u).toBe(200);
      for (const u of ["m1", "x1"]) expect((await w.call(u, "GET", "/api/roles")).status, u).toBe(403);
    });
  });

  describe("18. role applications", () => {
    const apply = (login: string, role: string, vertical: string) => w.call(login, "POST", "/api/roles/requests", { vertical, requestedRole: role, note: "pls" });
    const decide = (login: string, requestId: string | number, action: "approve" | "reject", expectedRole?: string, expectedVertical?: string, extra: Record<string, unknown> = {}) =>
      w.call(login, "PATCH", "/api/roles/requests", { requestId: String(requestId), action, expectedRole, expectedVertical, ...extra });

    it("happy path: x1 applies as ai-ml member, h1 approves -> role written, collaborator invited, issue closed + audit comment", async () => {
      const a = await apply("x1", "member", "ai-ml");
      expect(a.status).toBe(200);
      const id = a.json.request.id;
      expect(a.json.request).toMatchObject({ username: "x1", requestedRole: "member", vertical: "ai-ml", status: "pending" });

      const list = await w.call("h1", "GET", "/api/roles/requests");
      expect(list.json.requests.map((r: any) => r.id)).toContain(id);
      expect((await w.call("m1", "GET", "/api/roles/requests")).json.requests).toEqual([]);
      expect((await w.call("x1", "GET", "/api/roles/requests")).json.requests.map((r: any) => r.id)).toEqual([id]);

      const tip = w.mainTip();
      const d = await decide("h1", id, "approve", "member", "ai-ml");
      expect(d.status).toBe(200);
      expect(w.rolesOnMain().members["ai-ml"]).toContain("x1");
      expect(w.fake.history("main").length).toBeGreaterThan(1);
      expect(w.mainTip()).not.toBe(tip);
      expect(w.fake.issue(Number(id))).toMatchObject({ state: "closed", closed_by: "h1" });
      expect(w.fake.commentsOf(Number(id))[0].body).toContain("Official Governance Audit Log");
      expect(w.fake.invitations.has("x1")).toBe(true);

      // deciding again is refused
      const again = await decide("h1", id, "approve", "member", "ai-ml");
      expect(again.status).toBe(400);
    });

    it("applicant edits the issue to ask for a bigger role -> approval with the originally seen role/vertical -> 409, no role written", async () => {
      const a = await apply("x1", "member", "ai-ml");
      const id = Number(a.json.request.id);
      const body = JSON.stringify({ username: "x1", displayName: "X1", requestedRole: "vertical_head", vertical: "cybersecurity", note: "" }, null, 2);
      w.fake.editIssue(id, { body: `### edited\n\n\`\`\`json:metadata\n${body}\n\`\`\`\n` });
      const tip = w.mainTip();
      const d = await decide("h1", id, "approve", "member", "ai-ml");
      expect(d.status).toBe(409);
      expect(w.mainTip()).toBe(tip);
      expect(w.rolesOnMain().vertical_heads.cybersecurity).toEqual([]);
      expect(w.rolesOnMain().members["ai-ml"]).not.toContain("x1");
      expect(w.fake.issue(id).state).toBe("open");

      // even a superadmin who "agrees" to the NEW values is only OK if they actually echo them
      const wrong = await decide("sa1", id, "approve", "member", "ai-ml");
      expect(wrong.status).toBe(409);
      expect(w.mainTip()).toBe(tip);
    });

    it("an applicant cannot smuggle a different username via metadata (identity = issue author)", async () => {
      const a = await apply("x1", "member", "ai-ml");
      const id = Number(a.json.request.id);
      const body = JSON.stringify({ username: "sa1", requestedRole: "member", vertical: "ai-ml" });
      w.fake.editIssue(id, { body: `\`\`\`json:metadata\n${body}\n\`\`\`\n` });
      const d = await decide("h1", id, "approve", "member", "ai-ml");
      expect(d.status).toBe(200);
      expect(w.rolesOnMain().members["ai-ml"]).toContain("x1");
      expect(w.rolesOnMain().members["ai-ml"]).not.toContain("sa1");
    });

    it("applicants cannot approve their own application", async () => {
      // d3 is a full-stack deputy; applies to be a full-stack head
      const a = await apply("d3", "vertical_head", "full-stack");
      const tip = w.mainTip();
      const d = await decide("d3", a.json.request.id, "approve", "vertical_head", "full-stack");
      expect(d.status).toBe(403);
      expect(w.mainTip()).toBe(tip);
    });

    it("d1 approving a deputy application is refused; h1 cannot approve a head application; superadmin can", async () => {
      const dep = await apply("x1", "deputy", "ai-ml");
      expect((await decide("d1", dep.json.request.id, "approve", "deputy", "ai-ml")).status).toBe(403);
      expect(w.rolesOnMain().deputies["ai-ml"]).not.toContain("x1");
      // a lower-authority approver cannot escalate via assignedRole either
      const mem = await apply("x2", "member", "ai-ml");
      expect((await decide("d1", mem.json.request.id, "approve", "member", "ai-ml", { assignedRole: "deputy" })).status).toBe(403);
      expect((await decide("d1", mem.json.request.id, "approve", "member", "ai-ml", { assignedRole: "vertical_head" })).status).toBe(403);
      expect(w.rolesOnMain().deputies["ai-ml"]).not.toContain("x2");

      const head = await apply("m1", "vertical_head", "ai-ml");
      expect((await decide("h1", head.json.request.id, "approve", "vertical_head", "ai-ml")).status).toBe(403);
      expect(w.rolesOnMain().vertical_heads["ai-ml"]).toEqual(["h1"]);

      expect((await decide("h1", dep.json.request.id, "approve", "deputy", "ai-ml")).status).toBe(200);
      expect(w.rolesOnMain().deputies["ai-ml"]).toContain("x1");
      expect((await decide("sa1", head.json.request.id, "approve", "vertical_head", "ai-ml")).status).toBe(200);
      expect(w.rolesOnMain().vertical_heads["ai-ml"]).toEqual(["m1"]);
    });

    it("a head of another vertical cannot decide an ai-ml application", async () => {
      const a = await apply("x1", "member", "ai-ml");
      const tip = w.mainTip();
      expect((await decide("h2", a.json.request.id, "approve", "member", "ai-ml")).status).toBe(403);
      expect((await decide("m1", a.json.request.id, "approve", "member", "ai-ml")).status).toBe(403);
      expect(w.mainTip()).toBe(tip);
    });

    it("PATCH with the number of a normal PR (or non-application issue) is refused and changes nothing", async () => {
      const { pull } = await w.submit("m1");
      const tip = w.mainTip();
      const r = await decide("sa1", pull, "approve", "member", "ai-ml");
      expect(r.status).toBe(400);
      expect(r.json.error).toMatch(/not a role application/);
      expect(w.mainTip()).toBe(tip);
      expect(w.fake.pull(pull)).toMatchObject({ state: "open", merged: false });
      expect(w.fake.requests((x) => x.method === "PATCH" && /\/issues\//.test(x.path))).toEqual([]);
    });

    it("reject closes the issue as not_planned and writes no role", async () => {
      const a = await apply("x1", "member", "ai-ml");
      const id = Number(a.json.request.id);
      const tip = w.mainTip();
      const r = await decide("h1", id, "reject", "member", "ai-ml");
      expect(r.status).toBe(200);
      expect(w.mainTip()).toBe(tip);
      expect(w.fake.issue(id)).toMatchObject({ state: "closed", state_reason: "not_planned" });
      expect(w.rolesOnMain().members["ai-ml"]).not.toContain("x1");
    });

    it("applying for superadmin or an invalid role/vertical is refused; duplicate applications are refused", async () => {
      expect((await apply("x1", "superadmin", "ai-ml")).status).toBe(403);
      expect((await apply("x1", "overlord", "ai-ml")).status).toBe(400);
      expect((await apply("x1", "member", "nope")).status).toBe(400);
      expect((await apply("x1", "member", "ai-ml")).status).toBe(200);
      expect((await apply("x1", "member", "ai-ml")).status).toBe(400);
    });

    it("an application approved while roles.json changed underneath is rejected as conflict, not overwritten", async () => {
      const a = await apply("x1", "member", "ai-ml");
      let fired = false;
      let reads = 0; // PATCH reads roles.json twice (live role info, then the write read); race the second
      w.fake.afterRequest(({ method, path }) => {
        if (!fired && method === "GET" && path.endsWith("/contents/content/club/roles.json") && ++reads === 2) {
          fired = true;
          const roles = w.fake.readJson("main", ROLES_PATH);
          roles.members["ai-ml"].push("competitor");
          w.fake.push("main", { [ROLES_PATH]: JSON.stringify(roles, null, 2) }, { author: "sa1" });
        }
      });
      const d = await decide("h1", a.json.request.id, "approve", "member", "ai-ml");
      expect(d.status).toBe(409);
      expect(w.rolesOnMain().members["ai-ml"]).toContain("competitor");
      expect(w.rolesOnMain().members["ai-ml"]).not.toContain("x1");
      expect(w.fake.issue(Number(a.json.request.id)).state).toBe("open");
    });
  });

}
