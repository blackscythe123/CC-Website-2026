# 🚀 Coding Club CMS & Blog Platform

A modern, lightweight, **zero-database** content platform built with **Next.js (App Router)** and **[Decap CMS](https://github.com/decaporg/decap-cms)**.

Empowers non-technical club members to write and publish blog posts and workshops through a visual CMS interface. Every published article is committed directly to your **GitHub** repository as clean Markdown, which triggers instant automated builds on **Vercel**.

---

## 💡 How It Works (The Git-Based Architecture)

```
+-----------------------------------------------------------+
| 1. Non-Technical Member                                   |
|    Visits https://your-site.vercel.app/admin              |
|    Clicks "Login with GitHub" & writes in visual editor   |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 2. Next.js OAuth Bridge (/api/auth & /api/callback)       |
|    Securely authenticates using GitHub OAuth keys         |
|    stored in Vercel environment variables                 |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 3. Decap CMS Commits to GitHub                            |
|    Saves Markdown to `content/posts/<post-slug>.md`       |
|    Saves uploaded images to `public/images/uploads/`      |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 4. Vercel Auto-Deployment                                 |
|    Vercel detects git push, builds static pages,          |
|    and publishes the new blog post worldwide in seconds   |
+-----------------------------------------------------------+
```

- **Zero SQL / PostgreSQL Databases:** No database hosting costs, no migrations, no backups needed.
- **Full Version History:** Every blog post and update is safely versioned in your Git history.
- **Blazing Fast:** Content is rendered into static HTML with Next.js and cached globally.

---

## 🛠️ Quick Start (Local Development)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Locally with Local CMS Proxy
You can test writing articles locally **without even setting up GitHub OAuth keys** by running the local proxy:

In **Terminal 1** (Next.js web app):
```bash
pnpm dev
```

In **Terminal 2** (Decap local Git proxy):
```bash
pnpm cms
```

- Open `http://localhost:3000` to view the website.
- Open `http://localhost:3000/admin` to access the CMS Studio.
- In local mode, you can immediately write, edit, and publish posts—they will be saved directly into your local `content/posts/` folder!

---

## 🌐 Deploying to Vercel with GitHub

Follow these simple steps to deploy and let your team publish live:

### Step 1: Push Code to Your GitHub Repository
1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "feat: initial coding club cms setup"
   ```
2. Create a new repository on GitHub (e.g. `coding-club-cms`) and push your code:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO>.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Update `public/admin/config.yml`
Open [public/admin/config.yml](file:///C:/projects/coding-club-cms/public/admin/config.yml) and update your repository name:
```yaml
backend:
  name: github
  repo: <YOUR-USERNAME>/<YOUR-REPO> # e.g. "acme-club/coding-club-cms"
  branch: main
  auth_endpoint: api/auth
```
Commit and push this change to GitHub.

### Step 3: Create a GitHub OAuth App
1. Go to your GitHub account: **Settings** -> **Developer Settings** -> **OAuth Apps** -> **[New OAuth App](https://github.com/settings/applications/new)**.
2. Fill out the form:
   - **Application name:** `Coding Club CMS`
   - **Homepage URL:** `https://your-project.vercel.app` (your Vercel site URL)
   - **Authorization callback URL:** `https://your-project.vercel.app/api/callback`
3. Click **Register application**.
4. Click **Generate a new client secret**.
5. Keep note of your **Client ID** and **Client Secret**.

### Step 4: Deploy on Vercel
1. Go to [Vercel](https://vercel.com) and click **Add New...** -> **Project**.
2. Import your GitHub repository.
3. In the **Environment Variables** section, add:
   - `OAUTH_GITHUB_CLIENT_ID` = `<Your GitHub OAuth Client ID>`
   - `OAUTH_GITHUB_CLIENT_SECRET` = `<Your GitHub OAuth Client Secret>`
4. Click **Deploy**.

---

## 👥 How Non-Technical Members Use It

1. Give the member **Collaborator** (or Write) access to your GitHub repository.
2. The member visits `https://your-project.vercel.app/admin`.
3. They click **Login with GitHub** and authorize.
4. They can now:
   - Click **Blog Posts** -> **New Blog Post**.
   - Type the title, write content in the rich-text editor, and drag & drop images.
   - Click **Publish**.
5. Within 1-2 minutes, Vercel will rebuild and the post will appear live on `/blog`!

---

## 📁 Project Structure

```
coding-club-cms/
├── content/
│   ├── posts/              # Markdown blog posts (.md)
│   ├── events/             # Event announcements (.md)
│   └── settings/           # Club metadata (club.json)
├── public/
│   ├── admin/
│   │   ├── config.yml      # Decap CMS collections & GitHub config
│   │   └── index.html      # Decap CMS admin interface
│   └── images/uploads/     # Uploaded images from CMS
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/       # OAuth redirection handler
│   │   │   └── callback/   # GitHub OAuth code-to-token exchanger
│   │   ├── blog/           # Blog listing & dynamic article reader
│   │   ├── events/         # Events listing page
│   │   ├── layout.tsx      # Main layout with header & footer
│   │   └── page.tsx        # Modern club landing page
│   ├── components/         # Navbar, Footer UI components
│   └── lib/                # Gray-matter markdown parsers
├── .env.example            # Environment variables template
├── pnpm-workspace.yaml     # Package configuration
└── package.json
```

---

## 📜 Available Scripts

- `pnpm dev` - Start Next.js development server at `http://localhost:3000`
- `pnpm cms` - Start Decap local Git proxy server at `http://localhost:8082`
- `pnpm build` - Compile optimized production build
- `pnpm start` - Run production server
