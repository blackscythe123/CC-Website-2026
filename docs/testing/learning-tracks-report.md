# Test report: learning tracks, CMS management and reader comments

Date: 2026-11-16. Design: `docs/designs/tracks-and-video-embeds.md` (v3.1).
Scope: Phase 2 (portals, merged in PR #32), Phase 3a (blog placement picker), Phase 3b (track editor and review), Phase 4 (reader comments).

Evidence levels used below:
- **Rendered**: seen working in a real browser, with the engine named.
- **GitHub-confirmed**: the resulting branch, PR or file was read back from GitHub.
- **Automated**: covered by a test suite (in-memory GitHub for integration tests).
- **Pending**: not verified yet, with the reason.

## Automated suites (all green on the final branch)

| Suite | Result |
|---|---|
| CMS vitest (unit + `src/__integration__` in-memory GitHub, 11 users) | 377 / 377 |
| Script tests (`node --test scripts/__tests__/*.test.mjs`) | 33 / 33 |
| `pnpm run ci` (content validation + build of all 11 apps) | pass |

Guard tests were mutation-checked: disabling the merge-time placement check, the track author-role check, the branch/kind binding or the route's Head-only check makes the matching tests fail.

## Phase 2: track pages on the portals

| Leg | Evidence |
|---|---|
| Track page renders topics, subtopics, descriptions, placed blog | Rendered (Obscura, then Playwright Chromium); live after PR #32 deploy (HTTP 200 + content on cc-cp-portal) |
| Ticks persist across reload; second tab syncs; old v2 ticks kept but not counted | Rendered (Playwright Chromium) |
| "Watch" mounts the YouTube embed; "Hide" removes it | Rendered (Playwright Chromium) |
| Breadcrumb on a placed blog links to the topic anchor and scrolls to it | Rendered (Playwright Chromium) |
| Main-portal hub links out to the vertical's track | Rendered (Playwright Chromium); live 200 |
| CI rules: bad track, stray file, malformed / club / hidden placement fail; dangling placement warns | Automated (script tests) |
| Merge refuses a blog whose topic was removed on main after the PR opened; reject still allowed | Automated (integration) |

## Phase 3a: "Where does this go?" in the blog editor

| Leg | Evidence |
|---|---|
| Picker lists the vertical's tracks, topics and subtopics from main | Rendered (Playwright Chromium, local CMS, superadmin session) |
| Submit writes `placement` into the blog frontmatter on the draft branch | GitHub-confirmed (test PR #34, file read back) |
| Review preview shows "Placed in learning track: DSA Starter Sheet › Arrays & Hashing › Two pointers" | Rendered (Playwright Chromium) |
| Invalid / dangling / club placements refused before any write; revisions move, keep or remove placement; cloud drafts keep it | Automated (integration) |

## Phase 3b: track editor and review

| Leg | Evidence |
|---|---|
| Tracks screen in the sidebar for Heads and Superadmins; lists published tracks | Rendered (Playwright Chromium) |
| Edit loads the track with its short name locked and "1 blog placed here"; removing that topic warns first | Rendered (Playwright Chromium) |
| New track: bad link blocked with a message; preview keeps line breaks; submit opens a one-file PR on `track/<v>/…` | Rendered + GitHub-confirmed (test PR #33: one file, generated ids, content correct) |
| Review drawer renders the proposal read-only; the author sees no Approve button ("needs another superadmin") | Rendered (Playwright Chromium) |
| Revise from "Waiting for review" updates the same PR | Rendered + GitHub-confirmed (2nd commit with the edited summary) |
| Head proposes → Deputy / Head / Member refused → Superadmin merges with `feat(<v>): track <title> (#n)`; Superadmin's track needs another Superadmin | Automated (integration) |
| Only Head/Superadmin may propose; invalid tracks and names refused before any write; create vs edit 409/404; ids can be removed but not moved | Automated (integration) |
| Stale `expectedHeadSha` 409; bad JSON pushed after submit caught at approve; extra files refused; branch namespace must match content; Deputy-opened track PR can't merge | Automated (integration) |

## Phase 4: reader comments

| Leg | Evidence |
|---|---|
| Boxes render only when `comments.json` is enabled with a category id (kill switch) | Automated (unit) + rendered with a temporary local config |
| Topic/subtopic "Discuss" toggles: one open at a time, correct term per section | Rendered (Playwright Chromium, temporary local config) |
| Track and blog boxes lazy-load with terms `track:…` and `post:…`, `strict=1`, our repo id | Rendered (Playwright Chromium); the real giscus widget loaded in the iframe and queried its API with that term (403 expected until Discussions + the giscus app are set up) |
| `?giscus=` session is moved out of the URL and passed to the widget; a bad session is cleared | Rendered (Playwright Chromium; giscus rejected the fake session with 400 and the component cleared it) |
| No giscus `client.js` loaded on the portal origin | Rendered (request log) |
| CI: invalid `comments.json` fails; enabled config requires every portal domain in `giscus.json` origins | Automated (script tests) |
| giscus sees the repo and the configured category (`/api/discussions/categories` returns our repo id and the Announcements id; thread lookup 404 = not created yet) | Confirmed against giscus.app after setup (Discussions on via CLI, giscus app installed by the owner) |
| Real GitHub sign-in, posting a comment, the thread appearing in Discussions | **Pending:** the owner signs in and comments once on the live site after the deploy (sign-in can't be automated). |

## Data hygiene

Test PRs #33 (track) and #34 (placed blog) were labelled "ZZ Test", closed with a comment, and their branches deleted (confirmed: no `track/*` or `zz-*` branches remain). The comments config was switched on only in the local working copy for the browser test and restored before committing. The local session file was deleted.

## Mistake recovery (follow-up batch, 2026-11-16)

Scope from an EGM review (code inventory + design gaps): edit published articles, withdraw requests, restore unpublished articles, delete tracks, refuse merges that would overwrite a newer change, move a resource between topics, confirm role changes.

| Leg | Evidence |
|---|---|
| Articles → Edit loads the live article (vertical locked, placement kept); "Submit edit for review" opens a `fix(<v>): edit …` PR with only that file | Rendered (Playwright Chromium) + GitHub-confirmed (test PRs #36, #37) |
| An edit keeps the byline exactly (a hand-written article without `authorUsername` doesn't get the editor's name) | **Found by the browser pass** on #36, fixed, re-checked on #37 (GitHub-confirmed) + Automated |
| Edit approval follows the original author's rank (unknown author = Superadmin only) | Automated (integration) |
| Withdraw from Reviews and from the Tracks screen: PR closed unmerged, branch deleted | Rendered + GitHub-confirmed (#36, #37, #38 closed, no branches left) |
| Track deletion request: one removed file, PR text lists placed blogs; review preview shows a deletion banner; a deletion can't be revised into an edit | Rendered + GitHub-confirmed (#38) + Automated |
| Move a resource to another topic/subtopic in the track editor (id kept) | Rendered (not submitted) |
| Role assignment asks for confirmation (with Head-replacement / Superadmin warnings); cancelling saves nothing | Rendered; `roles.json` unchanged on GitHub |
| Restore an unpublished article: listed for its Head/Superadmins, restored byte-for-byte through a reviewed PR | Automated (integration). Not browser-tested: no article is currently unpublished on main, and creating one needs a second Superadmin's approval. |
| Second of two edits to the same article/track is refused at merge (409); a stale revision is refused (409) | Automated (integration, mutation-checked) |

Test PRs #36–#38 were withdrawn through the new UI and their branches deleted.
