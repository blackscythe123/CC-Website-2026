import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALL_VERTICALS, CLUB_VERTICAL, getVertical, publicPostUrl, verticalLabel } from "@/lib/verticals";

const portals: { vertical: string; domain: string }[] = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../../../../content/club/portals.json"), "utf-8")
);

describe("verticals", () => {
  it("matches every domain in content/club/portals.json", () => {
    for (const p of portals.filter((p) => p.vertical !== "all")) {
      expect(getVertical(p.vertical)?.domain, p.vertical).toBe(p.domain);
    }
    expect(CLUB_VERTICAL.domain).toBe(portals.find((p) => p.vertical === "all")!.domain);
  });
  it("has no emoji in names", () => {
    for (const v of [...ALL_VERTICALS, CLUB_VERTICAL]) expect(v.name).toMatch(/^[\w &/().,-]+$/);
  });
  it("labels unknown slugs with the slug", () => expect(verticalLabel("nope")).toBe("nope"));
  it("builds public post URLs", () => expect(publicPostUrl("full-stack", "a-b")).toMatch(/\/blog\/full-stack\/a-b$/));
});
