import { ChevronDownIcon, PinIcon } from "lucide-react";
import { type ReactElement, useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

interface Props {
  memos: Memo[];
  renderer: (memo: Memo, options: { compact: boolean }) => ReactElement;
  compact: boolean;
  useGrid: boolean;
}

/** Only loaded, authorized pinned memos are shown; no misleading global count. */
const PinnedMemoSection = ({ memos, renderer, compact, useGrid }: Props) => {
  const t = useTranslate();
  const [collapsed, setCollapsed] = useState(false);
  const contentId = useId();

  if (!memos.length) return null;
  return (
    <section aria-label={t("home.pinned-memos")} className="w-full min-w-0">
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((previous) => !previous)}
          className="flex w-full items-center gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <PinIcon aria-hidden="true" className="size-4 shrink-0 text-primary" strokeWidth={1.7} />
          <span className="flex-1">{t("home.pinned-memos")}</span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", collapsed && "-rotate-90")}
          />
        </button>
      </h2>
      {/* Hide rather than unmount memo cards: an inline editor can retain its draft state. */}
      <div
        id={contentId}
        className={cn(
          "min-w-0 gap-3",
          collapsed ? "hidden" : useGrid ? "grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]" : "flex flex-col",
        )}
      >
        {memos.map((memo) => (
          <div key={memo.name} className="min-w-0">
            {renderer(memo, { compact })}
          </div>
        ))}
      </div>
    </section>
  );
};
export default PinnedMemoSection;
