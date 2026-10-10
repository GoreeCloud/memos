import { ArrowRightIcon, SearchIcon, XIcon } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFilterSearch, isSearchFilter, type MemoFilter, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { useSpaceContext } from "@/contexts/SpaceContext";
import { ROUTES } from "@/router/routes";
import { useTranslate } from "@/utils/i18n";

export const buildHomeSearchFilters = (value: string): MemoFilter[] =>
  Array.from(new Set(value.trim().split(/\s+/).filter(Boolean))).map((term) => ({ factor: "contentSearch", value: term }));

const HomeSearchBar = () => {
  const t = useTranslate();
  const navigate = useNavigate();
  const { filters, setFilters, setMemoView } = useMemoFilterContext();
  const { selectedSpaceName } = useSpaceContext();
  const activeQuery = filters
    .filter(isSearchFilter)
    .map((filter) => filter.value)
    .join(" ");
  const [query, setQuery] = useState(activeQuery);

  useEffect(() => setQuery(activeQuery), [activeQuery]);

  const applySearch = (value: string) => {
    const searchFilters = buildHomeSearchFilters(value);
    // A fresh search does not retain a former label, saved-view or Space restriction.
    setMemoView(undefined);
    if (selectedSpaceName) {
      navigate({ pathname: ROUTES.HOME, search: getFilterSearch(searchFilters) });
    } else {
      setFilters(searchFilters);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applySearch(query);
  };

  return (
    <form
      role="search"
      aria-label={t("home.search-all")}
      onSubmit={submit}
      className="group mx-auto mb-5 flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-4 py-3 shadow-[0_12px_42px_-32px_rgba(0,0,0,.4)] transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 motion-reduce:transition-none"
    >
      <SearchIcon aria-hidden="true" className="size-5 shrink-0 text-primary/80" strokeWidth={1.9} />
      <label htmlFor="goreecloud-home-search" className="sr-only">
        {t("home.search-all")}
      </label>
      <input
        id="goreecloud-home-search"
        type="search"
        enterKeyHint="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("home.search-placeholder")}
        className="min-w-0 flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/75"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            applySearch("");
          }}
          aria-label={t("common.clear")}
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      )}
      <button
        type="submit"
        aria-label={t("home.search-all")}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
};

export default HomeSearchBar;
