import { ArrowRightIcon, SearchIcon, XIcon } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MemoDisplaySettingMenu from "@/components/MemoDisplaySettingMenu";
import { getFilterSearch, isSearchFilter, type MemoFilter, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { useSpaceContext } from "@/contexts/SpaceContext";
import { formatTextSearchTerms, parseTextSearchTerms } from "@/lib/text-search-terms";
import { ROUTES } from "@/router/routes";
import { useTranslate } from "@/utils/i18n";

export const buildHomeSearchFilters = (value: string): MemoFilter[] =>
  parseTextSearchTerms(value).map((term) => ({ factor: "contentSearch", value: term }));

const HomeSearchBar = () => {
  const t = useTranslate();
  const navigate = useNavigate();
  const { filters, setFilters, setMemoView } = useMemoFilterContext();
  const { selectedSpaceName } = useSpaceContext();
  const activeQuery = filters
    .filter(isSearchFilter)
    .map((filter) => (filter.factor === "contentSearch" ? formatTextSearchTerms([filter.value]) : filter.value))
    .join(" ");
  const [query, setQuery] = useState(activeQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setQuery(activeQuery), [activeQuery]);

  // "/" is a Home-only shortcut. Do not intercept typing, IME input, or
  // keyboard interactions inside dialogs and other composite controls.
  useEffect(() => {
    const focusHomeSearch = (event: globalThis.KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.key !== "/" ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.isComposing ||
        event.keyCode === 229 ||
        !searchInputRef.current
      ) {
        return;
      }
      const target = event.target;
      if (
        (target instanceof Element &&
          target.closest(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="dialog"], [role="menu"], [role="listbox"]',
          )) ||
        document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')
      ) {
        return;
      }
      event.preventDefault();
      searchInputRef.current.focus();
    };
    window.addEventListener("keydown", focusHomeSearch);
    return () => window.removeEventListener("keydown", focusHomeSearch);
  }, []);

  const applySearch = (value: string) => {
    // Re-submitting a visible, unchanged Expression query must keep its CEL
    // semantics. Editing it instead starts a new plain-text Home search.
    const searchFilters =
      value === activeQuery && filters.some((filter) => filter.factor === "celSearch")
        ? filters.filter(isSearchFilter)
        : buildHomeSearchFilters(value);
    // A fresh search does not retain a former label, saved-view or Space restriction.
    setMemoView(undefined);
    if (selectedSpaceName) {
      navigate({ pathname: ROUTES.HOME, search: getFilterSearch(searchFilters) });
    } else {
      setFilters(searchFilters);
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape" || event.nativeEvent.isComposing || event.keyCode === 229 || query === activeQuery) return;
    // Discard only the unsubmitted draft, keeping the active search and other
    // filters unchanged. Escape does not submit a new search.
    event.preventDefault();
    setQuery(activeQuery);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applySearch(query);
  };

  return (
    <div className="mx-auto mb-5 flex w-full max-w-2xl min-w-0 items-stretch gap-2">
      <form
        role="search"
        aria-label={t("home.search-all")}
        onSubmit={submit}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-4 py-3 shadow-[0_12px_42px_-32px_rgba(0,0,0,.4)] transition-[border-color,box-shadow] focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 motion-reduce:transition-none"
      >
        <SearchIcon aria-hidden="true" className="size-5 shrink-0 text-primary/80" strokeWidth={1.9} />
        <label htmlFor="goreecloud-home-search" className="sr-only">
          {t("home.search-all")}
        </label>
        <input
          ref={searchInputRef}
          id="goreecloud-home-search"
          aria-keyshortcuts="/"
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={t("home.search-placeholder")}
          className="min-w-0 flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/75"
        />
        {!query && (
          <kbd
            aria-hidden="true"
            className="hidden shrink-0 rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-flex"
          >
            /
          </kbd>
        )}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              applySearch("");
              // Keep the search ready for another query after clearing.
              if (!selectedSpaceName) searchInputRef.current?.focus();
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
      <MemoDisplaySettingMenu className="h-auto w-11 shrink-0 rounded-2xl border border-border/70 bg-card/90 text-foreground shadow-[0_12px_42px_-32px_rgba(0,0,0,.4)] hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
    </div>
  );
};

export default HomeSearchBar;
