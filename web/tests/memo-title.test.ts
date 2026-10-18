import { describe, expect, it } from "vitest";
import { composeMemoTitle, splitMemoTitle } from "@/lib/memo-title";

describe("optional memo titles", () => {
  it("keeps untitled legacy memos unchanged", () => {
    expect(splitMemoTitle("Draft text\n# heading inside body")).toEqual({ title: "", body: "Draft text\n# heading inside body" });
    expect(composeMemoTitle("", "Draft text\n# heading inside body")).toBe("Draft text\n# heading inside body");
  });

  it("round-trips an initial heading as a separate editable title", () => {
    const original = "# My old title\n\nA memo with **Markdown**.";
    const { title, body } = splitMemoTitle(original);
    expect(title).toBe("My old title");
    expect(body).toBe("A memo with **Markdown**.");
    expect(composeMemoTitle("Renamed memo", body)).toBe("# Renamed memo\n\nA memo with **Markdown**.");
    expect(composeMemoTitle("", body)).toBe(body);
  });

  it("supports title-only memos without adding a second title", () => {
    expect(composeMemoTitle("An idea", "")).toBe("# An idea");
    expect(splitMemoTitle("# An idea")).toEqual({ title: "An idea", body: "" });
  });

  it("flattens pasted multi-line titles to one Markdown heading", () => {
    expect(composeMemoTitle("# Plan\nnext", "details")).toBe("# Plan next\n\ndetails");
  });
});
