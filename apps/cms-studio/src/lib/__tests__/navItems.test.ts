import { expect, it } from "vitest";
import { navItemsFor } from "@/components/shell/navItems";

const ids = (role: Parameters<typeof navItemsFor>[0], verticals: string[] = []) => navItemsFor(role, verticals).map((i) => i.id);

it("superadmin sees everything", () => expect(ids("superadmin")).toEqual(["write", "reviews", "articles", "people"]));
it("head sees articles and people", () => expect(ids("vertical_head", ["ai-ml"])).toEqual(["write", "reviews", "articles", "people"]));
it("deputy sees people but not articles", () => expect(ids("deputy", ["ai-ml"])).toEqual(["write", "reviews", "people"]));
it("member gets a join entry", () => expect(ids("member", ["ai-ml"])).toEqual(["write", "reviews", "join"]));
it("unassigned member gets a join entry", () => expect(ids("member", [])).toEqual(["write", "reviews", "join"]));
it("signed-out gets nothing", () => expect(navItemsFor(null, [])).toEqual([]));
it("join points at the people page", () => expect(navItemsFor("member", []).find((i) => i.id === "join")?.href).toBe("/admin/roles"));
