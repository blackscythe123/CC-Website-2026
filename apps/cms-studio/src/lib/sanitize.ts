import sanitizeHtml from "sanitize-html";

/**
 * Strict HTML Sanitizer for Markdown-rendered HTML.
 * Completely blocks:
 *  - <script>, <iframe>, <object>, <embed>, <form>, <input>, <style>, <link>, <meta>
 *  - Inline event handlers: onload, onerror, onclick, onmouseover, etc.
 *  - javascript:, vbscript:, data: URIs in href and src
 */
export function sanitizeArticleHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return "";

  return sanitizeHtml(dirtyHtml, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "a", "b", "i", "strong", "em", "strike", "code", "hr", "br",
      "div", "table", "thead", "caption", "tbody", "tr", "th", "td",
      "pre", "blockquote", "ul", "ol", "li", "span", "img", "del", "sup", "sub"
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      code: ["class"],
      span: ["class"],
      div: ["class"],
      pre: ["class"],
      th: ["class"],
      td: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        const rawHref = (attribs.href || "#").trim();
        const isSafe =
          rawHref.startsWith("#") ||
          (rawHref.startsWith("/") && !rawHref.startsWith("//")) ||
          rawHref.startsWith("https://") ||
          rawHref.startsWith("http://") ||
          rawHref.startsWith("mailto:");

        return {
          tagName: "a",
          attribs: {
            href: isSafe ? rawHref : "#",
            rel: "noopener noreferrer nofollow",
            target: attribs.target || "_blank",
            ...(attribs.title ? { title: attribs.title } : {}),
          },
        };
      },
      img: (tagName, attribs) => {
        const src = (attribs.src || "").trim();
        // Disallow javascript:, data:, and protocol-relative // URLs
        const isSafe =
          src.startsWith("https://") ||
          src.startsWith("http://") ||
          (src.startsWith("/") && !src.startsWith("//"));

        if (!isSafe) {
          return { tagName: "span", attribs: {} };
        }
        return {
          tagName: "img",
          attribs: {
            src,
            alt: attribs.alt || "",
            loading: "lazy",
            ...(attribs.title ? { title: attribs.title } : {}),
            ...(attribs.width ? { width: attribs.width } : {}),
            ...(attribs.height ? { height: attribs.height } : {}),
          },
        };
      },
    },
    disallowedTagsMode: "discard",
  });
}
