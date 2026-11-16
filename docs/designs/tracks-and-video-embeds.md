# Design: YouTube Embeds and Learning Tracks

Status: **v2.1, revised after two EGM goldfish review rounds (round 2: no blockers; its 3 majors and nits are resolved in §6); awaiting owner approval**
Date: 2026-11-16
Request (club leads): "add an option to embed YT videos/playlists into a blog, and a way to organise blogs according to topic and subtopic (NeetCode was only an example of the shape) so CP and other verticals can create DSA courses or internship guidance; let the CMS manage it."

Owner decisions already made:
- Build in phases, with a simple CMS form, not a full tree editor.
- Name: **Tracks**, which appears in URLs and menus.

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

## 2. Phase 2: Track pages (vertical portals)

### 2.1 File format
**Path:** `content/verticals/<vertical>/tracks/<track-slug>.json`. There are no club-level tracks.

```json
{
  "title": "DSA Sheet",
  "summary": "Core patterns with walkthroughs and practice problems.",
  "vertical": "competitive-programming",
  "topics": [
    {
      "title": "Arrays & Hashing",
      "items": [
        { "id": "a1", "type": "post", "slug": "two-pointers-explained" },
        { "id": "a2", "type": "link", "title": "Two Sum", "url": "https://leetcode.com/problems/two-sum/", "difficulty": "easy" }
      ],
      "subtopics": [
        { "title": "Sliding window", "items": [{ "id": "a3", "type": "video", "title": "Sliding window in 10 min", "url": "https://youtu.be/AAAAAAAAAAA" }] }
      ]
    }
  ]
}
```

**Field rules:**

| Field | Rule |
|---|---|
| `title` | 1–120 chars |
| `summary` | 0–300 chars |
| `vertical` | must equal the folder |
| `topics` | 1–30 |
| each topic | `title` 1–120; `items` 0–100; `subtopics` 0–30 |
| each subtopic | `title` 1–120; `items` 1–100 |
| total items per track | ≤ 500 |
| file size | ≤ 200 KB |
| item `id` | `^[a-z0-9]{1,12}$`, unique within the track; never reused for a different item |
| `post` item | `slug` must be kebab-case |
| `link` item | `title` 1–120; `url` https only, no user:pass, ≤ 500 chars; optional `difficulty` of `easy`, `medium` or `hard` |
| `video` item | `title` 1–120; `url` must pass `parseYouTubeUrl` |
| unknown keys | rejected (strict) |

- **Track slug:** `^[a-z0-9]+(?:-[a-z0-9]+)*$`, at most 60 characters. Once a track is published its slug must not change, because progress is keyed by it. The CMS doesn't offer renaming.
- **Schema location:** the schema lives **once**, in `packages/content-schema/src/tracks.mjs`, with a hand-written `tracks.d.mts`. The `.mjs` extension makes it ESM whatever the package type. It is imported by:
  - the Next apps and the CMS server, as `@coding-club/content-schema/tracks`;
  - the Node validation script, as a relative import (see §6.2). It exports `validateTrack(json, { vertical, postSlugs }) → { ok, errors: string[] }`, which returns plain-language messages.

### 2.2 Validation and dangling references
- **CI:** `scripts/validate-content.mjs` walks `content/verticals/*/tracks/*.json` and runs `validateTrack`.
  - Unknown files in a `tracks/` folder fail.
  - A `post` item whose slug doesn't exist in that vertical **fails CI**, so a broken track can't merge.
- **Readers:** portals **never** fail the build on a missing post. The item renders as "No longer available", and nothing throws during the static build.
- **Unpublish:** the server refuses to merge an unpublish PR while a track on `main` still references that article, with the message "Remove it from track X first".

### 2.3 Reader pages (vertical portals only)
- **Routes:** `apps/<portal>/src/app/tracks/page.tsx` (the list) and `apps/<portal>/src/app/tracks/[slug]/page.tsx`, with `generateStaticParams` from the vertical's tracks and `dynamicParams = false`.
  - Applies to the 8 vertical portals and the template.
  - No 404s for valid tracks; unknown slugs give 404.
- **Loader:** `loadTracks(contentRoot, vertical)` and `loadTrack(...)` live in `@coding-club/content-render/server`, a server-only entry that uses `fs`.
  - The content root is resolved the same way each `posts.ts` does today.
  - Post titles and summaries come from that portal's `getPortalPosts()`.
- **UI:** one shared client component, `TrackView` (`"use client"`), in `@coding-club/content-render/track-view`, with styles in `content-render/styles/track-view.css`. It isn't in scrapbook-ui, so the CMS can use it without pulling in gsap and three (see §6.1).
  - Topics appear as sections, with subtopic headings inside.
  - Each item is a row: a checkbox with an accessible label, a title link, a type badge, and difficulty if set.
    - Post links go to `/posts/<slug>`.
    - External links open in a new tab with `rel="noopener noreferrer"`.
    - Video items show the title, and an "Watch" toggle that lazily mounts the embed.
  - Overall and per-topic "x / y done" counters.
- **Progress:** stored in `localStorage` under `cc-track:v1:<vertical>/<slug>` as a JSON array of item ids.
  - Unknown ids are pruned on load.
  - Counts include only current items.
  - The UI renders unchecked on the server and reads storage in `useEffect`, so there's no hydration mismatch.
  - Unavailable or corrupt storage shows the page without saving and with no crash.
  - A `storage` event listener keeps tabs in sync.
  - Progress lives in one browser on one site; there's no login.
- **Navigation:** each portal's nav gets **Tracks** only when that vertical has at least one track. The main portal's vertical hub page links to `https://<portal-domain>/tracks`, using the domain from `content/club/portals.json`.
- **Sample:** one hand-written CP track ships in phase 2, using the existing CP article plus a few links and videos.

### 2.4 Phase 2 tests
- **Schema:** unit-tested valid and invalid fixtures, under `scripts/__tests__/` and `packages/content-schema`, in temp dirs and never under `content/`.
- **TrackView:** progress pruning and counting are pure helpers, unit-tested.
- **Browser:** the track page renders, and ticks survive a reload.

## 3. Phase 3: Managing tracks in the CMS

### 3.1 Who
- Superadmins, and the Head or a Deputy **of that vertical**, can create or edit tracks. Members can't.
- This is enforced at submit **and** at merge.

### 3.2 UI
- New sidebar item **Tracks** (`/admin/tracks`), shown when the user can manage at least one vertical.
- **List:** that user's verticals' tracks, read from `main` via the Contents API, plus "open PR" badges matched by the branch prefix `track/<v>/`.
- **Form** (`/admin/tracks/edit?vertical=&slug=`, or new):
  - title and summary;
  - topics and subtopics as nested fieldsets, with add, rename, remove (with confirm) and move up/down within the same parent;
  - items added via an article picker (that vertical's published posts), "Add link" or "Add video";
  - the CMS generates item `id`s;
  - inline errors from the shared `validateTrack`;
  - a preview built from the same `TrackView` component.
- **Local draft:** IndexedDB, using the existing `CodingClubCMS` object store and per-user namespacing, with key `track:<login>:<vertical>/<slug|new>`. There's no schema version bump.

### 3.3 API: `POST /api/tracks`
- **Request:** `{ vertical, slug, track, pullNumber?, expectedHeadSha? }`
- **Response:** `{ pullNumber, prUrl, branch }`. Errors are 400, 401, 403, 404, 409 or 503 with `{ error }`.
- **Rules:**
  - The session token goes through the existing same-origin and JSON CSRF guard.
  - Post slugs "currently on `main`" come from one recursive git tree read of `main` (`git.getTree`, filtered to `content/verticals/<v>/posts/*.md`), not from fetching every file.
  - Identity comes from GitHub `/user`.
  - The role in the vertical comes from live roles (fail closed, 503).
  - `validateTrack` must pass, checked against the post slugs currently on `main`.
- **New track:** refused (409) if `content/verticals/<v>/tracks/<slug>.json` exists on `main`.
  - Creates branch `track/<v>/<slug>-<5 digits>`. This is a separate namespace from articles' `draft/`, so an article slug starting with "track-" can never be mistaken for a track (see §6.3).
  - Commits the file as `JSON.stringify(track, null, 2) + "\n"`, with commit message `feat(<v>): track <slug> [skip vercel]`.
  - Opens a PR titled `feat(<v>): track <title>`.
- **Edit of a published track:** same, but the file already exists on `main`, so the PR shows it as modified.
- **Revision of an open track PR** (`pullNumber`): the same checks as article revisions (open PR, own or superadmin, same-repo `track/<v>/` head, base main, `expectedHeadSha` matches). The PR must also classify as a **track** PR for the **same file**.

### 3.4 Review and merge integration
- **Classifier:** `validateArticlePRFiles` becomes `classifyEditorialPR(files)` → `publish | unpublish | track`. Its old name stays as an alias for the article kinds.
  - A track PR is **exactly one** added or modified `content/verticals/<v>/tracks/<slug>.json`, and nothing else (no uploads).
  - Mixing with articles is refused.
  - The existing complete-listing checks (file count = `changed_files`, ≤ 40; commit count) apply unchanged.
- **Reviews:**
  - `getPRArticleContent` → `getPRContent`, which returns `{ kind, ... }`. For tracks it returns the parsed JSON plus the post titles it references.
  - The queue's list item gets `kind`.
  - The preview drawer renders a track with `TrackView` (read-only).
- **Who can approve:**
  - A track by a Deputy needs that vertical's Head or a Superadmin.
  - A track by a Head needs a Superadmin.
  - A track by a Superadmin needs another Superadmin.
  - Deputy votes never count for tracks.
  - All existing self-review, commit-author and `expectedHeadSha` rules apply.
- **Merge time:**
  - The PR author must still be Head, Deputy or Superadmin of that vertical.
  - The JSON at `head.sha` is **re-validated** with `validateTrack` against `main`'s current post slugs. Validation at submit time alone is bypassable, because collaborators can push.
  - Merge subject: `feat(<v>): track <title> (#n)`, built server-side.
- **Unpublish guard:** see §2.2.

### 3.5 Phase 3 tests
- **Integration (in-memory GitHub, `src/__integration__`):**
  - Deputy creates a track, the Head approves, it merges.
  - A Deputy's approval doesn't count.
  - A Member is refused.
  - A track PR with an extra file or an upload is refused.
  - Type crossover in a revision is refused.
  - Merge-time re-validation catches a bad JSON pushed after review.
  - Unpublish is blocked by a referencing track.
  - Self-approval is refused.
- **Browser:** create a track in the CMS, see the PR, preview it in Reviews. Fixtures are named `zz-test-*`, and test PRs and branches are deleted afterwards.

## 4. Out of scope (later, separate work)
- Tracks on the main portal itself
- Club-wide tracks
- Server-side progress sync
- Drag-and-drop reordering
- Embeds other than YouTube
- The repo move to a club account, per-vertical page ownership, the production domain, and removing members' direct push access (recommended by the security review)

## 5. Rollout
1. **Phase 1:** embeds, as one PR. It redeploys all apps once.
2. **Phase 2:** the schema, validation, track pages and the sample CP track.
3. **Phase 3:** the CMS Tracks form, `/api/tracks`, and review and merge integration.

Each phase is reviewed and merged on its own.

## 6. Implementation details (resolves EGM round 2)

### 6.1 CMS wiring (M1)
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

### 6.2 Package wiring (M2)

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

### 6.3 Review and merge for tracks (M3)
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
  - The opener must be Head, Deputy or Superadmin of that vertical, checked again at merge.
- **Authority:**
  - For tracks, `evaluateReviewerAuthority` uses the article table except that `count-deputies` is never returned.
  - A Deputy reviewer of a track gets "needs the Vertical Head or a Superadmin".
- **Order inside `checkReviewPreconditions` (all before any review is recorded):**
  1. PR state, base and branch checks
  2. classify and complete-listing checks
  3. self-review and contributor checks
  4. for `track`: fetch the JSON at `head.sha`, then run `validateTrack` against `main`'s post slugs (one tree read)
  5. for `unpublish`: refuse if any `content/verticals/<v>/tracks/*.json` on `main` references the slug (same tree read, then fetch only that vertical's track files)
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
