import { ChevronDownIcon, PinIcon } from "lucide-react";
import { type ReactElement, useId, useState } from "react";
import ColumnGrid, { ColumnGridUntrappedProvider } from "@/components/ColumnGrid";
import { cn } from "@/lib/utils";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";
import { estimateMemoCardHeight } from "./memoCardHeight";

interface Props {
  memos: Memo[];
  renderer: (memo: Memo, options: { compact: boolean }) => ReactElement;
  compact: boolean;
  useGrid: boolean;
  maxColumns: number;
}

/** Only loaded, authorized pinned memos are shown; no misleading global count. */
const PinnedMemoSection = ({ memos, renderer, compact, useGrid, maxColumns }: Props) => {
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
          className="flex w-full items-center gap-2 rounded-sm text-start text-[#18243b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <PinIcon aria-hidden="true" className="size-4 shrink-0 text-primary" strokeWidth={1.7} />
          <span className="flex-1">{t("home.pinned-memos")}</span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
              collapsed && "-rotate-90",
            )}
          />
        </button>
      </h2>
      {/* Preserve memo/editor component state while collapsed, including unsaved drafts. */}
      <div id={contentId} className={collapsed ? "hidden" : undefined}>
        {useGrid ? (
          <ColumnGridUntrappedProvider>
            <ColumnGrid
              items={memos}
              getKey={(memo) => memo.name}
              renderItem={(memo) => renderer(memo, { compact })}
              estimateHeight={estimateMemoCardHeight}
              maxColumns={maxColumns}
              maxColumnWidth={420}
            />
          </ColumnGridUntrappedProvider>
        ) : (
          <div className={cn("flex min-w-0 flex-col gap-3")}>
            {memos.map((memo) => (
              <div key={memo.name} className="min-w-0">
                {renderer(memo, { compact })}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PinnedMemoSection;
