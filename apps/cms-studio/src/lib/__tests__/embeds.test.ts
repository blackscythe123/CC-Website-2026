import { describe, expect, it } from "vitest";
import { extractEmbeds, injectEmbeds, parseYouTubeUrl, youTubeEmbedHtml } from "@coding-club/content-render";
import { renderArticlePreview } from "@/lib/renderPreview";

const ID = "dQw4w9WgXcQ";
const LIST = "PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG";

describe("parseYouTubeUrl", () => {
  it("accepts videos, short links, playlists and videos inside a playlist", () => {
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}`)).toEqual({ kind: "video", id: ID });
    expect(parseYouTubeUrl(`https://youtube.com/watch?v=${ID}&t=42`)).toEqual({ kind: "video", id: ID });
    expect(parseYouTubeUrl(`https://m.youtube.com/watch?v=${ID}`)).toEqual({ kind: "video", id: ID });
    expect(parseYouTubeUrl(`https://youtu.be/${ID}`)).toEqual({ kind: "video", id: ID });
    expect(parseYouTubeUrl(`https://www.youtube.com/playlist?list=${LIST}`)).toEqual({ kind: "playlist", list: LIST });
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${ID}&list=${LIST}`)).toEqual({ kind: "video", id: ID, list: LIST });
  });
  it("rejects everything else", () => {
    for (const bad of [
      `http://www.youtube.com/watch?v=${ID}`, // not https
      `https://evil.com/watch?v=${ID}`,
      `https://youtube.com.evil.com/watch?v=${ID}`,
      `https://www.youtube.com/watch?v=short`,
      `https://www.youtube.com/watch?v=${ID}x`,
      `https://www.youtube.com/watch?v=${ID.slice(0, 10)}"`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/playlist?list=bad"list`,
      `https://user:pw@www.youtube.com/watch?v=${ID}`,
      `javascript:alert(1)`,
      "not a url",
    ]) {
      expect(parseYouTubeUrl(bad), bad).toBeNull();
    }
  });
});

describe("extractEmbeds / injectEmbeds", () => {
  const url = `https://youtu.be/${ID}`;
  it("only turns a link that is its own paragraph into a player", () => {
    const md = `Intro\n\n${url}\n\nOutro`;
    const html = renderArticlePreview(md);
    expect(html).toContain(`<iframe src="https://www.youtube-nocookie.com/embed/${ID}"`);
    expect(html).toContain("Intro");
    expect(html).toContain("Outro");
  });
  it("leaves links in sentences, lists, quotes and code alone", () => {
    for (const md of [
      `Watch ${url} now`,
      `- ${url}`,
      `> ${url}`,
      "```\n\n" + url + "\n\n```",
      `    ${url}`, // indented code
      `Line one\n${url}`, // same paragraph as other text
      `[a video](${url})`,
    ]) {
      expect(extractEmbeds(md).embeds.items, md).toHaveLength(0);
      expect(renderArticlePreview(md), md).not.toContain("<iframe");
    }
  });
  it("renders a playlist and a video-in-playlist", () => {
    const html = renderArticlePreview(`https://www.youtube.com/playlist?list=${LIST}\n\nhttps://www.youtube.com/watch?v=${ID}&list=${LIST}`);
    expect(html).toContain(`embed/videoseries?list=${LIST}`);
    expect(html).toContain(`embed/${ID}?list=${LIST}`);
  });
  it("never lets authors write their own iframes or scripts", () => {
    const html = renderArticlePreview(`<iframe src="https://evil.example"></iframe>\n\n<script>alert(1)</script>\n\n${url}`);
    expect(html.match(/<iframe/g)).toHaveLength(1);
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("<script");
  });
  it("ignores tokens typed by authors and unknown token numbers", () => {
    // An author paragraph that looks like a token can't produce or duplicate a player.
    const html = renderArticlePreview(`CCEMBED0\n\n${url}\n\nCCEMBED00`);
    expect(html.match(/<iframe/g)).toHaveLength(1);
    expect(html).toContain("<p>CCEMBED0</p>");
    const { embeds } = extractEmbeds(url);
    expect(injectEmbeds(`<p>${embeds.token}7</p>`, embeds)).toBe(`<p>${embeds.token}7</p>`);
  });
  it("never touches URLs inside code fences (CommonMark closing rules) or raw HTML blocks", () => {
    for (const md of [
      "````\n```\n\n" + url + "\n\n````", // an inner shorter fence doesn't close the outer one
      "```js\n\n" + url + "\n\n```js\n\n" + url + "\n\n```", // a line with an info string never closes a fence
      "~~~\n\n" + url + "\n\n```\n\n" + url + "\n\n~~~", // backticks don't close a tilde fence
      "<pre>\n\n" + url + "\n\n</pre>",
      "<!--\n\n" + url + "\n\n-->",
    ]) {
      const r = extractEmbeds(md);
      expect(r.embeds.items, md).toHaveLength(0);
      expect(r.markdown, md).toBe(md);
    }
    // ...and the document after a closed fence still works
    expect(extractEmbeds("```\ncode\n```\n\n" + url).embeds.items).toHaveLength(1);
  });
  it("builds iframe HTML only from valid IDs", () => {
    expect(youTubeEmbedHtml({ kind: "video", id: '"><script>' })).toBe("");
    expect(youTubeEmbedHtml({ kind: "playlist", list: "x" })).toBe("");
  });
});
