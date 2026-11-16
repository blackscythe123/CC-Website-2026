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
      expect(extractEmbeds(md).embeds, md).toHaveLength(0);
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
  it("leaves unknown tokens untouched and the HTML otherwise unchanged", () => {
    expect(injectEmbeds("<p>CCEMBED5</p>", [])).toBe("<p>CCEMBED5</p>");
    expect(injectEmbeds("<p>CCEMBED5</p>", [{ kind: "video", id: ID }])).toBe("<p>CCEMBED5</p>");
  });
  it("builds iframe HTML only from valid IDs", () => {
    expect(youTubeEmbedHtml({ kind: "video", id: '"><script>' })).toBe("");
    expect(youTubeEmbedHtml({ kind: "playlist", list: "x" })).toBe("");
  });
});
