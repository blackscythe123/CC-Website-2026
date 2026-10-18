# 📜 SSN Coding Club Architecture & Engineering Guidelines

This document serves as the single source of truth for all human developers, vertical heads, and AI engineering assistants contributing to the **SSN Coding Club (CC)** monorepo.

---

## 🏛️ 1. Core Architectural Tenets

1. **Zero Database Rule (Absolute Constraint)**:
   - There is **NO external database** (no Postgres, MongoDB, Prisma, Supabase, or Firebase).
   - Git is the single source of truth for all content, roles, portals, and media.
   - All article drafts, editorial approvals, role permissions, and asset uploads are executed through Git trees, commits, branches, and Pull Requests via the GitHub Octokit API.
   - Local drafts and unsaved edits live inside browser client **IndexedDB** (`CodingClubCMS`) to guarantee crash and power-loss recovery without requiring backend storage.

2. **Autonomous Engineering Verticals**:
   - The club is organized into **8 official technical engineering wings**:
     1. `ai-ml`: **AI / ML** (`ai.codingclub.tech`)
     2. `ar-vr-game-dev`: **AR, VR & Game Dev** (`arvr.codingclub.tech`)
     3. `competitive-programming`: **Competitive Programming** (`cp.codingclub.tech`)
     4. `cybersecurity`: **Cyber Security** (`cybersecurity.codingclub.tech`)
     5. `ssnhacks`: **SSN Hacks** (`hacks.codingclub.tech`)
     6. `design-ui-ux`: **Design & UI/UX** (`design.codingclub.tech`)
     7. `full-stack`: **Full Stack** (`web.codingclub.tech`)
     8. `open-source`: **Open Source (OSS)** (`oss.codingclub.tech`)
   - Administrative wings (`Office Bearers`, `PR`) are strictly non-technical and do not have vertical article partitions.
   - Club-wide announcements exist under the root `club` partition (`content/club/posts/[slug].md`).

3. **Subdomain Project Architecture & Production Transition**:
   - Each vertical will eventually operate as its own independent subdomain web application (e.g., `web.codingclub.tech`, `hacks.codingclub.tech`).
   - The monorepo provides a clean, standardized Black & White starter template at `apps/vertical-portal-template`.
   - Any new vertical web application in `apps/` must inherit `portal.config.json` and consume content from `content/verticals/[vertical-slug]/posts`.
   - **Production Migration Rule:** Temporary domain entries in `content/club/portals.json` must be updated to their final production DNS records once designated vertical teams deploy their subdomain web applications.

---

## 🛡️ 2. Multi-Tier Governance & Editorial Pipeline

| Role | Permissions & Authority | Editorial Quorum Required to Merge Post |
|---|---|---|
| **Superadmin** | Global club governance. Full access to write for all wings, publish club-wide announcements, review and merge PRs across all verticals, manage roles in `roles.json` / `CODEOWNERS`. Self-approval is strictly forbidden (another superadmin must review). | Another Superadmin review |
| **Vertical Head** | Sovereign authority over assigned vertical(s). Authorized to draft, review, request changes, and merge PRs within their specific vertical. Can appoint Deputies and Members in their vertical. Strictly 1 Head per vertical. | Superadmin review |
| **Deputy** | Second-in-command for assigned vertical(s). Authorized to review Member articles and manage assigned vertical content. Can appoint Members in their vertical. | 1 Vertical Head OR 1 Superadmin |
| **Member** | Technical club member. Can draft articles for their assigned vertical via CMS Studio. Articles are automatically staged onto draft Git branches (`draft/[vertical]/[slug]-[id]`) and submitted as PRs for review. | 2 Deputy approvals OR 1 Vertical Head OR 1 Superadmin |

---

## 🔒 3. Anti-Bypass & Security Rules

1. **No Direct Pushes to Main**:
   - CMS Studio creates feature draft branches (`draft/[vertical]/[slug]-[id]`) and opens Pull Requests.
   - Direct merges or direct media uploads to `main` are strictly forbidden for content.
2. **Strict Anti-Self-Review**:
   - Authors can NEVER approve or merge their own articles under any role (enforced at API route level and natively blocked by GitHub on `github.com`).
3. **Anti-IDOR Verification**:
   - The review and draft APIs never trust client-supplied metadata. The server parses the real PR markdown file, author ownership, and branch ref directly from GitHub before authorizing revisions or approvals.
4. **Media Deferred Upload & Draft Isolation**:
   - Images inserted in CMS Studio remain in browser memory / IndexedDB until final submission.
   - Upon draft submission, images are committed to `apps/main-portal/public/uploads/` on the **isolated draft branch**, never touching `main` without formal review.
5. **Vercel Build Shielding (`ignore-build-step.mjs`)**:
   - Documentation updates (`AGENTS.md`, `CLAUDE.md`, `README.md`, `*.md`), CI configurations, and administrative scripts are filtered by `scripts/ignore-build-step.mjs`.
   - Modifying documentation files exits with code 0 in Vercel, consuming **0 build minutes** and skipping deployment entirely.

---

## 💻 4. Code & Commit Standards

- **Commit Messages**: Single-line format `<tag>: <short message>` under 25 words. Real human co-authors permitted via `Co-authored-by: Name <actual_email>` (real personal/institutional emails only; no-reply and bot emails forbidden). Zero AI trailers or attribution.
- **Naming Convention**: Strictly "Coding Club", "SSN Coding Club", or "CC". Never use "Apex".
- **CI Validation**: Always run `pnpm run test:content` to verify schema, kebab-case slugs, portal mappings, and frontmatter.
- **Monorepo Build Integrity**: Always verify with `pnpm -r build` before pushing structural changes.
