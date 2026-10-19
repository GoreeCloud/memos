import { SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SIDEBAR_SECTION_ACTION_ICON_CLASSES } from "@/components/AppSidebar/SidebarSection";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useView } from "@/contexts/ViewContext";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface Props {
  className?: string;
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: ReactNode;
}

const SettingRow = ({ label, description, children }: SettingRowProps) => (
  <div className="flex min-h-7 items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-[13px] leading-5 text-foreground">{label}</p>
      {description && <p className="text-[11px] leading-4 text-muted-foreground">{description}</p>}
    </div>
    {children}
  </div>
);

function MemoDisplaySettingsContent() {
  const t = useTranslate();
  const { orderByTimeAsc, timeBasis, compactMode, linkPreview, setTimeBasis, setOrderByTimeAsc, setLinkPreview, resetViewSettings } =
    useView();
  // Multi-column grids always render compact tiles, so the toggle is shown as on and locked
  // there; it only becomes a real choice at a single column.
  const hasCustomViewSettings = orderByTimeAsc || timeBasis !== "create_time" || compactMode || !linkPreview;

  const timeBasisOptions = [
    { value: "create_time", label: t("common.created-at") },
    { value: "update_time", label: t("common.last-updated-at") },
  ];
  const sortOrderOptions = [
    { value: "desc", label: t("memo.newest-first") },
    { value: "asc", label: t("memo.oldest-first") },
  ];

  return (
    <div>
      <section className="space-y-2 border-t border-border/60 px-3 py-2.5">
        <SettingRow label={t("memo.order-by")}>
          <Select
            value={timeBasis}
            items={timeBasisOptions}
            onValueChange={(value) => setTimeBasis(value === "update_time" ? "update_time" : "create_time")}
          >
            <SelectTrigger size="sm" className="w-32" aria-label={t("memo.order-by")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeBasisOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label={t("memo.direction")}>
          <Select
            value={orderByTimeAsc ? "asc" : "desc"}
            items={sortOrderOptions}
            onValueChange={(value) => setOrderByTimeAsc(value === "asc")}
          >
            <SelectTrigger size="sm" className="w-32" aria-label={t("memo.direction")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOrderOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </section>

      <section className="space-y-2 border-t border-border/60 px-3 py-2.5">
        <SettingRow label={t("memo.link-preview")}>
          <Switch aria-label={t("memo.link-preview")} checked={linkPreview} onCheckedChange={setLinkPreview} />
        </SettingRow>
      </section>
      <section className="border-t border-border/60 px-3 py-2">
        <button
          type="button"
          onClick={resetViewSettings}
          disabled={!hasCustomViewSettings}
          aria-label={`${t("common.restore")} ${t("memo.view-options")}`}
          className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none"
        >
          {t("common.restore")} {t("memo.view-options")}
        </button>
      </section>
    </div>
  );
}

function MemoDisplaySettingMenu({ className }: Props) {
  const t = useTranslate();

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <PopoverTrigger
            type="button"
            aria-label={t("memo.view-options")}
            className={cn(buttonVariants({ variant: "quiet", size: "icon-sm" }), className)}
          >
            <SlidersHorizontalIcon className={SIDEBAR_SECTION_ACTION_ICON_CLASSES} strokeWidth={1.8} />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{t("memo.view-options")}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={6} aria-label={t("memo.view-options")} className="w-64 p-0">
        <MemoDisplaySettingsContent />
      </PopoverContent>
    </Popover>
  );
}

export default MemoDisplaySettingMenu;
