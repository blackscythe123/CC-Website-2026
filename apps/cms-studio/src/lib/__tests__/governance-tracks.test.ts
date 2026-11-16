import { expect, it } from "vitest";
import { canReviewPr } from "@/lib/governance";

const pr = { author: "h1", vertical: "ai-ml", kind: "track" as const };

it("only a Superadmin (not the author) is offered review on a track proposal", () => {
  expect(canReviewPr({ login: "sa1", role: "superadmin" }, pr, "vertical_head")).toBe(true);
  expect(canReviewPr({ login: "h1", role: "vertical_head", rolesByVertical: { "ai-ml": "vertical_head" } }, pr, "vertical_head")).toBe(false);
  expect(canReviewPr({ login: "d1", role: "deputy", rolesByVertical: { "ai-ml": "deputy" } }, pr, "vertical_head")).toBe(false);
  // even a (hand-opened) track by a member is never offered to the Head or Deputies
  expect(canReviewPr({ login: "h1", role: "vertical_head", rolesByVertical: { "ai-ml": "vertical_head" } }, { ...pr, author: "m1" }, "member")).toBe(false);
  expect(canReviewPr({ login: "sa1", role: "superadmin" }, { ...pr, author: "sa1" }, "superadmin")).toBe(false);
});
