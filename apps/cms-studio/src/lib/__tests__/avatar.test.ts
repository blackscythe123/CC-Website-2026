import { expect, it } from "vitest";
import { githubAvatarUrl } from "@/lib/avatar";

it("builds a GitHub avatar URL from the login at 2x size", () =>
  expect(githubAvatarUrl("r-sundararajan", 20)).toBe("https://github.com/r-sundararajan.png?size=40"));
it("encodes unusual characters", () => expect(githubAvatarUrl("a b", 10)).toBe("https://github.com/a%20b.png?size=20"));
