# Image optimization and Scroll12 validation

- Full-resolution WebP artwork: 19,061,320 bytes to 3,664,402 bytes (80.8% reduction). This sums the converted assets, not one page load.
- Background/decor quality 92; ornate and integrated frames quality 94. Full-size image dimensions retained. Frame alpha channels compared pixel-for-pixel and unchanged.
- 640px responsive decorative variants; 1280px phone desk backgrounds. Original masters preserved in `source-assets/images`, outside the deployed `public` directory.
- Rebuild artwork using `python3 scripts/optimize-scrapbook-images.py` with Pillow installed. Byte/dimension inventory: `docs/image-optimization.json`.
- Decorative images lazy-load and decode asynchronously. Hall background starts loading within 600px of the viewport; section geometry and animation timelines remain unchanged. Home background is preloaded only on the home scene.
- CSS fallback frames retain photographs and inscriptions if decorative artwork fails. Existing portrait fallbacks remain in place.

## Checks

- Scroll12 production build and TypeScript passed. Repository checks are recorded in the next-PR checklist.
- Verified optimized references point to existing public files.
- Desktop Hall of Fame frame detail and home background inspected visually. Phone frame source selection confirmed `-small.webp`.
- Cold browser navigation through a local proxy: aggregate local transfer limit 1.6 Mbps, 150ms added latency/request, cache disabled with response headers. Homepage rendered; local WebP downloads completed with HTTP 200. Hall frames all loaded without decorative fallbacks on the slow connection.
- Separate local proxy deliberately returned HTTP 503 for community images. Four visible phone frames used fallback borders, names remained readable, and there were no visible broken-image icons.

This is a controlled local bandwidth/failure test, not device-lab testing or production CDN measurement. External portrait and Google Font services were not throttled by the local proxy. Offline operation is not guaranteed.

The asset totals above describe the Scroll12 conversion trial. This monorepo ships only its used artwork; original masters are deduplicated across apps.
