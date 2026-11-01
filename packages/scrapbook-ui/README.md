# Shared scrapbook sections

Projects (chart rolls), Events (calendar books), and Blogs (newspaper) are shared
by the main portal and all eight technical vertical apps. React components,
styles, and the current sample data live here so fixes apply everywhere.

`getVerticalContent` maps each canonical `portal.config.json` vertical slug to
its existing UI category. PR content stays administrative. The vertical navbar
contains Projects, Events and Blogs; its club identity link returns to the main
portal. Existing vertical `/posts/[slug]` pages and published article links stay
available under Blogs. The CMS/editorial workflow is unchanged.

Run isolation and completeness tests from the repository root:

```sh
pnpm --filter @coding-club/scrapbook-ui test
```

Apps declare this package with `workspace:*` and transpile it in `next.config.ts`.
Each app serves the small illustration assets from its own `public/posters` and
`public/event-posters` directories. Main-only home, People and Join Us stay in
`apps/main-portal`.

## Community sections

CP and Cybersecurity share the leaderboard and Resource Room; AI / ML also uses
the Resource Room, and SSN Hacks uses the Hall of Fame. `verticalTabs` controls
the matching navbar entries. Resource bookmarks remain local to each vertical.

Hall of Fame accepts `entries: Achievement[]`, including portrait image URLs,
optional crop positions, names, results, event details and years. Text remains
live and independent of the reusable frame images. Current rankings and awards
are presentation data, ready to replace with reviewed club records.

Photographic cabinet and award assets live in each consuming app's
`public/images/community` directory. They were generated for this UI; the
portrait images remain replaceable. The entry and exit timelines respect
reduced-motion preferences.
