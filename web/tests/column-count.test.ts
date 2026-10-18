import { describe, expect, it } from "vitest";
import { columnCountForWidth } from "@/components/ColumnGrid";

describe("columnCountForWidth", () => {
  it("uses one readable column under the phone masonry threshold", () => {
    expect(columnCountForWidth(0)).toBe(1);
    expect(columnCountForWidth(100)).toBe(1);
    expect(columnCountForWidth(259)).toBe(1);
    expect(columnCountForWidth(323)).toBe(1);
  });

  it("fits two Pinterest-style columns on normal phones", () => {
    expect(columnCountForWidth(324)).toBe(2);
    expect(columnCountForWidth(332)).toBe(2);
    expect(columnCountForWidth(362)).toBe(2);
    expect(columnCountForWidth(404)).toBe(2);
    expect(columnCountForWidth(531)).toBe(2);
    expect(columnCountForWidth(699)).toBe(2);
  });

  it("uses normal card widths on tablets and desktop", () => {
    expect(columnCountForWidth(700)).toBe(2);
    expect(columnCountForWidth(804)).toBe(3);
    expect(columnCountForWidth(1152)).toBe(4);
    expect(columnCountForWidth(1600)).toBe(5);
  });
});
