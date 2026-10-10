import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

/** Group only fetched, authorized memos; preserves API order and never duplicates a card. */
export const partitionPinnedMemos = <T extends Pick<Memo, "pinned">>(memos: T[], groupPinned: boolean): { pinned: T[]; regular: T[] } => {
  if (!groupPinned) return { pinned: [], regular: memos };
  const pinned: T[] = [];
  const regular: T[] = [];
  for (const memo of memos) (memo.pinned ? pinned : regular).push(memo);
  return { pinned, regular };
};
