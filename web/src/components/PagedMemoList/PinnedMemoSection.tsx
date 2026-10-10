import { PinIcon } from "lucide-react";
import type { ReactElement } from "react";
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
  if (!memos.length) return null;
  return (
    <section aria-label={t("home.pinned-memos")} className="w-full min-w-0">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
        <PinIcon aria-hidden="true" className="size-4 text-primary" strokeWidth={1.7} />
        {t("home.pinned-memos")}
      </h2>
      <div className={cn("min-w-0 gap-3", useGrid ? "grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]" : "flex flex-col")}>
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
