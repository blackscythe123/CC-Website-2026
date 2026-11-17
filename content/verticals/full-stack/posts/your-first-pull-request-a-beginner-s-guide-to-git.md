---
title: 'Your first pull request: a beginner''s guide to Git'
date: '2026-11-08'
author: 'simiyon '
authorUsername: blackscythe123
authorAvatar: 'https://github.com/blackscythe123.png'
summary: ''
targetPortals:
  - full-stack-portal
  - main-portal
vertical: full-stack
coverImage: 'blob:https://cc-cms-studio.vercel.app/b327d8cc-6b93-4cc2-a206-384ddd819a9d'
tags:
  - git
---
Every article on this portal, every fix to the website and every project in our showcase starts the same way: as a pull request. If you have never opened one, this guide takes you from zero to your first merged change in about twenty minutes.

## What Git actually does

Git keeps a history of your project. Each **commit** is a saved snapshot with a message that says what changed and why. A **branch** is your own line of work, so you can experiment without touching the main project. A **pull request** asks the maintainers to bring your branch into `main`.

> Think of `main` as the published book, a branch as your draft chapter, and a pull request as handing the draft to an editor.

## Set up once

1. Install Git from git-scm.com and create a GitHub account.
2. Tell Git who you are:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

3. Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/<your-username>/<repo>.git
cd <repo>
```

## Make your change

Create a branch named after what you are doing:

```bash
git switch -c fix/typo-in-readme
```

Edit the files, then check what changed and save a snapshot:

```bash
git status
git add README.md
git commit -m "Fix typo in the setup section"
git push -u origin fix/typo-in-readme
```

## Open the pull request

GitHub shows a **Compare & pull request** button after you push. In the description, write:

- **What** you changed
- **Why** it was needed
- **How** a reviewer can check it

Keep it small. A pull request that changes one thing gets reviewed in minutes; one that changes twenty things waits for days.

## When a reviewer asks for changes

That is normal, not a rejection. Make the edits on the same branch, commit and push again. The pull request updates itself.

```bash
git add .
git commit -m "Address review: clarify install step"
git push
```

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Committing straight to `main` | Always `git switch -c <branch>` first |
| Vague messages like "update" | Say what changed: "Add dark mode toggle" |
| Huge pull requests | Split them into one idea each |
| Forgetting to pull | Run `git pull` before starting new work |

## Your turn

Pick any open issue labelled `good first issue` on the club repository, open a pull request, and tag a deputy for review. Your first merged PR gets a shout-out in the next club update.
