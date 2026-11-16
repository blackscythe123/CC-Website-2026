# Design: YouTube Embeds, Learning Tracks and Comments

Status: **v3.1.** Phase 1 (v2.1) is shipped (PR #31). Phases 2–4 redesigned on 2026-11-16 after the owner's clarification, then revised after an EGM review (design, readiness, codebase accuracy, scope) and two owner decisions: blogs join a tree only through their own placement, and placement follows the normal blog quorum.
Date: 2026-11-16
Request (club leads): "add an option to embed YT videos/playlists into a blog, and a way to organise blogs according to topic and subtopic (NeetCode was only an example of the shape) so CP and other verticals can create DSA courses or internship guidance; let the CMS manage it."

Owner decisions already made:
- Build in phases, with a simple CMS form, not a full tree editor.
- Name: **Tracks**, which appears in URLs and menus.
- (v3) A vertical can have **several** tracks (topic trees). **Only the Head** (or a Superadmin) creates and organises a track's topics and subtopics.
- (v3) **Any blog author** in a vertical can place their blog **directly under a topic or under a subtopic** of one of that vertical's tracks, or leave it as a normal blog. Placement is chosen in the blog editor and reviewed with the blog under the normal blog quorum (v3.1). Blogs join a tree **only** this way; the track file holds topics, subtopics, links and videos.
- (v3) Topics, subtopics, links and videos can carry a written **description**.
- (v3) **Any reader can comment** on any blog, track, topic or subtopic after signing in with GitHub. Readers get no CMS access. Comments are stored in **this repo's GitHub Discussions** (one repo, a dedicated category), via giscus.

## 0. What changed from v1 (and why)

| v1 | v2 | Review finding |
|---|---|---|
| Swap `<p>`-with-a-link in the rendered HTML | Line-based, fence-aware **markdown pre-pass with tokens**; the HTML step only swaps tokens | Brittle HTML regex; `marked` vs `remark` parity |
| Migrate all 11 renderers to one new pipeline, which changes the sanitizer on the vertical portals | Add the embed pre/post step around each app's **existing** pipeline; sanitizers unchanged | Hidden behaviour change and blast radius |
| Shorts, start times, many URL forms | Video, playlist, video-in-playlist only | YAGNI |
| Progress keyed by URL or slug | Explicit short **item `id`** | Stable keys, renames, duplicates |
| Track pages on main portal and every vertical | Vertical portals only; main portal **links out** | Duplicate pages; progress is per-origin anyway |
| `/api/tracks` and review integration described loosely | Full contract: PR kind classifier, merge-time re-validation, dangling-reference policy | Readiness blockers B1–B6 |

## 1. Phase 1: YouTube embeds

### 1.1 Authoring
- A YouTube URL **alone on its own line, with a blank line before and after, outside code fences**, becomes an embedded player. A URL inside a sentence, a list, a quote or a `[text](url)` link stays a normal link.
- The CMS editor gets an **Embed video** toolbar button. It asks for a URL, validates it with the same parser, and inserts it as its own paragraph (adding blank lines as needed). An invalid URL shows "That isn't a YouTube video or playlist link."

### 1.2 Accepted URLs
- **Hosts:** `youtube.com`, `www.youtube.com`, `m.youtube.com` and `youtu.be`, over https only. Hosts are matched exactly, lower-cased.
- **Forms:**

| Form | Result | Embed src |
|---|---|---|
| `/watch?v=ID` | video | `https://www.youtube-nocookie.com/embed/ID` |
| `youtu.be/ID` | video | same |
| `/playlist?list=LIST` | playlist | `https://www.youtube-nocookie.com/embed/videoseries?list=LIST` |
| `/watch?v=ID&list=LIST` | video in playlist | `https://www.youtube-nocookie.com/embed/ID?list=LIST` |

- **ID rules:** `ID` must match `^[A-Za-z0-9_-]{11}$` and `LIST` must match `^[A-Za-z0-9_-]{10,64}$`. Other query parameters are ignored. Anything else stays a normal link.

### 1.3 Rendering (identical in every app)
New source-only workspace package **`@coding-club/content-render`** (`packages/content-render`), wired like `content-schema`:
- `package.json`: `"main": "./src/index.ts"`, `"types": "./src/index.ts"`, ESM, no runtime dependencies.
- Pure functions, with no Node or DOM APIs, so the same code runs in the CMS browser preview.

It exports:
- `parseYouTubeUrl(url: string): { kind: "video" | "playlist"; id?: string; list?: string } | null`
- `extractEmbeds(markdown: string): { markdown: string; embeds: Embed[] }`
  - It is line-based and tracks ``` / ~~~ fences.
  - Each qualifying line is replaced by the token `CCEMBED<n>`, a single word that every markdown engine and sanitizer leaves as plain paragraph text.
- `injectEmbeds(html: string, embeds: Embed[]): string`
  - It replaces **only** an exact `<p>CCEMBED<n></p>` paragraph with the iframe HTML, built **only** from validated IDs. There is no bare-token fallback, and an unknown `CCEMBED<n>` is left untouched.
  - It runs **after** sanitizing, and its output is never sanitized again.
- `youTubeEmbedHtml(e: Embed): string`, which produces exactly:
  `<div class="cc-embed"><iframe src="SRC" title="YouTube video player" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`

Wiring, with only these lines changing in each app:
1. **`posts.ts`:** in `apps/main-portal/src/lib/posts.ts`, each `apps/*-portal/src/lib/posts.ts` and the template, the existing `remark().use(html)` (and `sanitizeHtml`) pipeline is wrapped as follows:
   - `const { markdown, embeds } = extractEmbeds(content)`
   - render `markdown` exactly as today
   - `html = injectEmbeds(html, embeds)`
2. **CMS previews:** `apps/cms-studio/src/lib/sanitize.ts` takes HTML, not markdown, so the wrap happens at the two places that call `marked` and then `sanitizeArticleHtml`. These are `apps/cms-studio/src/app/admin/page.tsx` (the editor preview) and `apps/cms-studio/src/components/reviews/ReviewPreviewDrawer.tsx` (the review preview). See §6.1.
3. **Dependency and `transpilePackages`:** `"@coding-club/content-render": "workspace:*"` goes in each consuming app's `package.json`, and the package in its `next.config.ts` `transpilePackages`. Then `pnpm install` updates the lockfile. The exact per-app list is in §6.2.
4. **CSS:** `.cc-embed{position:relative;width:100%;aspect-ratio:16/9;margin:1.5rem 0}.cc-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0}` is added to each app's global stylesheet.
   - It can't be shared via the package, because the package has no CSS pipeline.
   - The files are main-portal `globals.css`, `packages/scrapbook-ui/styles` for the vertical portals, the template's `globals.css` and cms-studio's `globals.css`.

There is no CSP in any app today (checked), so no header change is needed.

Deploy impact: changing `packages/content-render` redeploys the apps that depend on it, via `scripts/lib/affected-apps.mjs` dependency mapping. Phase 1 therefore redeploys the **10 deployable apps** once; the template is built in CI but never deployed.

### 1.4 Phase 1 tests
- **Unit (vitest, in the package):**
  - every URL form;
  - wrong host, `http:`, `javascript:`, bad ID lengths;
  - URL inside a sentence, a list, a quote and a code fence (never embedded);
  - two URLs on consecutive lines (neither is embedded, because they aren't separate paragraphs);
  - an author-written `<iframe>` is still stripped;
  - **parity:** the same fixture through `remark` and `marked` gives the same embeds.
- **Build:** `pnpm run ci`.
- **Browser:**
  - a CMS preview shows the player;
  - a built portal article shows the player and plays.
  - Real Chromium is required, and Obscura is not enough, because its renderer is not faithful.

## 2. Phase 2: Tracks on the portals (v3.1)

### 2.1 Concepts
- **Track:** a named topic tree in one vertical, e.g. CP's "DSA Sheet" and "Internship Prep". A vertical can have several.
- **Topic → Subtopic:** two levels, no deeper.
- **What sits in a topic or subtopic:**
  1. **Resources** stored in the track file by the Head: `link` items (e.g. a LeetCode problem) and `video` items (YouTube), each with an optional description.
  2. **Blogs** that chose that topic/subtopic in their own frontmatter (`placement`). **This is the only way a blog joins a tree** (owner decision, v3.1). To add an existing blog, its author or an editor edits the blog and picks a topic; it goes through normal review.
- A placed blog is **still a normal blog**: same URL, still in the blog list. Its row in the tree shows its title and its existing `summary` as the description.

### 2.2 Track file
**Path:** `content/verticals/<vertical>/tracks/<track-slug>.json`. No club-level tracks.

```json
{
  "title": "DSA Sheet",
  "summary": "Core patterns with walkthroughs and practice problems.",
  "vertical": "competitive-programming",
  "topics": [
    {
      "id": "arrays",
      "title": "Arrays & Hashing",
      "description": "Start here. Most interview problems reduce to these patterns.",
      "items": [
        { "id": "a2", "type": "link", "title": "Two Sum", "url": "https://leetcode.com/problems/two-sum/", "difficulty": "easy", "description": "Classic hash-map warm-up." }
      ],
      "subtopics": [
        { "id": "sliding-window", "title": "Sliding window", "items": [
          { "id": "a3", "type": "video", "title": "Sliding window in 10 min", "url": "https://youtu.be/AAAAAAAAAAA", "description": "Watch before the problems below." }
        ] }
      ]
    }
  ]
}
```

| Field | Rule |
|---|---|
| `title` | 1–120 chars |
| `summary` | 0–300 chars |
| `vertical` | must equal the folder |
| `topics` | 1–30 |
| topic | `id`, `title` 1–120, optional `description` ≤ 1000, `items` 0–100 (optional), `subtopics` 0–30 (optional) |
| subtopic | `id`, `title` 1–120, optional `description` ≤ 1000, `items` 0–100 (optional) |
| topic / subtopic `id` | `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`, ≤ 40 chars, **unique across the whole track** (topics and subtopics share one namespace). Starts with a letter so an id like `2024` can never be read by YAML as a number. |
| item `id` | `^[a-z0-9]{1,12}$`, unique within the track |
| `link` item | `title` 1–120; `url` https only, no user:pass, ≤ 500; optional `difficulty` easy/medium/hard; optional `description` ≤ 500 |
| `video` item | `title` 1–120; `url` passes the YouTube parser; optional `description` ≤ 500 |
| totals | ≤ 500 resource items per track (placed blogs are not capped); file ≤ 200 KB |
| unknown keys | rejected (strict) everywhere |

- Topics and subtopics may be empty in the file, because blogs can fill them.
- **Descriptions are plain text**, rendered as React text with `white-space: pre-line`. Never markdown or HTML.
- **Ids are permanent by convention.** Placements, progress and comment threads point at them; renaming changes only `title`. This is not enforced by CI (a base-vs-head diff is out of scope). The Phase 3 editor generates ids once, as `<kebab-of-title>-<4 random [a-z0-9]>`, so deleting a topic and re-creating one with the same title never reuses an id. Hand edits must follow the same rule.
- **Track slug:** kebab-case, ≤ 60, never changed after publishing.

### 2.3 Blog placement (frontmatter)
```yaml
placement:
  track: dsa-sheet          # track slug, same vertical as the blog
  topic: arrays             # topic id
  subtopic: sliding-window  # optional subtopic id (must belong to that topic)
```
- One placement per blog. Club posts can't have one.
- Strict shape: only those three keys, matching the slug/id regexes.
- **Order within a topic/subtopic:** resource items first, in file order; then placed blogs by `date` ascending (ISO `YYYY-MM-DD` string compare; a missing date sorts last), ties by slug.
- **Approval:** a placement is part of the blog and follows the normal blog quorum for the author's role (owner decision, v3.1). The Head is not specially required.

### 2.4 Shared validation (`packages/content-schema/src/tracks.mjs`)
Exports (and `tracks.d.mts` types):
- `validateTrack(json, { vertical, slug?, bytes? }) → { ok, errors: string[], track | null }`
- `parsePlacement(raw: unknown) → Placement | null` — null for anything that isn't exactly the strict shape.
- `placementErrors(placement, { vertical, tracks }) → string[]` — `tracks` is `Record<trackSlug, Track>`; checks the track, topic and subtopic exist and the subtopic belongs to the topic.
- `trackItems(track)`, `placementLabel(placement, track) → "DSA Sheet › Arrays & Hashing › Sliding window"`.

### 2.5 CI (`scripts/validate-content.mjs`)
- Load and validate every `tracks/*.json` **before** the post loop (unknown files in `tracks/` already fail).
- Post frontmatter gets an optional `placement`; if present and `parsePlacement` returns null → **error**; on a club post → **error**.
- A placed post whose `targetPortals` doesn't include its own vertical portal → **error** (it would be invisible in the tree).
- A placement whose track/topic/subtopic doesn't exist → **warning only** (printed, CI stays green). Reason: a Head must be able to remove a topic even if blogs point at it; those blogs simply drop out of the tree until moved. Readers ignore dangling placements, so nothing breaks.

### 2.6 Merge-time check (CMS)
- Merging a **blog** PR whose file has a placement re-checks it against the track file on **current `main`** (`ref: main`, not the PR's recorded base sha): one `getContent` of `tracks/<track>.json`. A dangling placement is refused (409): `This blog is placed under "<track> › <topic>", which doesn't exist on main any more. Edit the blog and pick another place (or none).`
- Track merges (Phase 3b) don't check placements; they may orphan blogs, which the editor warns about first.
- The v2 unpublish guard and `findTracksUsingPost` are **removed** — tracks no longer reference blogs.

### 2.7 CMS edits must keep the placement (Phase 2, before the picker exists)
`createDraftAndPullRequest` rebuilds frontmatter from fixed fields. It must carry `placement` over from the existing file on edit and revision, exactly as it carries the author fields, so a blog placed by hand isn't silently un-placed when someone edits it in the CMS. The Phase 3a picker then makes it editable.

### 2.8 Reader pages (8 vertical portals + template)
- Routes `/tracks` and `/tracks/[slug]` (static, `dynamicParams = false`, unknown → 404). Invalid track files are skipped with a build warning (CI already blocks them on `main`).
- Each portal's `posts.ts`: `PortalPostSummary` gains `placement: Placement | null` via `parsePlacement(data.placement)`. Main-portal: no change.
- Browser-safe helper in `@coding-club/content-render`: `groupPlacedPosts(posts, trackSlug, track) → Record<sectionKey, PlacedPost[]>` where `sectionKey` is `<topicId>` or `<topicId>/<subtopicId>`; filters `placement.track === trackSlug`, drops dangling ones, sorts per §2.3. `PlacedPost = { slug, title, summary, date, href }` (plain strings only, serialisable to the client component).
- `TrackView` props: `{ track: Track; vertical: string; slug: string; placed: Record<string, PlacedPost[]>; readOnly?: boolean }`.
  - Sections carry anchors `id="t-<topicId>"` / `id="t-<subtopicId>"`; topic/subtopic descriptions; rows show checkbox, title, badge (Article / Link / Video), difficulty, description.
- **Progress:** `localStorage` `cc-track:v1:<vertical>/<slug>`, JSON array of ids. Resource items use their id; placed blogs `post:<slug>`. **Unknown ids are kept in storage but not counted** (so a blog briefly moved or a track edit doesn't erase ticks). Corrupt/unavailable storage never crashes; tabs sync via `storage` events; no hydration mismatch.
- **Breadcrumb** on a placed blog's page (vertical portal): "Part of DSA Sheet › Arrays & Hashing › Sliding window", linking to `/tracks/<slug>#t-<id>`.
- **Nav:** layout calls `getTracks()` and passes `extraLinks` to `VerticalNavbar` only when ≥ 1 track. **Main hub** lists tracks and links to `https://<domain>/tracks/<slug>` using the `portals.json` entry whose `vertical` matches (today `*.vercel.app`; updates with the domain move).
- **Sample:** migrate `competitive-programming/tracks/dsa-starter-sheet.json`: keep slug and item ids (existing ticks survive), add topic/subtopic ids (`foundations`, `arrays-hashing`, `hash-maps`, `two-pointers`, `dynamic-programming`), add descriptions, remove the `post` item and instead give the existing CP article `placement: { track: dsa-starter-sheet, topic: dynamic-programming }`.

### 2.9 Phase 2 tests
- Unit: schema (ids, shared namespace, leading letter, descriptions, empty sections allowed, strict keys, old `post` items rejected with a clear message); `parsePlacement`; `placementErrors`; `groupPlacedPosts` (filter, dangling drop, date/slug order, missing date last); progress keeps unknown ids but doesn't count them.
- CI script (temp copy of `content/`): bad placement shape fails; club placement fails; dangling placement warns but passes; placed post hidden from its portal fails.
- Integration (in-memory GitHub): blog PR placed under a topic that was removed on `main` after the PR opened → refused at merge; same PR passes once the placement is fixed; CMS edit of a placed blog keeps `placement`.
- Browser (real Chromium): track with resources + a placed blog, descriptions, ticks survive reload, Watch toggle, breadcrumb link lands on the topic anchor, nav link, hub link-out.

## 3. Phase 3: Managing it in the CMS (split)

### 3.1 Who
| Action | Who | Approval to merge |
|---|---|---|
| Create / edit a track (topics, subtopics, links, videos, descriptions) | **Head** of the vertical, or a Superadmin | Head's PR → a Superadmin. Superadmin's PR → another Superadmin. A Deputy or another vertical's Head reviewing gets "needs a Superadmin". |
| Place / move / remove a blog's placement | Anyone who can write a blog in that vertical | The normal blog quorum for the author's role. |

All existing rules apply: no self-approval, commit-author checks, `expectedHeadSha`, fail-closed live roles, CSRF guard.

### 3.2 Phase 3a — placement picker in the blog editor
- "Where does this go?" → *Normal blog only* (default) / *In a track* → Track ▸ Topic ▸ (Subtopic). Options come from `GET /api/tracks?vertical=<v>` (tracks on `main`: slug, title, topics with ids/titles/subtopics).
- Stored in the draft (IndexedDB draft type, `draftStorage`, sync/publish bodies), sent to `/api/posts/draft`, validated server-side with `parsePlacement` + `placementErrors` against `main` (400 with the message), written to frontmatter only when set. Changing vertical clears it.
- Review preview shows "Placed in: …" (from frontmatter + the track on `main`).

### 3.3 Phase 3b — track editor (`/admin/tracks`)
- Sidebar **Tracks** for Heads and Superadmins. List of the user's verticals' tracks with an "open PR" badge for `track/<v>/` branches.
- Form: title, summary; topics/subtopics with add, rename, description, remove (confirm), move up/down; link and video items with title, URL, difficulty, description. Ids generated once (§2.2).
- Removing a topic/subtopic that has placed blogs shows "N blogs are placed here: …; they'll drop out of the tree until moved" (list from `GET /api/tracks?vertical=` which also returns placed-blog counts per section).
- Preview: read-only `TrackView`. Local draft: IndexedDB `track:<login>:<vertical>/<slug|new>`.
- `POST /api/tracks` `{ vertical, slug, track, pullNumber?, expectedHeadSha? }` → `{ pullNumber, prUrl, branch }`. Head-or-Superadmin; `validateTrack`; on edit, every id present on `main` must still exist **or** be deliberately removed (ids may be removed, never changed: a new id with an old title is fine; an existing id whose section moved between topic and subtopic is refused). New track: 409 if the file exists. Branch `track/<v>/<slug>-<5 digits>`, commit `feat(<v>): track <slug> [skip vercel]`, PR `feat(<v>): track <title>`.
- Review/merge as §7.3 (patched for v3.1): `track/` namespace in `REVIEWABLE_BRANCH_RE` and the draft route's revision check; `classifyEditorialPR` (renamed from `validateArticlePRFiles`) → `publish | unpublish | track`; `getPRContent` (renamed from `getPRArticleContent`) union; merge re-runs `validateTrack` at head sha; subject `feat(<v>): track <title> (#n)`.

### 3.4 Phase 3 tests
3a: member places a blog → normal quorum merges it → it appears in the tree; invalid placement refused at submit; edit keeps/changes placement. 3b: Head creates → Superadmin approves → merges; Deputy/Member refused to submit; Deputy approval doesn't count; extra file refused; type crossover refused; bad JSON pushed after review caught at merge; changed id refused; stale `expectedHeadSha` 409. Fixtures `zz-test-*`, deleted afterwards.

## 4. Phase 4: Reader comments (GitHub Discussions via giscus)

### 4.1 How it works
- Comment box on every blog page (main portal and vertical portals), every track page, and every topic and subtopic section (behind a "Discuss" button, one open at a time).
- Readers sign in with GitHub inside the box, then comment, reply, react. No CMS access, no code access.
- One Discussion per page in **this repository**, category **Comments** (type *Announcement*: only maintainers and the giscus app can start threads; anyone signed in can reply). Created automatically on the first comment.
- Comments never touch `main`: no CI, no deploys, no database.

### 4.2 Thread keys
`data-mapping="specific"`, `data-strict="1"`, `data-term` built by `commentTerm()` (pure, in `content-render`, unit-tested). The term is also the Discussion title.

| Page | Term |
|---|---|
| Blog (same thread on main portal and vertical portal) | `post:<vertical>/<slug>` (`club` for club posts) |
| Track | `track:<vertical>/<track>` |
| Topic / subtopic | `topic:<vertical>/<track>/<id>` (ids are track-unique) |

Accepted behaviours: a blog unpublished and re-published with the same slug gets its old thread back; a blog moved to another vertical starts a new thread. Not domain-based, so the domain move doesn't orphan anything.

### 4.3 Abuse and moderation
- **`giscus.json` at the repo root** with `origins` = every portal domain from `portals.json` + the main portal (and later `*.codingclub.tech`). Other sites embedding our repo ids are refused by giscus. A CI check fails if a `portals.json` domain is missing from `origins`.
- **Moderators: Superadmins** (repo admins) hide, delete or lock comments and block users. Heads moderate by reporting to a Superadmin (they don't have repo triage rights).
- **Kill switches** in `content/club/comments.json`: `enabled` (global) and `disabledVerticals: []`. Schema-checked in CI; a missing or invalid file means comments off.
- `scripts/lib/affected-apps.mjs`: a change to `content/club/comments.json` or `giscus.json` redeploys all portals (with a test).

### 4.4 Implementation
- `@coding-club/content-render/comments` (new export): `<Comments term config />` client component. The config is read on the server (`comments.json`) and passed as props. It injects giscus' `client.js` (pinned to a version) only when the box scrolls near or "Discuss" is clicked, with `data-loading="lazy"`, `data-reactions-enabled="1"`, `data-input-position="bottom"`, `data-theme="light"`, `data-lang="en"`.
- Risk accepted for now: `client.js` is third-party script on our origins (it can read that origin's `localStorage`, which holds only track progress). Moving to a self-hosted giscus on Vercel is a follow-up; terms don't change.
- Not shown in CMS previews.

### 4.5 Owner setup (one time)
Enable Discussions → create the **Comments** category (Announcement) → install the giscus app on this repo only. On the move to the club organisation: transfer the repo, reinstall the giscus app there, update `comments.json` ids and `giscus.json` origins.

### 4.6 Phase 4 tests
Unit: `commentTerm` for every page kind; `comments.json` schema; origins-vs-portals CI check; affected-apps rule. Browser (real Chromium): box loads only near the bottom / on "Discuss"; the right term is used; kill switches render nothing. The sign-in-and-post leg needs a real GitHub login, so the owner drives it once on a preview; test comments are deleted afterwards.

## 5. Out of scope (later, separate work)
- Multiple placements per blog; Head-controlled ordering of placed blogs; more than two levels.
- Enforcing id permanence in CI (base-vs-head diff).
- Tracks on the main portal itself; club-wide tracks; server-side progress sync; drag-and-drop.
- Self-hosting giscus.
- The repo move to a club account, per-vertical page ownership, the production domain, and removing members' direct push access.

## 6. Rollout
1. **Phase 1** (shipped): embeds.
2. **Phase 2:** schema v3.1, CI, portal track pages with placed blogs and breadcrumbs, merge-time placement check, placement kept on CMS edits, sample migrated.
3. **Phase 3a:** placement picker. **Phase 3b:** track editor and track review/merge.
4. **Phase 4:** comments, after the owner's GitHub setup.

Each phase is reviewed and merged on its own.

## 7. Implementation notes kept from v2.1
(Where these mention `post` items in tracks, the unpublish guard, or Deputies authoring tracks, v3.1 above wins: tracks contain only link/video items, there is no unpublish guard, and track authors are Head or Superadmin only.)

### 7.1 CMS wiring (M1)
- **Phase 1:**
  - `apps/cms-studio/package.json` gains `"@coding-club/content-render": "workspace:*"`.
  - `apps/cms-studio/next.config.ts` gains `transpilePackages: ["@coding-club/content-render"]`, keeping its existing `rewrites`.
  - In both preview call sites, `admin/page.tsx` (editor) and `components/reviews/ReviewPreviewDrawer.tsx` (review):
    `const { markdown, embeds } = extractEmbeds(src)` → `marked.parse(markdown)` → `sanitizeArticleHtml(...)` → `injectEmbeds(html, embeds)`.
- **Phase 3:**
  - The CMS also depends on `@coding-club/content-schema` (for `validateTrack`).
  - It does **not** depend on `scrapbook-ui`. That package pulls in gsap and three, and the CMS must not ship them.
  - **`TrackView` therefore lives in `@coding-club/content-render`** at `src/react/TrackView.tsx`, exported as `@coding-club/content-render/track-view`.
    - It uses only React, which is a `peerDependencies` entry and never bundled twice.
    - Its styles are plain CSS in `packages/content-render/styles/track-view.css`. That file uses only `.cc-track*` classes and CSS custom properties with fallbacks.
    - Each consumer imports the stylesheet once in its global CSS: each vertical portal through the scrapbook stylesheet's `@import`, and the CMS from its `globals.css`.
  - The vertical portals take `TrackView` from the same subpath, so scrapbook-ui never needs it.

### 7.2 Package wiring (M2)

**`packages/content-render/package.json`:**
```json
{
  "name": "@coding-club/content-render",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./track-view": "./src/react/TrackView.tsx",
    "./styles/track-view.css": "./styles/track-view.css"
  },
  "peerDependencies": { "react": "^19" },
  "dependencies": { "@coding-club/content-schema": "workspace:*" }
}
```
- **`src/index.ts`:** pure, browser-safe functions (`parseYouTubeUrl`, `extractEmbeds`, `injectEmbeds`, `youTubeEmbedHtml`, progress helpers).
- **`src/server.ts`:** `loadTracks` / `loadTrack`, which use `fs`. It is imported only from server components.

**`packages/content-schema/package.json`** gains an exports map. `main` and `types` stay as they are, for existing imports:
```json
"exports": { ".": "./src/index.ts", "./tracks": "./src/tracks.mjs" }
```
`tracks.mjs` depends only on `zod`, which is already a dependency. `scripts/validate-content.mjs` imports it relatively, as `../packages/content-schema/src/tracks.mjs`, because the repo root has no workspace dependency on it.

**Per-app dependency and `transpilePackages` changes:**

| App | Phase 1 adds | Phase 2/3 adds |
|---|---|---|
| main-portal | content-render | none (links out only) |
| 8 vertical portals and the template | content-render | content-schema is already listed; add `content-render` (index, `/server`, `/track-view`) |
| cms-studio | content-render (+ creates `transpilePackages`) | content-schema |

### 7.3 Review and merge for tracks (M3)
- **Branch namespace:**
  - Tracks use `track/<v>/<slug>-<id>`, and articles keep `draft/<v>/<slug>-<id>`.
  - `REVIEWABLE_BRANCH_RE` becomes `^(?:draft|cms|track)\/[a-z0-9_-]+\/[a-z0-9-]+$`.
  - A `track/` branch must classify as `track`, and a `draft/` branch must classify as `publish` or `unpublish`. Anything else is refused.
- **Classifier:**
  - `classifyEditorialPR(files)` returns `{ ok, kind: "publish" | "unpublish" | "track", path, vertical, status }`. It applies the same complete-listing rule as articles (`assertCompletePRListing`).
  - A track PR is exactly one added or modified `content/verticals/<v>/tracks/<slug>.json`.
- **Queue:**
  - `listPendingReviewPRs` sets `kind` from the branch namespace, which is cheap and collision-free thanks to the separate `track/` prefix. That kind is a **display hint only**.
  - Authorization always re-classifies from the file list.
- **Content shape:** `getPRContent(token, n)` returns a union:
  - **articles:** the current article shape, plus `kind`;
  - **tracks:** `{ kind: "track", filePath, vertical, slug, title: track.title, authorUsername: "", track, postTitles, headSha, branch }`. An empty `authorUsername` means "the PR opener is the author".
  - The reviews route POST reads `vertical`, `title` and `authorUsername` the same way for both kinds.
- **Author role for tracks:**
  - It is always the **PR opener's** role in the vertical.
  - The "edit of a published file uses the original author's role" rule (`checkReviewPreconditions`, base-file frontmatter lookup) applies to `kind === "publish"` only. It is skipped for tracks, which have no single author.
  - The opener must be Head or Superadmin of that vertical (v3.1), checked again at merge.
- **Authority:**
  - For tracks, `evaluateReviewerAuthority` uses the article table except that `count-deputies` is never returned.
  - A Deputy or Head reviewer of a track gets "needs a Superadmin" (v3.1: tracks are authored by Heads or Superadmins, so only a Superadmin can approve).
- **Order inside `checkReviewPreconditions` (all before any review is recorded):**
  1. PR state, base and branch checks
  2. classify and complete-listing checks
  3. self-review and contributor checks
  4. for `track`: fetch the JSON at `head.sha`, then run `validateTrack` against `main`'s post slugs (one tree read)
  5. (v3.1: removed — tracks no longer reference blogs; instead, for `publish` with a placement, check it against the track on current `main`, §2.6)
  6. authority
- **Merge:**
  - `ReviewCheck.kind` gains `"track"`.
  - The slug is taken from the path without extension (`.md` or `.json`).
  - `buildMergeSubject("track", v, title, slug, n)` gives `feat(<v>): track <title> (#n)`, which passes `verify-commit`.
  - Merge still pins `sha: headSha`.
- **Draft route crossover:**
  - `/api/posts/draft` revisions already refuse a PR that doesn't classify as `publish` (createDraftAndPullRequest's revision check).
  - `/api/tracks` revisions refuse a PR that doesn't classify as `track`.
  - Both are covered by integration tests.
