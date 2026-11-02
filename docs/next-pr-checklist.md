# Next PR checklist — changes after PR #17

PR #17 has merged. This checklist includes the previously unpushed roadmap commit and the subsequent approved Scroll12 improvements. No new PR has been opened yet.

## Completed

- [x] **3D roadmap concepts:** Built Paper Highway, Learning Archipelago, and Desk Railway in the website palette; retained all three on `/roadmap-lab` for future use.
- [x] **CP roadmap:** Integrated Paper Highway with programming foundations, arrays/strings, searching/sorting, graphs/greedy methods, and dynamic programming.
- [x] **AI/ML roadmap:** Integrated Learning Archipelago with Python/maths, data exploration, learning models, neural networks, and specialisation.
- [x] **Topic stops:** Briefly pause at new topics and offer Explore topic or Explore more topics; scrolling also continues the journey.
- [x] **Topic details:** Added vertical-specific learning summaries, prerequisites, and practice tasks; pause travel while a topic panel is open.
- [x] **Navigation:** Added Roadmap tabs to CP and AI/ML while retaining deployment-specific portal links.
- [x] **Stable vertical entry:** Removed community-section global scroll refreshes and temporary arrival positioning; checked all eight technical verticals for unwanted section jumps.
- [x] **WebGL clarity:** Track container size, render up to 2x pixel density, and reduce excessive fog/haze.
- [x] **Responsive performance:** Added phone layouts and continuation controls, reduced-motion handling, and suspended offscreen 3D rendering.

- [x] **Scroll assemblies:** Resources, leaderboard, and Hall of Fame assemble with scroll progress, hold fully assembled, and visibly reverse on exit from either direction; navbar clicks replay assembly.
- [x] **Arrival continuity:** Preserve the completed Projects heading during the sticky-note preview-to-page handoff and mount its shadow content before paint.
- [x] **Mobile Hall of Fame:** Preserve native frame proportions, align awards to phone shelves, and show team photos in separate uncropped cells.
- [x] **Mobile resources:** Widen the cabinet, compact resource cards, and show two or three cards according to available phone height.
- [x] **Mobile roadmaps:** Shorten the scroll journey, fill the usable viewport, and reduce the topic panel's size and opacity.
- [x] **Blog stamps:** Remove the stray black rule overlapping vertical category labels throughout the site.
- [x] **Home terminal:** Keep the plain prompt below the shortcut list, make it fit on phone and laptop, and align the content with the photographed laptop screen.
- [x] **Image delivery:** Use high-quality WebP assets, responsive phone variants, lazy artwork loading, asynchronous decoding, and a prioritized home background.
- [x] **Image resilience:** Retain original masters outside deployed assets, defer the shelf background, and show fallback borders if decorative artwork fails.

- [x] **Flying-card text:** Preserve computed responsive typography and layout on animation copies so text never briefly enlarges beyond the card during drawer entry or exchange; checked at 320, 390, 768, and 1440px widths.

- [x] **Production navigation:** Main sticky notes and vertical links use the supplied Vercel deployments; vertical back links return to the production main portal, and CMS links use the production Studio.

- [x] **Club roadmap:** Added the saved 3D Desk Railway to the main page after People, with website launch goals, future release directions, release-stage/scope details, continuation controls, and navbar/terminal access. Updated Scroll12 to match.

## Validation context

Scroll12 production build passed. Desktop and phone layouts, arrival continuity, reversible assemblies, and roadmap continuation were checked locally. A local proxy tested cold loading at 1.6 Mbps with 150ms added latency and disabled cache; a separate failure test returned HTTP 503 for decorative artwork. Phones selected smaller assets, and failed artwork retained readable names/photos without broken-image icons. Third-party portrait/font services were outside the proxy; physical-device and production-CDN performance are not confirmed.

Repository component tests (10), content validation (20 files), and all app TypeScript checks passed. The current monorepo production build stopped at the existing Next.js SecurityFatalError in the vertical portal template; a complete repository production build is not confirmed. Recheck before opening the next PR. Leaderboard scores and award records remain presentation data; CP and AI/ML roadmap topics are introductory content rather than a connected curriculum/CMS collection; the club roadmap describes proposed website goals without fixed release dates.
