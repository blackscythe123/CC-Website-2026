import { describe, expect, it } from "vitest";
import { TOO_LARGE_MESSAGE, imagesTooLarge, readApiJson } from "@/lib/hooks/apiClient";
import { normalizedImageName } from "@/lib/hooks/useArticleDraft";
import { reviewProgress } from "@/lib/reviewProgress";

const res = (status: number, body: string, type = "application/json") =>
  new Response(body, { status, headers: { "content-type": type } });

describe("readApiJson", () => {
  it("parses JSON responses", async () => {
    expect(await readApiJson(res(200, '{"a":1}'))).toMatchObject({ ok: true, status: 200, data: { a: 1 } });
    expect((await readApiJson(res(409, '{"error":"stale"}'))).data.error).toBe("stale");
  });
  it("turns a 413 into the too-large message even when the body is not JSON", async () => {
    const r = await readApiJson(res(413, "Request Entity Too Large", "text/plain"));
    expect(r.ok).toBe(false);
    expect(r.data.error).toBe(TOO_LARGE_MESSAGE);
  });
  it("does not throw on an HTML error page", async () => {
    const r = await readApiJson(res(502, "<html>Bad gateway</html>", "text/html"));
    expect(r.ok).toBe(false);
    expect(r.data.error).toContain("502");
  });
  it("does not throw on malformed JSON", async () => {
    const r = await readApiJson(res(200, "{nope"));
    expect(r.ok).toBe(false);
    expect(typeof r.data.error).toBe("string");
  });
});

describe("imagesTooLarge", () => {
  it("allows up to ~3.5 MB of base64 and rejects more", () => {
    expect(imagesTooLarge([{ base64: "a".repeat(3 * 1024 * 1024) }])).toBe(false);
    expect(imagesTooLarge([{ base64: "a".repeat(2 * 1024 * 1024) }, { base64: "a".repeat(2 * 1024 * 1024) }])).toBe(true);
  });
});

describe("normalizedImageName", () => {
  it("gives extensionless / odd names the extension implied by the MIME type", () => {
    expect(normalizedImageName("image", "image/png")).toBe("image.png");
    expect(normalizedImageName("download", "image/jpeg")).toBe("download.jpg");
    expect(normalizedImageName("photo.jfif", "image/jpeg")).toBe("photo.jpg");
    expect(normalizedImageName("My Cat (1).JPEG", "image/jpeg")).toBe("my-cat-1.jpg");
    expect(normalizedImageName("anim.gif", "image/gif")).toBe("anim.gif");
    expect(normalizedImageName("pic.png", "image/webp")).toBe("pic.webp");
  });
  it("falls back to 'image' and strips paths", () => {
    expect(normalizedImageName("....", "image/png")).toBe("image.png");
    expect(normalizedImageName(String.raw`C:\fakepath\shot.png`, "image/png")).toBe("shot.png");
  });
});

describe("reviewProgress with head-scoped approvers", () => {
  it("counts only the approvers the server returns", () => {
    expect(reviewProgress("member", [], ["d1", "d2"]).text).toBe("0/2 approvals");
    expect(reviewProgress("member", ["d1"], ["d1", "d2"]).text).toBe("1/2 approvals");
  });
});

import { MAX_IMAGE_BYTES } from "@/lib/hooks/useArticleDraft";
describe("image size limits agree", () => {
  it("the largest image the editor accepts still fits in one submit request", () => {
    const base64Len = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
    expect(imagesTooLarge([{ base64: "A".repeat(base64Len) } as never])).toBe(false);
  });
});
