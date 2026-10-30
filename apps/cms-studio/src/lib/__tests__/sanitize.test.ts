import { expect, it } from "vitest";
import { sanitizeArticleHtml } from "@/lib/sanitize";

const blob = "blob:https://studio.example/2e7ba10e-2d75-4707-85e4-4426f667b3bb";

it("drops blob: images by default", () => expect(sanitizeArticleHtml(`<img src="${blob}">`)).not.toContain("<img"));
it("keeps blob: images the editor created itself", () =>
  expect(sanitizeArticleHtml(`<img src="${blob}" alt="x">`, { allowedImageUrls: [blob] })).toContain(`src="${blob}"`));
it("still drops other blob: images", () =>
  expect(sanitizeArticleHtml(`<img src="blob:https://evil.example/1">`, { allowedImageUrls: [blob] })).not.toContain("<img"));
it("still drops javascript: and data: images", () => {
  expect(sanitizeArticleHtml(`<img src="javascript:alert(1)">`, { allowedImageUrls: [blob] })).not.toContain("<img");
  expect(sanitizeArticleHtml(`<img src="data:image/png;base64,AAAA">`, { allowedImageUrls: [blob] })).not.toContain("<img");
});
it("keeps https images", () => expect(sanitizeArticleHtml(`<img src="https://a.b/c.png">`)).toContain("https://a.b/c.png"));
