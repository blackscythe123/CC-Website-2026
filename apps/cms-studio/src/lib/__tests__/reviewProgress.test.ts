import { expect, it } from "vitest";
import { authorRoleIn, reviewProgress } from "@/lib/reviewProgress";

const roles = {
  superadmins: ["Boss"],
  vertical_heads: { "full-stack": ["head1"] },
  deputies: { "full-stack": ["dep1"] },
  members: { "full-stack": ["mem1"] },
};

it("authorRoleIn finds the highest role in the PR's vertical", () => {
  expect(authorRoleIn(roles, "boss", "ai-ml")).toBe("superadmin");
  expect(authorRoleIn(roles, "head1", "full-stack")).toBe("vertical_head");
  expect(authorRoleIn(roles, "DEP1", "full-stack")).toBe("deputy");
  expect(authorRoleIn(roles, "mem1", "full-stack")).toBe("member");
  expect(authorRoleIn(roles, "dep1", "ai-ml")).toBe("member");
  expect(authorRoleIn(null, "x", "full-stack")).toBeNull();
});

it("member: counts deputy approvals out of 2", () =>
  expect(reviewProgress("member", ["d1", "x"], ["d1", "d2"])).toEqual({ text: "1/2 approvals", tone: "success", title: "or 1 head or superadmin" }));
it("member with none", () => expect(reviewProgress("member", [], ["d1"]).tone).toBe("neutral"));
it("deputy author", () => expect(reviewProgress("deputy", [], []).text).toBe("needs 1 head or superadmin"));
it("unknown author role", () => expect(reviewProgress(null, ["a", "b"], []).text).toBe("2 approvals"));
it("unknown author role, single approval", () => expect(reviewProgress(null, ["a"], []).text).toBe("1 approval"));
it("is case-insensitive", () => expect(reviewProgress("member", ["D1"], ["d1"]).text).toBe("1/2 approvals"));
