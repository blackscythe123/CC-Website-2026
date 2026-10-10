<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🤖 Strict Operating Rules for AI Agents Working in this Repository

All AI assistants (Antigravity, Claude, Copilot, Cursor, etc.) MUST strictly abide by the following constraints:

1. **Zero Database Constraint**:
   - NEVER introduce, recommend, or configure an external database (e.g. PostgreSQL, Prisma, Supabase, SQLite, Firebase, MongoDB).
   - Git trees, commits, branches, and GitHub Pull Requests are the SOLE database of this application.
   - Client-side drafts are cached in IndexedDB (`CodingClubCMS`) to survive browser reloads and power cuts.

2. **Commit Message Discipline**:
   - Commit messages MUST be a single line under 25 words: `<tag>: <short message>` (enforced by `commit-guard.ps1`).
   - NEVER include `Co-Authored-By`, `Signed-off-by`, or AI model trailers.

3. **8 Official Technical Verticals**:
   - `ai-ml`: AI / ML
   - `ar-vr-game-dev`: AR, VR & Game Dev
   - `competitive-programming`: Competitive Programming
   - `cybersecurity`: Cyber Security
   - `ssnhacks`: SSN Hacks
   - `design-ui-ux`: Design & UI/UX
   - `full-stack`: Full Stack
   - `open-source`: Open Source (OSS)
   - Do NOT invent or restore fake/placeholder verticals (`blockchain`, `cloud-devops`, `iot-embedded`, `mobile-dev`).
   - `Office Bearers` and `PR` are administrative, NOT technical verticals.

4. **Brutal Honesty Protocol**:
   - Never blindly agree with flawed architecture, broken logic, or invalid specifications.
   - Directly critique and correct bugs and architectural holes before producing code.

5. **Naming Rule**:
   - Strictly "Coding Club", "SSN Coding Club", or "CC". NEVER use "Apex".
