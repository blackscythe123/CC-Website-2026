import { describe, expect, it } from "vitest";
import { rebuildRecoveredImages } from "@/lib/hooks/useArticleDraft";
import { findUnresolvedLocalImageUrls } from "@/lib/github";

let n = 0;
const makeUrl = () => `blob:https://cms.test/fresh-${++n}`;

describe("rebuildRecoveredImages", () => {
  it("points a recovered cover at the rebuilt pending image (PR #28 regression)", () => {
    const old = "blob:https://cms.test/old-cover";
    const r = rebuildRecoveredImages(
      {
        content: "intro",
        coverImage: old,
        coverImageBase64: "AAAA",
        coverImageMime: "image/png",
        pendingImages: [{ filename: "c.png", base64: "AAAA", mimeType: "image/png", placeholderUrl: old }],
      },
      makeUrl
    );
    expect(r.images).toHaveLength(1);
    // The cover must be exactly one of the images submit will upload
    expect(r.images.map((i) => i.placeholderUrl)).toContain(r.cover);
    expect(findUnresolvedLocalImageUrls(r.content, r.cover, r.images)).toEqual([]);
  });

  it("re-adds a cover that only survived as base64", () => {
    const r = rebuildRecoveredImages(
      { coverImage: "blob:https://cms.test/gone", coverImageBase64: "BBBB", coverImageMime: "image/jpeg", pendingImages: [] },
      makeUrl
    );
    expect(r.images).toHaveLength(1);
    expect(r.images[0]).toMatchObject({ filename: "cover.jpg", base64: "BBBB", placeholderUrl: r.cover });
  });

  it("drops an unrecoverable blob cover instead of keeping a dead link", () => {
    const r = rebuildRecoveredImages({ coverImage: "blob:https://cms.test/gone", pendingImages: [] }, makeUrl);
    expect(r.cover).toBe("");
  });

  it("keeps uploaded and https covers untouched and rewrites inline images", () => {
    const inline = "blob:https://cms.test/inline";
    const r = rebuildRecoveredImages(
      {
        content: `![x](${inline})`,
        coverImage: "/uploads/1-a.png",
        pendingImages: [{ filename: "i.png", base64: "CC", placeholderUrl: inline }],
      },
      makeUrl
    );
    expect(r.cover).toBe("/uploads/1-a.png");
    expect(r.content).toBe(`![x](${r.images[0].placeholderUrl})`);
  });
});

describe("findUnresolvedLocalImageUrls", () => {
  it("flags blob covers and inline images with no pending upload", () => {
    expect(findUnresolvedLocalImageUrls("ok", "blob:https://cms.test/x", [])).toHaveLength(1);
    expect(findUnresolvedLocalImageUrls("![a](blob:https://cms.test/y)", "", [])).toEqual(["blob:https://cms.test/y"]);
  });
  it("flags inline base64 data images", () => {
    expect(findUnresolvedLocalImageUrls("![a](data:image/png;base64,AAAAAAAAAAAAAAAAAAAA)", "", [])).toHaveLength(1);
  });
  it("accepts blob URLs that are backed by pending images, and normal URLs", () => {
    const u = "blob:https://cms.test/z";
    expect(findUnresolvedLocalImageUrls(`![a](${u})`, u, [{ placeholderUrl: u }])).toEqual([]);
    expect(findUnresolvedLocalImageUrls("![a](/uploads/x.png)", "https://x.com/a.png", [])).toEqual([]);
  });
});
