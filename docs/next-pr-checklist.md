# Next PR checklist — changes after 730d808

Prepared for the next PR. PR #17 remains unchanged; these changes are committed locally only.

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

## Validation context

Scroll12 production build passed. All eight technical sticky-note arrivals were sampled frame by frame without incorrect section jumps. Roadmap panels and continuation controls were checked in desktop and phone viewports; physical-phone performance is not yet verified.

Repository checks: 10 shared-component tests passed, content validation passed for 20 files, and all app TypeScript checks passed. The production build stopped at the existing Next.js SecurityFatalError in the vertical portal template; a full production build is not confirmed. Recheck before opening the next PR. Current leaderboard scores and award records remain presentation data. Roadmap topic content is introductory authored content, not a complete curriculum or connected CMS resource collection.
