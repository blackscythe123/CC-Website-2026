# Vertical broadcast

The broadcast section appears only in AI/ML and Cybersecurity, after Blogs. The main homepage has no broadcast section or navigation link.

## Published content

Each portal reads its own published Markdown posts through the existing `getPortalPosts` / `getPortalPost` helpers, including their existing portal-targeting rules. Add an `announcement` or `news` tag to include a post in the respective broadcast filter. Accepted aliases: `announcements`, `club-announcement`, `latest-news`. Other posts remain in the blog feed without appearing in the broadcast.

The title, author, date and complete article body come from published content. No prototype sample articles are shipped in the Git implementation. An empty category shows a quiet empty state. Long articles scroll within the paper; there is no Read More modal. Content is inserted as text, never executable article HTML.

## Shared component

`packages/scrapbook-ui/src/components/ClubBroadcast.tsx` accepts `BroadcastItem[]` (`id`, `type`, `title`, `category`, `body`, optional `contentHtml`, `date`, `source`). The static markup contains artwork only. The runtime is scoped to the component, and event handlers, animation timelines and WebGL resources are cleaned up on unmount.

The megaphone loads its Three.js renderer near the viewport with an SVG fallback. The section stays in normal document flow, like Projects, Events and Blogs. Scroll progress assembles the clipboard and flying sheets, holds them assembled briefly, then reverses on exit in either direction. Navigation replays entry. Filter buttons, arrows, keyboard arrows within the section and a horizontal swipe change sheets. Vertical scrolling continues through the page or longer article text; the article allows scroll chaining at its edges instead of trapping the wheel or touch gesture. Reduced motion disables typing and continuous sweeping.
