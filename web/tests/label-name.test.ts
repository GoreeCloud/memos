import { describe, expect, it } from "vitest";
import { isLiteralLabelName } from "@/lib/label-name";

describe("literal label names", () => {
  it("accepts compact hierarchical names and Unicode words", () => {
    expect(isLiteralLabelName("work")).toBe(true);
    expect(isLiteralLabelName("projekt/über")).toBe(true);
    expect(isLiteralLabelName("personal-notes")).toBe(true);
  });
  it("rejects regex patterns, empty values and overlong names", () => {
    for (const name of ["", " ", "project/.*", "work+", "#work", "../notes", "x".repeat(65)]) {
      expect(isLiteralLabelName(name)).toBe(false);
    }
  });
});
