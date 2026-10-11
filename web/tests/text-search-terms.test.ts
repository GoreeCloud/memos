import { describe, expect, it } from "vitest";
import { formatTextSearchTerms, parseTextSearchTerms } from "@/lib/text-search-terms";

describe("text search terms", () => {
  it("deduplicates ordinary words and preserves their order", () => {
    expect(parseTextSearchTerms("  early  idea early\nnotes  ")).toEqual(["early", "idea", "notes"]);
  });

  it("searches contiguous phrases rather than splitting their words", () => {
    expect(parseTextSearchTerms('memo "meeting notes" urgent "meeting notes"')).toEqual(["memo", "meeting notes", "urgent"]);
  });

  it("keeps quotes embedded in an ordinary term literal", () => {
    expect(parseTextSearchTerms('content.contains("urgent")')).toEqual(['content.contains("urgent")']);
  });

  it("does not create empty or whitespace-only filters", () => {
    expect(parseTextSearchTerms('"" "   "  ')).toEqual([]);
    expect(parseTextSearchTerms('  "unfinished phrase')).toEqual(["unfinished phrase"]);
  });

  it("unescapes quotes and backslashes inside phrases without interpreting other escapes", () => {
    expect(parseTextSearchTerms('"say \\"hi\\"" "C:\\\\docs"')).toEqual(['say "hi"', "C:\\docs"]);
  });

  it("round-trips exact server search terms into an editable query", () => {
    const terms = ["word", "two words", 'a"b', "C:\\docs"];
    expect(parseTextSearchTerms(formatTextSearchTerms(terms))).toEqual(terms);
    expect(formatTextSearchTerms(["work", "notes"])).toBe("work notes");
  });
});
