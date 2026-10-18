<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🤖 Strict Operating Rules for AI Agents Working in this Repository

All AI assistants (Antigravity, Claude, Copilot, Cursor, etc.) and human contributors MUST strictly abide by the following constraints:

---

## 1. Zero Database Constraint (Absolute Rule)
- **NEVER** introduce, recommend, or configure an external database (e.g. PostgreSQL, Prisma, Supabase, SQLite, Firebase, MongoDB).
- Git trees, commits, branches, and GitHub Pull Requests are the **SOLE database** of this application.
- Client-side drafts are cached in IndexedDB (`CodingClubCMS`) to survive browser reloads, crashes, and power cuts.
- All persistent state (posts, vertical metadata, user roles) lives directly in the Git repository:
  - Roles: `content/club/roles.json`
  - Permissions: `.github/CODEOWNERS`
  - Vertical Articles: `content/verticals/<vertical-slug>/posts/<slug>.md`
  - Club Announcements: `content/club/posts/<slug>.md`

---

## 2. Package Manager: STRICTLY pnpm ONLY
- **NEVER** use `npm`, `yarn`, or `bun`.
- Monorepo workspace linking, Turborepo builds, and lockfile resolution strictly require `pnpm` (version `10.x`).
- **Enforcement**:
  - `package.json` contains `"preinstall": "npx only-allow pnpm"`.
  - Attempting to run `npm install` or `yarn install` will immediately fail and abort with:
    `Use "pnpm install" for installation in this project.`
  - Always run scripts via `pnpm`: e.g. `pnpm dev:portal`, `pnpm dev:cms`, `pnpm build`, `pnpm -r build`.

---

## 3. Commit Message Discipline & Local Git Hook
- **Commit Message Format**:
  - Must be a **single line under 25 words**: `<tag>: <short message>`.
  - Allowed tags: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`, `security`.
  - Examples:
    - `feat(portal): add interactive terminal hero canvas`
    - `fix(governance): enforce anti-self-approval on pull requests`
    - `docs(agents): update vertical template and pnpm instructions`
  - **Zero AI Trailers**: NEVER include `Co-Authored-By`, `Signed-off-by`, or AI assistant trailers (`Claude`, `ChatGPT`, `Antigravity`, `Copilot`, etc.).
- **Enforcement Mechanism**:
  - **Local Hook**: Configured via Git's `core.hooksPath` pointing to `.githooks/commit-msg`, which runs `node scripts/verify-commit.mjs`.
  - **Auto-Installation**: Running `pnpm install` automatically activates this hook via the `"prepare": "git config core.hooksPath .githooks"` script.
  - **CI Gate**: Enforced in GitHub Actions (`.github/workflows/content-ci.yml`) on every push and Pull Request. Violations immediately fail the build.

---

## 4. 8 Official Technical Verticals & Subdomain Mapping
The club is organized into exactly **8 official technical engineering verticals**:
1. `ai-ml`: **AI / ML** (`ai.codingclub.tech`)
2. `ar-vr-game-dev`: **AR, VR & Game Dev** (`arvr.codingclub.tech`)
3. `competitive-programming`: **Competitive Programming** (`cp.codingclub.tech`)
4. `cybersecurity`: **Cyber Security** (`cybersecurity.codingclub.tech`)
5. `ssnhacks`: **SSN Hacks** (`hacks.codingclub.tech`)
6. `design-ui-ux`: **Design & UI/UX** (`design.codingclub.tech`)
7. `full-stack`: **Full Stack** (`web.codingclub.tech`)
8. `open-source`: **Open Source (OSS)** (`oss.codingclub.tech`)

- **Strict Vertical Guardrails**:
  - Do NOT invent or restore fake/placeholder verticals (`blockchain`, `cloud-devops`, `iot-embedded`, `mobile-dev`).
  - `Office Bearers` and `PR` are administrative, NOT technical verticals.
  - Club-wide announcements belong exclusively to the `club` partition (`content/club/posts/[slug].md`).

---

## 5. Vertical Portal Template Architecture (`apps/vertical-portal-template`)
All vertical web applications in `apps/` (`apps/ai-ml-portal`, `apps/full-stack-portal`, etc.) are derived from the standardized template at `apps/vertical-portal-template`:
- **Identity via `portal.config.json`**:
  Each vertical portal MUST inherit its identity from its local `portal.config.json`:
  ```json
  {
    "slug": "ai-ml",
    "name": "AI / ML",
    "tagline": "Exploring intelligence, neural architectures, and autonomous agents.",
    "subdomain": "ai.codingclub.tech",
    "theme": { "accent": "#7C3AED", "darkAccent": "#A78BFA" }
  }
  ```
- **Content Consumption**:
  - Portals consume content directly from `content/verticals/<vertical-slug>/posts/*.md` via `gray-matter`.
  - Never hardcode mock posts; always use static filesystem helpers (`src/lib/posts.ts`).
  - Export `generateStaticParams` for SSG so all articles are pre-rendered as pure static HTML.

---

## 6. Main Portal Design & Flow (`apps/main-portal`)
The central hub connecting all 8 technical verticals, cross-vertical blog index (`/blog` and `/blog/[vertical]/[slug]`), upcoming events, and core team directory:
- **Aesthetic Identity**:
  - Retro-terminal accents (`ssn@codingclub:~$`), monospace command boxes, and blinking cursors (`_`).
  - Warm cream canvas (`#F9F6F0`), high-contrast ink typography, vibrant accent sticky notes, and polaroid cards.
  - Avoid generic corporate AI slop (no generic purple SaaS gradients or empty placeholder cards).
- **Navigation & Routing**:
  - `/`: Hero terminal, vertical sticky tabs, recent cross-vertical articles.
  - `/blog`: Filterable technical blog feed across all 8 verticals.
  - `/blog/[vertical]/[slug]`: Markdown article reader with author attestation.
  - `/verticals/[slug]`: Deep dive into specific technical vertical.

---

## 7. Editorial Review & Media Isolation Pipeline
- **No Direct Pushes to Main**:
  - Direct pushes to `main` are strictly forbidden for content.
  - Submissions create isolated draft branches: `draft/<vertical>/<slug>-<id>` and open Pull Requests.
- **Media Isolation**:
  - Mid-post images and cover banners are committed strictly to the **draft branch** under `apps/main-portal/public/uploads/` during post submission. Media NEVER touches `main` without review.
- **Review Quorums**:
  - Member post: 2 Deputy approvals OR 1 Vertical Head OR 1 Superadmin.
  - Deputy post: 1 Vertical Head OR 1 Superadmin.
  - Vertical Head post: 1 Superadmin.
  - Anti-Self-Review: Authors are strictly blocked from reviewing or merging their own articles (enforced by API and GitHub).

---

## 8. Vercel Build Shielding (Ignore Build Step)
- Changes affecting only documentation (`AGENTS.md`, `CLAUDE.md`, `README.md`, `*.md`), CI workflows, or non-app scripts MUST NOT trigger Vercel builds.
- This is enforced by `scripts/ignore-build-step.mjs` (forwarded via `apps/main-portal/scripts/ignore-build-step.mjs` and `apps/cms-studio/scripts/ignore-build-step.mjs`).
- Commits modifying only docs exit with code 0 in Vercel, consuming **0 build minutes**.

---

## 9. Brutal Honesty Protocol
- Never blindly agree with flawed architecture, broken logic, or invalid specifications.
- Directly critique and correct bugs and architectural holes before producing code.
- Only agree when the solution is objectively sound, robust, and verified. Never be a yes-man.

---

## 10. Naming Rule
- Strictly "Coding Club", "SSN Coding Club", or "CC". NEVER use "Apex".
