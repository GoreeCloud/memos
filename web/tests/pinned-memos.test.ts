import { describe, expect, it } from "vitest";
import { partitionPinnedMemos } from "@/components/PagedMemoList/pinnedMemos";

describe("pinned memo grouping", () => {
  const memos = [
    { name: "a", pinned: true },
    { name: "b", pinned: false },
    { name: "c", pinned: true },
    { name: "d", pinned: false },
  ];
  it("preserves feed order within both groups without duplication", () => {
    const result = partitionPinnedMemos(memos, true);
    expect(result.pinned.map((m) => m.name)).toEqual(["a", "c"]);
    expect(result.regular.map((m) => m.name)).toEqual(["b", "d"]);
    expect(result.pinned.length + result.regular.length).toBe(memos.length);
    expect(memos.map((m) => m.name)).toEqual(["a", "b", "c", "d"]);
  });
  it("keeps a newly created unpinned note directly beneath the composer and never duplicates it", () => {
    const result = partitionPinnedMemos(memos, true, "b");
    expect(result.recent?.name).toBe("b");
    expect(result.pinned.map((memo) => memo.name)).toEqual(["a", "c"]);
    expect(result.regular.map((memo) => memo.name)).toEqual(["d"]);
    expect([result.recent?.name, ...result.pinned.map((memo) => memo.name), ...result.regular.map((memo) => memo.name)]).toHaveLength(4);
  });

  it("does not group other routes or an unpinned library", () => {
    expect(partitionPinnedMemos(memos, false)).toEqual({ pinned: [], regular: memos });
    expect(partitionPinnedMemos(memos.slice(1, 2), true)).toEqual({ pinned: [], regular: [{ name: "b", pinned: false }] });
  });
});
