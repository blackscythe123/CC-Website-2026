import { marked } from "marked";
import { extractEmbeds, injectEmbeds } from "@coding-club/content-render";
import { sanitizeArticleHtml } from "@/lib/sanitize";

/**
 * Article preview HTML for the editor and the review drawer, matching what the portals publish:
 * YouTube links alone on a line become players. The iframe is injected only AFTER sanitizing, from IDs
 * validated by @coding-club/content-render, so authors still can't write their own iframes.
 */
export function renderArticlePreview(
  markdown: string,
  options?: Parameters<typeof sanitizeArticleHtml>[1]
): string {
  const { markdown: renderable, embeds } = extractEmbeds(markdown);
  const html = sanitizeArticleHtml(marked.parse(renderable, { gfm: true, breaks: true }) as string, options);
  return injectEmbeds(html, embeds);
}
