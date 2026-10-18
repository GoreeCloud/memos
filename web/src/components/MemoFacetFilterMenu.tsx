import { CheckIcon, ListFilterIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type FilterFactor, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { useTranslate } from "@/utils/i18n";

const FACETS = [
  { factor: "property.hasLink", label: "memo.filters.has-link" },
  { factor: "property.hasTaskList", label: "memo.filters.has-task-list" },
  { factor: "property.hasCode", label: "memo.filters.has-code" },
  { factor: "property.hasLocation", label: "memo.filters.has-location" },
] as const satisfies ReadonlyArray<{
  factor: FilterFactor;
  label: "memo.filters.has-link" | "memo.filters.has-task-list" | "memo.filters.has-code" | "memo.filters.has-location";
}>;

export default function MemoFacetFilterMenu() {
  const t = useTranslate();
  const { filters, setFilters } = useMemoFilterContext();
  const active = FACETS.filter(({ factor }) => filters.some((filter) => filter.factor === factor));
  const toggle = (factor: FilterFactor) => {
    setFilters(
      filters.some((filter) => filter.factor === factor)
        ? filters.filter((filter) => filter.factor !== factor)
        : [...filters, { factor, value: "true" }],
    );
  };

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={t("common.filter")}
        title={t("common.filter")}
        className="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ListFilterIcon className="size-5" aria-hidden="true" />
        {active.length > 0 && <span aria-hidden="true" className="absolute end-0 top-0 size-2 rounded-full bg-primary" />}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-64 p-2">
        <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{t("common.filter")}</p>
        {FACETS.map(({ factor, label }) => {
          const selected = active.some((facet) => facet.factor === factor);
          return (
            <button
              key={factor}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(factor)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-start text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span>{t(label)}</span>
              {selected && <CheckIcon className="size-4" aria-hidden="true" />}
            </button>
          );
        })}
        {active.length > 0 && (
          <button
            type="button"
            onClick={() => setFilters(filters.filter((filter) => !FACETS.some((facet) => facet.factor === filter.factor)))}
            className="mt-1 w-full border-t border-border/60 px-2 py-2 text-start text-xs text-muted-foreground hover:text-foreground"
          >
            {t("map.clear-filters")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
