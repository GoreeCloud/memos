import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("keeps browser-level mobile zoom available for accessibility", () => {
  const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"\s*\/>/i)?.[1];
  expect(viewport).toBeDefined();

  const directives = Object.fromEntries(
    (viewport ?? "").split(",").map((directive) => {
      const [name, value] = directive.trim().split("=", 2);
      return [name?.toLowerCase(), value?.toLowerCase()];
    }),
  );

  expect(directives).toMatchObject({ width: "device-width", "initial-scale": "1" });
  expect(directives).not.toHaveProperty("user-scalable");
  expect(directives).not.toHaveProperty("maximum-scale");
});
