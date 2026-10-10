---
title: How to Make Your First Open Source Contribution
date: 2026-10-10
author: OSS Team
summary: A comprehensive step-by-step roadmap to finding beginner-friendly issues, navigating large codebases, and submitting clean pull requests.
vertical: open-source
targetPortals:
  - main-portal
  - oss-portal
tags:
  - open-source
  - git
  - gsoc
---

# How to Make Your First Open Source Contribution

Contributing to open source software (OSS) is one of the most rewarding ways to grow as an engineer. You learn production coding conventions, collaborate across timezones, and write software used by millions.

## 1. Finding Good First Issues

Don't start by trying to rewrite the Linux kernel or React compiler. Start with:

- Documentation fixes and code example clarifications.
- Issues tagged `good first issue` or `help wanted`.
- Tooling you already use daily (CLI tools, small libraries, linters).

## 2. Forking and Local Setup

1. Fork the upstream repository to your GitHub account.
2. Clone your fork locally and configure the original repo as `upstream`:
   ```bash
   git remote add upstream https://github.com/original-owner/repo.git
   ```
3. Always create an isolated feature branch for every pull request:
   ```bash
   git checkout -b fix/issue-description
   ```

## 3. Submitting the PR

- Keep commits atomic and descriptive.
- Ensure all CI tests pass locally before opening the PR.
- Write a clear PR description explaining what was changed and linking the related issue.

Welcome to the world of open source!
