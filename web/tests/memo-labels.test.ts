import { describe, expect, it } from "vitest";
import { getMissingLabels } from "@/lib/memo-labels";

describe("memo label additions", () => {
  it("adds multiple labels without duplicating existing hashtags", () => {
    expect(getMissingLabels("Meeting #work", ["work", "notes", "notes", "project/alpha"])).toEqual(["notes", "project/alpha"]);
  });

  it("does not insert unsafe or invalid label names into a draft", () => {
    expect(getMissingLabels("Memo", ["project/.*", "#tag", "", "valid"])).toEqual(["valid"]);
  });

  it("recognizes Unicode tag names and preserves unrelated text", () => {
    expect(getMissingLabels("#über\nNotes stay unchanged", ["über", "another"])).toEqual(["another"]);
  });
});
