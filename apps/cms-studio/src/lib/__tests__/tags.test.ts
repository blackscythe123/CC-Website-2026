import { expect, it } from "vitest";
import { addTag } from "@/lib/tags";

it("trims, strips commas and dedupes case-insensitively", () => {
  expect(addTag(["React"], " react, ")).toEqual(["React"]);
  expect(addTag(["React"], "nextjs,")).toEqual(["React", "nextjs"]);
  expect(addTag([], "   ")).toEqual([]);
});

it("strips a leading hash", () => {
  expect(addTag([], "#redis")).toEqual(["redis"]);
});

it("caps a tag at 32 characters", () => {
  expect(addTag([], "x".repeat(50))[0]).toHaveLength(32);
});
