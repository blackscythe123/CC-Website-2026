import { describe, expect, it } from "vitest";
import { approvalTarget } from "@/lib/governance";

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
