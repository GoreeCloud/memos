import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dropdownSource = readFileSync(resolve(process.cwd(), "src/components/ui/dropdown-menu.tsx"), "utf8");

describe("nested preference submenu responsive positioning source contract", () => {
  it("keeps a block-end collision fallback for narrow viewports", () => {
    expect(dropdownSource).toContain('collisionAvoidance={{ fallbackAxisSide: "end" }}');
  });

  it("forwards collision avoidance through the shared dropdown wrapper", () => {
    expect(dropdownSource).toContain('"collisionAvoidance"');
    expect(dropdownSource).toContain("collisionAvoidance={collisionAvoidance}");
  });
});
