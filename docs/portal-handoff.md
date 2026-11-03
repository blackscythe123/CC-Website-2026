# Sticky-note portal handoff

A regular sticky-note click lifts the selected note to the centre while the other notes remain visible under a translucent veil. After a short centring animation, the veil becomes opaque and navigation opens the production portal with `?from=sticky-note#section-projects`. The source never renders a Projects preview. The destination begins at the same centred note pose, then tears it open over the real Projects section. Modifier-clicks keep normal link behavior. Hover/focus/click preconnects to the selected production origin.

All eight verticals use the same destination-side `VerticalArrival` component. A small head bootstrap marks an incoming sticky-note visit before the first HTML paint, so the real portal loads behind the note. The note tears open after the live Projects ShadowRoot is available. The animation does not navigate or replace Projects; it only removes the cover and cleans the arrival query with `history.replaceState`.

Reduced-motion visits skip the tear. Refreshes return to Projects without replaying the handoff. Escape skips the cover, and short readiness / bootstrap fallbacks ensure a failed animation cannot leave the page locked. The source resets its busy state when restored from browser history. Scroll12 uses the same reveal with its local client-side vertical routes.

Deploy the main portal and all eight vertical portals to enable both sides of the production handoff. Production URLs are unchanged.

## Return and refresh routing

Before departure, the source history entry is set to `/#section-verticals`. Returning via browser history clears both the note click lock and departure animation state, including cached client-side returns and document restoration. Native URL changes use Next’s history integration without passing private router state; they run after hydration so the router and address bar remain synchronized.

A real document reload is consumed once across the homepage and vertical routes. Main-portal reloads open `#section-home`; vertical reloads open `#section-projects`. A later client-side return is not treated as another reload. Arrival cleanup runs only once and cannot rewrite another page’s URL.
