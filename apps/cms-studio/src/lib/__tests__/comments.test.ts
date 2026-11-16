import { describe, expect, it } from "vitest";
import { commentTerm, commentsOn, type CommentsConfig } from "@coding-club/content-render";
import { giscusWidgetUrl } from "@coding-club/content-render/comments";

const config: CommentsConfig = {
  enabled: true,
  repo: "blackscythe123/CC-Website-2026",
  repoId: "R_kgDOVDzCDw",
  category: "Comments",
  categoryId: "DIC_kwDOVDzCD84Cx",
  disabledVerticals: ["cybersecurity"],
};

describe("reader comments", () => {
  it("builds stable, domain-independent terms and refuses unsafe parts", () => {
    expect(commentTerm("post", "competitive-programming", "two-pointers")).toBe("post:competitive-programming/two-pointers");
    expect(commentTerm("post", "club", "welcome")).toBe("post:club/welcome");
    expect(commentTerm("track", "ai-ml", "ml-basics")).toBe("track:ai-ml/ml-basics");
    expect(commentTerm("topic", "ai-ml", "ml-basics", "attention-x1y2")).toBe("topic:ai-ml/ml-basics/attention-x1y2");
    expect(commentTerm("topic", "ai-ml", "ml-basics")).toBeNull();
    expect(commentTerm("post", "ai-ml", "../x")).toBeNull();
    expect(commentTerm("post", "ai-ml", "a/b")).toBeNull();
    // long slugs from before the CMS's 80-character cap still get a thread
    const long = "introducing-the-coding-club-website-a-new-home-for-builders-thinkers-and-innovators";
    expect(commentTerm("post", "club", long)).toBe(`post:club/${long}`);
    expect(commentTerm("post", "club", "a".repeat(121))).toBeNull();
  });

  it("is off when disabled, unconfigured or for a disabled vertical", () => {
    expect(commentsOn(config, "ai-ml")).toBe(true);
    expect(commentsOn(config, "cybersecurity")).toBe(false);
    expect(commentsOn({ ...config, enabled: false }, "ai-ml")).toBe(false);
    expect(commentsOn({ ...config, categoryId: "" }, "ai-ml")).toBe(false);
    expect(commentsOn(null, "ai-ml")).toBe(false);
  });

  it("widget URL: specific term, strict match, session passed through, ?giscus= and #hash stripped from the origin", () => {
    const url = new URL(giscusWidgetUrl(config, "post:ai-ml/x", "https://cc-ai-ml-portal.vercel.app/posts/x?giscus=abc#c", "sess"));
    expect(url.origin + url.pathname).toBe("https://giscus.app/en/widget");
    const p = url.searchParams;
    expect(p.get("term")).toBe("post:ai-ml/x");
    expect(p.get("strict")).toBe("1");
    expect(p.get("session")).toBe("sess");
    expect(p.get("origin")).toBe("https://cc-ai-ml-portal.vercel.app/posts/x");
    expect(p.get("repoId")).toBe("R_kgDOVDzCDw");
    expect(p.get("categoryId")).toBe("DIC_kwDOVDzCD84Cx");
    expect(p.get("theme")).toBe("light");
  });
});
