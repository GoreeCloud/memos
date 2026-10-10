import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

/** Group only fetched, authorized memos; preserves API order and never duplicates a card. */
export const partitionPinnedMemos = <T extends Pick<Memo, "name" | "pinned">>(
  memos: T[],
  groupPinned: boolean,
  newMemoName?: string,
): { pinned: T[]; regular: T[]; recent?: T } => {
  if (!groupPinned) return { pinned: [], regular: memos };
  const pinned: T[] = [];
  const regular: T[] = [];
  let recent: T | undefined;
  for (const memo of memos) {
    // Keep a just-created unpinned note directly beneath the composer, above any pins.
    if (!memo.pinned && newMemoName === memo.name) recent = memo;
    else (memo.pinned ? pinned : regular).push(memo);
  }
  return recent ? { pinned, regular, recent } : { pinned, regular };
};
