# Main portal

The scrolling scrapbook UI from `ssn-coding-club-scroll12` lives in this app.
The original UI folder is kept separately and is not modified by this integration.

## Run

From the repository root, use pnpm 10:

```sh
pnpm install --frozen-lockfile
pnpm dev:portal
```

The portal runs at http://localhost:3000. Production validation:

```sh
pnpm build:portal
pnpm test:content
```

## Current integration scope

- Home, Verticals, Projects, Events, Blogs, People and Join Us retain the existing
  UI, animations, social links and responsive layouts.
- The eight technical sticky notes link to the deployed apps registered in
  `content/club/portals.json`. UI aliases `ar-vr` and `design` resolve to the
  canonical `ar-vr-game-dev` and `design-ui-ux` slugs.
- PR remains an administrative note and links to the People section.
- The newspaper and other scrapbook sections currently use the UI's sample data
  under `src/data`. They are not connected to the CMS or a new backend yet.
- Existing `/blog` and `/blog/[vertical]/[slug]` routes, CMS content helpers,
  `/admin` redirects, and all other portal apps remain available.
- The rejected opening experiments are not included.

## Later integration

Replace the sample-data adapters with repository content in a separate change.
The existing CMS publishes through Git and review PRs; this UI migration does not
change its authentication, editorial workflow, data storage or configuration.

## Vercel

Keep this project's Root Directory set to `apps/main-portal`. Use the repository's
pnpm workspace and existing build configuration. No new environment variables
are required for this UI-only integration. Subdomain deployment and DNS still
need to match the portal registry.

## Shared vertical sections

The Projects, Events and Blogs implementations and current sample data now live
in `packages/scrapbook-ui`; the main portal re-exports them to preserve its
existing imports. All eight vertical apps use the same components with category
filtering from their canonical `portal.config.json` identities. Their local
navbar contains only Projects, Events and Blogs. Existing published CMS articles
remain linked under Blogs; their reader routes are unchanged.

## Reviewed About and vertical navigation interactions

About sits between the laptop and Verticals. Its envelope arrival, unfolding,
full-letter pen reveal and departure follow scrolling in both directions.
Reduced motion shows the complete readable letter without the animated pen.
The About copy is draft UI copy for later editorial replacement.

Technical sticky notes tear open to reveal their filtered shared UI before
navigating to their deployed portal URL from `content/club/portals.json`.
The local demo's localhost-only routes are not substituted for production
portal destinations. PR continues to navigate to People. Modified clicks and
opening links in a new tab retain native link behavior.
