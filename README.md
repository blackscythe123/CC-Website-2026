# 🚀 SSN Coding Club Monorepo (8 Technical Verticals & Centralized CMS)

A modern, **zero-database**, multi-tenant content management system and community portal ecosystem for **SSN Coding Club (CC)**.

Structured as a **pnpm Monorepo** containing decoupled Next.js projects:
1. **`apps/main-portal`**: The central community portal (`codingclub.tech`) with retro-notebook UI, interactive vertical showcase, and cross-vertical blog feeds.
2. **`apps/cms-studio`**: The centralized editorial studio (`ssn-coding-club-cms.vercel.app`) with Medium-style canvas editor, IndexedDB power-loss crash recovery, and multi-tier GitHub PR approval workflows.
3. **`apps/vertical-portal-template`**: Standardized, high-contrast monochrome (Black & White) Next.js starter template for vertical subdomain project websites.

---

## 🏛️ System Architecture

```
                                  [ Technical Club Member ]
                                              │
                                              │ (Writes article in /admin Canvas Editor)
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  apps/cms-studio (cms.domain.com)                                                      │
│  - Medium-Style Live Canvas Editor with Instant Split-Screen Preview                   │
│  - Native IndexedDB Auto-Save & Manual Save (Zero-Database Power-Loss Recovery)        │
│  - Deferred Media Staging (Images committed only to Draft Branches, never to main)    │
│  - In-App Editorial Notifications & Changes Requested Feedback Loops                   │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ (Creates Git PR / Merges on Approval)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  GitHub Repository (Single Source of Truth)                                            │
│  content/                                                                              │
│  ├── club/                  (Club-wide announcements & core events)                    │
│  └── verticals/             (8 autonomous technical engineering verticals)             │
│      ├── ai-ml/                  ├── ssnhacks/                                         │
│      ├── ar-vr-game-dev/         ├── design-ui-ux/                                     │
│      ├── competitive-programming/├── full-stack/                                       │
│      └── cybersecurity/          └── open-source/                                      │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ (Triggers Vercel Deployments)
                                        ▼
┌───────────────────────────────────────┬────────────────────────────────────────────────┐
│  apps/main-portal (codingclub.tech)   │  Subdomain Projects (e.g. hacks.codingclub.tech)│
│  - Dynamic /verticals/[slug] Showcase │  - Inherits apps/vertical-portal-template      │
│  - Cross-Vertical Blog Feed (/blog)   │  - Monochrome high-contrast reading experience │
│  - Official Club Announcements        │  - Consumes targeted vertical posts directly   │
└───────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## 🎯 Official Technical Verticals (8 Wings)

| Slug | Display Name | Subdomain Portal | Description |
|---|---|---|---|
| `ai-ml` | **AI / ML** | `ai.codingclub.tech` | Neural networks, generative models, and agentic workflows. |
| `ar-vr-game-dev` | **AR, VR & Game Dev** | `arvr.codingclub.tech` | Godot, Unity, spatial computing, and interactive 3D engines. |
| `competitive-programming` | **Competitive Programming** | `cp.codingclub.tech` | ICPC prep, DP patterns, graph theory, and contest algorithms. |
| `cybersecurity` | **Cyber Security** | `cybersecurity.codingclub.tech` | CTFs, reverse engineering, web security, and binary exploitation. |
| `ssnhacks` | **SSN Hacks** | `hacks.codingclub.tech` | Flagship hackathons, rapid prototyping, and 24-hour sprints. |
| `design-ui-ux` | **Design & UI/UX** | `design.codingclub.tech` | User research, interaction design, and scalable Figma systems. |
| `full-stack` | **Full Stack** | `web.codingclub.tech` | Modern web platforms, distributed systems, APIs, and Next.js. |
| `open-source` | **Open Source (OSS)** | `oss.codingclub.tech` | Git workflows, public repositories, and GSoC preparation. |

> **Note on Administrative Wings:** `Office Bearers` and `PR` are management/admin units and do not maintain technical vertical feeds. Root announcements live in `content/club/posts`.

---

## 🌐 Subdomain Portals & Production Transition Guide

All temporary subdomains in `content/club/portals.json` map to autonomous vertical web projects.

### How to Deploy a Vertical Subdomain Website:
1. Clone or copy `apps/vertical-portal-template` to `apps/[vertical-name]-portal`.
2. Update `portal.config.json` with the vertical's assigned slug, name, and domain.
3. Deploy to Vercel with Root Directory set to `apps/[vertical-name]-portal`.
4. Point DNS CNAME to Vercel for that subdomain (e.g., `hacks.codingclub.tech`).
5. Update `content/club/portals.json` with final production DNS endpoints.

---

## 🛠️ Content Validation Suite

Verify all content files, kebab-case slugs, portal routes, and frontmatter schemas:

```bash
pnpm run test:content
```
