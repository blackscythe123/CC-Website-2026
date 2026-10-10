---
title: "How Our Git-Powered Decap CMS Works"
date: "2026-10-10"
author: "Tech Team"
summary: "An overview of how non-tech club members can write articles in the browser without databases, storing everything right inside Git."
coverImage: ""
tags:
  - "Decap CMS"
  - "Next.js"
  - "GitHub"
---

Many modern blogs require complex database setups like PostgreSQL or external CMS subscriptions. But for a Coding Club, storing content as Markdown in **Git version control** provides incredible superpowers:

1. **Complete History**: Every edit is tracked in Git with commit messages and diffs.
2. **Zero Database Maintenance**: No SQL databases to keep alive, back up, or scale.
3. **Free & Fast Hosting**: Static pages are rendered with Next.js and distributed worldwide on Vercel's Edge Network.
4. **Intuitive UI for Non-Tech Members**: Writers do not need to use the terminal or Git commands. They just visit `/admin`, write in a clean visual editor, and click **Publish**.

### The OAuth Handshake Flow
When you click **Login with GitHub** in `/admin`:
1. The admin panel opens a popup to `/api/auth`.
2. Our serverless route redirects you to GitHub OAuth.
3. Once authorized, GitHub redirects back to `/api/callback` with a secure code.
4. Next.js exchanges the code with GitHub for a token and passes it back to Decap CMS via `postMessage`.
5. Decap CMS now has permission to commit new articles directly to the GitHub repo!

It's that simple and completely self-contained.
