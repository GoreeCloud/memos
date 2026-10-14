import { CheckIcon, TagIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { memoServiceClient } from "@/connect";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateMemo } from "@/hooks/useMemoQueries";
import { useTagCounts } from "@/hooks/useUserQueries";
import { isLiteralLabelName } from "@/lib/label-name";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

interface Props {
  memo: Memo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MemoLabelsDialog({ memo, open, onOpenChange }: Props) {
  const { userTagsSetting } = useAuth();
  const { data: tagCounts = {} } = useTagCounts(open);
  const { mutateAsync: updateMemo } = useUpdateMemo();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const existing = useMemo(() => new Set(memo.tags ?? []), [memo.tags]);
  const names = useMemo(
    () => [...new Set([...Object.keys(tagCounts), ...Object.keys(userTagsSetting?.tags ?? {})])].filter(isLiteralLabelName).sort(),
    [tagCounts, userTagsSetting],
  );
  const pending = selected.filter((name) => !existing.has(name));
  const save = async () => {
    if (busy || !pending.length) return;
    setBusy(true);
    try {
      // Read the latest server version before modifying memo content. A card
      // snapshot can be stale when another browser or device has edited it.
      const latestMemo = await memoServiceClient.getMemo({ name: memo.name });
      if (latestMemo.content !== memo.content) {
        toast.error("This memo changed. Reload it before adding labels.");
        return;
      }
      const suffix = pending
        .filter((label) => !latestMemo.tags.includes(label))
        .map((label) => `#${label}`)
        .join(" ");
      if (!suffix) {
        onOpenChange(false);
        return;
      }
      const content = latestMemo.content.trimEnd() + (latestMemo.content.trim() ? "\n\n" : "") + suffix;
      await updateMemo({ update: { name: memo.name, content }, updateMask: ["content", "update_time"] });
      setSelected([]);
      onOpenChange(false);
    } catch {
      toast.error("Could not add labels. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Add labels to memo</DialogTitle>
          <DialogDescription>Choose existing labels. Assigned labels are checked.</DialogDescription>
        </DialogHeader>
        <div role="group" aria-label="Memo labels" className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {names.length === 0 && <p className="py-3 text-sm text-muted-foreground">Create a label from the Labels page first.</p>}
          {names.map((name) => {
            const assigned = existing.has(name);
            const checked = assigned || selected.includes(name);
            return (
              <button
                key={name}
                type="button"
                disabled={busy || assigned}
                aria-pressed={checked}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setSelected((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))}
              >
                <TagIcon aria-hidden="true" className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 break-all">#{name}</span>
                {checked && <CheckIcon aria-hidden="true" className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !pending.length} onClick={() => void save()}>
            Add ({pending.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
