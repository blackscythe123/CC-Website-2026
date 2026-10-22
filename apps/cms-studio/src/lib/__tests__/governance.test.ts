import { describe, expect, it } from "vitest";
import { approvalTarget, assignableRoles, canRemoveRole } from "@/lib/governance";

describe("canRemoveRole", () => {
  it("superadmin can remove anyone except the last superadmin", () => {
    expect(canRemoveRole("superadmin", "vertical_head", 2)).toBe(true);
    expect(canRemoveRole("superadmin", "superadmin", 2)).toBe(true);
    expect(canRemoveRole("superadmin", "superadmin", 1)).toBe(false);
  });
  it("head can remove deputies and members only", () => {
    expect(canRemoveRole("vertical_head", "deputy", 2)).toBe(true);
    expect(canRemoveRole("vertical_head", "member", 2)).toBe(true);
    expect(canRemoveRole("vertical_head", "vertical_head", 2)).toBe(false);
  });
  it("deputy can remove members only", () => {
    expect(canRemoveRole("deputy", "member", 2)).toBe(true);
    expect(canRemoveRole("deputy", "deputy", 2)).toBe(false);
  });
  it("members and outsiders cannot remove anyone", () => {
    expect(canRemoveRole("member", "member", 2)).toBe(false);
    expect(canRemoveRole(null, "member", 2)).toBe(false);
  });
});

describe("assignableRoles", () => {
  it("superadmin can assign every role", () => expect(assignableRoles("superadmin")).toEqual(["member", "deputy", "vertical_head", "superadmin"]));
  it("head can assign members and deputies", () => expect(assignableRoles("vertical_head")).toEqual(["member", "deputy"]));
  it("deputy can assign members", () => expect(assignableRoles("deputy")).toEqual(["member"]));
  it("member can assign nothing", () => expect(assignableRoles("member")).toEqual([]));
});

describe("approvalTarget", () => {
  it("member posts need 2 deputies or a head/superadmin", () =>
    expect(approvalTarget("member")).toEqual({ label: "2 deputies, or 1 head or superadmin", deputyApprovalsNeeded: 2 }));
  it("deputy posts need a head or superadmin", () =>
    expect(approvalTarget("deputy")).toEqual({ label: "1 head or superadmin", deputyApprovalsNeeded: null }));
  it("head posts need a superadmin", () =>
    expect(approvalTarget("vertical_head")).toEqual({ label: "1 superadmin", deputyApprovalsNeeded: null }));
  it("superadmin posts need another superadmin", () =>
    expect(approvalTarget("superadmin")).toEqual({ label: "another superadmin", deputyApprovalsNeeded: null }));
});
