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
