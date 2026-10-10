# 🚀 Coding Club Monorepo (10 Verticals & Centralized CMS)

A modern, **zero-database**, multi-tenant content management system and community portal for **Coding Club (CC)**.

Structured as a **pnpm Monorepo** containing two decoupled Next.js projects:
1. **`apps/main-portal`**: The consumer-facing website with the main Coding Club homepage, an interactive 10-vertical showcase, a single reusable dynamic vertical UI page (`/verticals/[slug]`), and cross-vertical blog feeds.
2. **`apps/cms-studio`**: The centralized editorial studio powered by **Decap CMS** with a **role-based GitHub Approval Workflow** (`publish_mode: editorial_workflow`).

---

## 🏛️ System Architecture

```
                                  [ Non-Technical Club Member ]
                                                │
                                                │ (Writes article in /admin)
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  apps/cms-studio (cms.domain.com)                                                      │
│  - Decap CMS Editorial Workflow (Draft ➔ In Review ➔ Ready to Publish)                 │
│  - Built-in Next.js OAuth Bridge (/api/auth & /api/callback)                           │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ (Creates Git PR / Merges on Approval)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  GitHub Repository (Single Source of Truth)                                            │
│  content/                                                                              │
│  ├── club/                  (Club-wide announcements & core events)                    │
│  └── verticals/             (10 autonomous technical verticals)                        │
│      ├── ai-ml/             ├── competitive-programming/  ├── blockchain/              │
│      ├── web-dev/           ├── mobile-dev/               ├── iot-embedded/            │
│      ├── cybersecurity/     ├── ui-ux/                    └── game-dev/                │
│      └── cloud-devops/                                                                 │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ (Merge triggers automated Vercel rebuild)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  apps/main-portal (domain.com)                                                         │
│  - Club Homepage: 10 Verticals Showcase Grid + Cross-Vertical Blog Feed                │
│  - Single Dynamic Page Template: /verticals/[slug] (Renders ANY of the 10 verticals!)  │
│  - Dynamic Article Reader: /blog/[vertical]/[slug]                                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Vercel Deployment Guide

Because this is a monorepo, you will deploy **two projects** from your single GitHub repository into Vercel.

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "feat: complete 10 verticals monorepo with editorial workflow"
git push origin main
```

### Step 2: Create Your GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) ➔ **OAuth Apps** ➔ **[New OAuth App](https://github.com/settings/applications/new)**.
2. Fill in:
   - **Application name:** `SSN Coding Club CMS`
   - **Homepage URL:** `https://<YOUR-CMS-VERCEL-DOMAIN>.vercel.app`
   - **Authorization callback URL:** `https://<YOUR-CMS-VERCEL-DOMAIN>.vercel.app/api/callback`
   - **Allow wildcard matching:** Checked
   - **Expire user access tokens:** ❌ **Unchecked**
3. Click **Register application**.
4. Click **Generate a new client secret**.
5. Save your **Client ID** and **Client Secret**.

### Step 3: Deploy Project 1 on Vercel — CMS Studio (`apps/cms-studio`)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) ➔ Click **Add New...** ➔ **Project**.
2. Select your repository `blackscythe123/CC-Website-2026`.
3. In **Root Directory**, click **Edit** and select:
   ```
   apps/cms-studio
   ```
4. In **Environment Variables**, add:
   - `OAUTH_GITHUB_CLIENT_ID` = `<Your GitHub Client ID>`
   - `OAUTH_GITHUB_CLIENT_SECRET` = `<Your GitHub Client Secret>`
5. Click **Deploy**.

---

### Step 4: Deploy Project 2 on Vercel — Main Portal (`apps/main-portal`)

1. Go back to Vercel Dashboard ➔ Click **Add New...** ➔ **Project**.
2. Select the same repository `blackscythe123/CC-Website-2026`.
3. In **Root Directory**, click **Edit** and select:
   ```
   apps/main-portal
   ```
4. Framework Preset will auto-detect **Next.js**. No special environment variables are needed for the public portal!
5. Click **Deploy**.

---

## 👥 How the Editorial Approval Workflow Operates

1. **Member Creates Draft:**
   - Any club member visits `https://<your-cms-domain>.vercel.app/admin`.
   - Clicks on their vertical collection (e.g. `🤖 1. AI & Machine Learning`).
   - Writes the title, author name, and markdown content.
   - Clicks **Save**. Decap CMS saves this as a **Draft**, which automatically opens a Git branch and Pull Request on GitHub.
2. **Vertical Head Reviews:**
   - The Vertical Head goes to the **Workflow** tab at the top of the CMS Studio.
   - They see columns: **Drafts** | **In Review** | **Ready to Publish**.
   - They inspect the article preview, move it to "In Review", make edits if needed, and move it to "Ready".
3. **Publishing Live:**
   - The lead clicks **Publish**.
   - Decap CMS automatically merges the Pull Request into `main`!
   - Vercel detects the merge to `main`, rebuilds `apps/main-portal` in ~30 seconds, and the article is live globally!

---

## 📁 Repository Structure

```
coding-club-cms/
├── pnpm-workspace.yaml             # Monorepo workspace configuration
├── package.json                    # Workspace root scripts
│
├── content/                        # SINGLE SOURCE OF TRUTH (Tracked in Git)
│   ├── club/                       # Club-wide announcements & events
│   └── verticals/                  # 10 Autonomous Verticals
│       ├── ai-ml/                  # metadata.json + posts/
│       ├── web-dev/                # metadata.json + posts/
│       ├── cybersecurity/          # metadata.json + posts/
│       ├── cloud-devops/           # metadata.json + posts/
│       ├── competitive-programming/# metadata.json + posts/
│       ├── mobile-dev/             # metadata.json + posts/
│       ├── ui-ux/                  # metadata.json + posts/
│       ├── blockchain/             # metadata.json + posts/
│       ├── iot-embedded/           # metadata.json + posts/
│       └── game-dev/               # metadata.json + posts/
│
└── apps/
    ├── cms-studio/                 # PROJECT 1: Centralized CMS Dashboard (/admin)
    │   ├── public/admin/
    │   │   ├── config.yml          # Decap CMS collections + editorial_workflow
    │   │   └── index.html          # Decap CMS SPA loader
    │   └── src/app/api/
    │       ├── auth/route.ts       # GitHub OAuth redirect
    │       └── callback/route.ts   # GitHub OAuth code-to-token exchanger
    │
    └── main-portal/                # PROJECT 2: Public Consumer Portal
        ├── src/app/
        │   ├── page.tsx            # Main Homepage (10 Verticals Grid)
        │   ├── verticals/[slug]/   # THE SINGLE DYNAMIC VERTICAL UI PAGE
        │   └── blog/               # Cross-vertical master feed & dynamic post reader
        └── src/lib/                # Verticals and markdown content loaders
```
