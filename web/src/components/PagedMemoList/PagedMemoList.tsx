import { ArrowUpIcon, LoaderCircleIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { MentionResolutionProvider } from "@/components/MemoContent/MentionResolutionContext";
import { Button } from "@/components/ui/button";
import { useAppSidebar } from "@/contexts/AppSidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { isSearchFilter, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { useNewMemo } from "@/contexts/NewMemoContext";
import { useView } from "@/contexts/ViewContext";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useInfiniteMemos } from "@/hooks/useMemoQueries";
import { hoistMemoToFront } from "@/hooks/useMemoSorting";
import { combineCELFilters } from "@/lib/cel-filter";
import { DEFAULT_LIST_MEMOS_PAGE_SIZE, LOADING_INDICATOR_DELAY_MS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { State } from "@/types/proto/api/v1/common_pb";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";
import ColumnGrid, { ColumnGridUntrappedProvider, columnCountForWidth, GRID_GAP } from "../ColumnGrid";
import MemoFilters from "../MemoFilters";
import MemoListEmptyState from "./MemoListEmptyState";
import MemoListError from "./MemoListError";
import { estimateMemoCardHeight } from "./memoCardHeight";
import PinnedMemoSection from "./PinnedMemoSection";
import { partitionPinnedMemos } from "./pinnedMemos";

// Memo identity for React keys and grid planning. The pages use it for their renderer keys too,
// so flow-list and grid identity can never drift apart. Deliberately name-only: content updates
// reconcile in place (updateTime is a protobuf Timestamp object, not usable in a template string).
export const getMemoKey = (memo: Memo) => memo.name;

// Columns never stretch past this, so 2 columns on a wide monitor stay readable and the
// grid centers in the leftover space instead of filling it.
const MAX_COLUMN_WIDTH = 420;

const Loader = () => (
  <div className="w-full flex flex-row justify-center items-center py-8">
    <LoaderCircleIcon className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

interface Props {
  renderer: (memo: Memo, options: { compact: boolean }) => ReactElement;
  listSort?: (list: Memo[]) => Memo[];
  state?: State;
  orderBy?: string;
  filter?: string;
  contextFilter?: string;
  pageSize?: number;
  showCreator?: boolean;
  enabled?: boolean;
  /** On Home, group loaded pinned memos separately above the ordinary masonry feed. */
  groupPinned?: boolean;
  /** Route-owned content rendered before the list and inside column one in grid mode. */
  renderLeading?: (options: { useGrid: boolean }) => ReactNode;
  /** Route-owned content spanning the full list width above every column (e.g. a page identity block). */
  renderHeader?: (options: { useGrid: boolean; memoCount: number; hasMore: boolean }) => ReactNode;
  /** Replaces the generic empty-state message when the route knows why the list is empty. */
  emptyMessage?: string;
}

function useAutoFetchWhenNotScrollable({
  enabled,
  hasNextPage,
  isFetchingNextPage,
  memoCount,
  onFetchNext,
}: {
  enabled: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  memoCount: number;
  onFetchNext: () => Promise<unknown>;
}) {
  const autoFetchTimeoutRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const isPageScrollable = useCallback(() => {
    const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    return documentHeight > window.innerHeight + 100;
  }, []);

  const checkAndFetchIfNeeded = useCallback(async () => {
    if (autoFetchTimeoutRef.current) {
      clearTimeout(autoFetchTimeoutRef.current);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    // A pending async check may resume after the list unmounts (including
    // during route changes). Never read the DOM or fetch after cleanup.
    if (!mountedRef.current || !enabledRef.current) return;

    const shouldFetch = !isPageScrollable() && hasNextPage && !isFetchingNextPage && memoCount > 0;

    if (shouldFetch) {
      await onFetchNext();

      if (enabledRef.current) {
        autoFetchTimeoutRef.current = window.setTimeout(() => {
          void checkAndFetchIfNeeded();
        }, 500);
      }
    }
  }, [enabled, hasNextPage, isFetchingNextPage, memoCount, isPageScrollable, onFetchNext]);

  useEffect(() => {
    if (enabled && !isFetchingNextPage && memoCount > 0) {
      void checkAndFetchIfNeeded();
    }
  }, [enabled, memoCount, isFetchingNextPage, checkAndFetchIfNeeded]);

  useEffect(() => {
    if (!enabled && autoFetchTimeoutRef.current) {
      clearTimeout(autoFetchTimeoutRef.current);
      autoFetchTimeoutRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (autoFetchTimeoutRef.current) {
        clearTimeout(autoFetchTimeoutRef.current);
      }
    };
  }, []);
}

const PagedMemoList = (props: Props) => {
  const { isUserSettingsInitialized } = useAuth();
  const { filters, memoView, removeFilter } = useMemoFilterContext();
  const { setQuickFindOpen } = useAppSidebar();
  const { compactMode, maxColumns } = useView();
  // Responsive masonry remains the default; deliberate list/column selections
  // now follow the saved view preferences, including cross-tab updates.
  // maxColumns is a ceiling: 1 = single reading column, 0 = as many as fit. The single
  // column renders in normal document flow; anything wider becomes the packed grid.
  const multiColumn = maxColumns !== 1;

  // Measure the available width: when it only fits one column anyway, render the flow
  // layout rather than a degenerate one-column grid (capped tiles, composer-as-tile).
  // Only the boolean is stored, so continuous resizes re-render nothing until the
  // one-column threshold is actually crossed.
  const layoutMeasureRef = useRef<HTMLDivElement>(null);
  const [fitsGridWidth, setFitsGridWidth] = useState<boolean | undefined>(undefined);
  useLayoutEffect(() => {
    const el = layoutMeasureRef.current;
    if (!el) return;
    const apply = (nextWidth: number) => setFitsGridWidth(columnCountForWidth(nextWidth) >= 2);
    apply(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => apply(entries[0]?.contentRect.width ?? el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const useGrid = multiColumn && (fitsGridWidth ?? true);
  // Grid tiles are always bounded/compact; the narrow-width fallback behaves exactly like
  // maxColumns = 1, so it respects the user's own compact setting. Centralized here so the
  // pages don't each repeat the policy.
  const effectiveCompact = compactMode || useGrid;

  const listRequest = {
    state: props.state || State.NORMAL,
    orderBy: props.orderBy || "create_time desc",
    filter: combineCELFilters(props.contextFilter, props.filter),
    pageSize: props.pageSize || DEFAULT_LIST_MEMOS_PAGE_SIZE,
  };
  // This matches the request fields used by useInfiniteMemos' React Query key.
  // A request for a prior filter must not block pagination for the current filter.
  const listRequestKey = JSON.stringify(listRequest);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error, isFetchNextPageError, refetch } =
    useInfiniteMemos(listRequest, { enabled: props.enabled ?? true });

  // Scroll events and short-page auto-fill can fire before query state updates.
  // Coalesce only within the same query, retaining separate in-flight identities
  // when the Space, filter, sorting, or page size changes without a remount.
  const pageRequestsInFlight = useRef(new Set<string>());
  const fetchNextPageOnce = useCallback(async () => {
    if (pageRequestsInFlight.current.has(listRequestKey)) return;
    pageRequestsInFlight.current.add(listRequestKey);
    try {
      await fetchNextPage();
    } finally {
      pageRequestsInFlight.current.delete(listRequestKey);
    }
  }, [fetchNextPage, listRequestKey]);

  // Tag settings decide whether sensitive memo content must be blurred. Keep that
  // privacy boundary, but do not wait for unrelated memo views or instance settings.
  const isDisplayPending = isLoading || !isUserSettingsInitialized;
  // A failed first page leaves nothing to show; a failed later page keeps what already
  // loaded. Either way, automatic pagination pauses until the user retries.
  const isInitialError = isError && !isFetchNextPageError;
  const canPaginate = !isDisplayPending && !isError;
  const showLoader = useDelayedFlag(isDisplayPending, LOADING_INDICATOR_DELAY_MS);

  // Flatten pages into a single array of memos
  const memos = useMemo(() => data?.pages.flatMap((page) => page.memos) || [], [data]);

  // Apply custom sorting if provided, otherwise use memos directly, then hoist
  // a freshly created memo to the very top so it stays visible above pins.
  const { newMemoName } = useNewMemo();
  const sortedMemoList = useMemo(() => {
    const sorted = props.listSort ? props.listSort(memos) : memos;
    return hoistMemoToFront(sorted, newMemoName);
  }, [memos, props.listSort, newMemoName]);

  // Auto-fetch hook: fetches more content when page isn't scrollable
  useAutoFetchWhenNotScrollable({
    enabled: canPaginate,
    hasNextPage,
    isFetchingNextPage,
    memoCount: sortedMemoList.length,
    onFetchNext: fetchNextPageOnce,
  });

  // Infinite scroll: fetch more when user scrolls near bottom
  useEffect(() => {
    if (!canPaginate || !hasNextPage) return;

    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom && !isFetchingNextPage) {
        void fetchNextPageOnce();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [canPaginate, hasNextPage, isFetchingNextPage, fetchNextPageOnce]);

  const leadingContent = props.renderLeading?.({ useGrid });
  const headerContent = props.renderHeader?.({ useGrid, memoCount: sortedMemoList.length, hasMore: Boolean(hasNextPage) });

  // A freshly created memo is hoisted to the front; pin it to the top of column one so it
  // appears right under the composer instead of dropping into a random (shortest) column.
  const displayMemoList = isDisplayPending || isInitialError ? [] : sortedMemoList;
  const {
    pinned: pinnedMemos,
    regular: ordinaryMemos,
    recent: newlyCreatedMemo,
  } = partitionPinnedMemos(displayMemoList, props.groupPinned ?? false, newMemoName ?? undefined);
  const firstMemo = ordinaryMemos[0];
  const priorityKey = newMemoName && firstMemo?.name === newMemoName ? getMemoKey(firstMemo) : undefined;

  // Stable reference so MentionResolutionProvider's memo (keyed on the array) actually holds.
  const contents = useMemo(() => displayMemoList.map((memo) => memo.content), [displayMemoList]);
  const userNames = useMemo(
    () =>
      Array.from(
        new Set(
          displayMemoList.flatMap((memo) => [
            ...(props.showCreator ? [memo.creator] : []),
            ...(memo.reactions ?? []).map((reaction) => reaction.creator),
          ]),
        ),
      ),
    [props.showCreator, displayMemoList],
  );

  const emptyPlaceholder =
    !isDisplayPending && !isError && !isFetchingNextPage && !hasNextPage && displayMemoList.length === 0 ? (
      <MemoListEmptyState filtered={filters.length > 0 || memoView !== undefined} message={props.emptyMessage} />
    ) : null;
  const initialLoader = isDisplayPending && showLoader ? <Loader /> : null;
  // Only a query the user typed can be edited or cleared from the error; facet and scope
  // filters are fixed by the route.
  const hasSearch = filters.some(isSearchFilter);
  const errorNotice =
    !isDisplayPending && isError ? (
      <MemoListError
        error={error}
        onRetry={isFetchNextPageError ? fetchNextPage : refetch}
        onEditQuery={hasSearch ? () => setQuickFindOpen(true) : undefined}
        onClearQuery={hasSearch ? () => removeFilter(isSearchFilter) : undefined}
      />
    ) : null;
  const initialError = isInitialError ? errorNotice : null;
  const pageError = isFetchNextPageError ? errorNotice : null;

  // Column one is the action column: the composer and any active filters head it, and the
  // empty state follows them. The newest memo also lands directly beneath them (priorityKey
  // above). Every vertical seam inside the stack uses GRID_GAP so y-spacing matches the
  // grid's x-spacing exactly.
  const hasFilters = filters.length > 0 || memoView !== undefined;
  const gridLeading =
    !props.groupPinned && (leadingContent || hasFilters || initialLoader || emptyPlaceholder || initialError) ? (
      <div className="flex w-full flex-col" style={{ gap: GRID_GAP }}>
        {leadingContent}
        <MemoFilters />
        {initialLoader}
        {initialError}
        {emptyPlaceholder}
      </div>
    ) : undefined;

  const pinnedSection = (
    <PinnedMemoSection memos={pinnedMemos} renderer={props.renderer} compact={effectiveCompact} useGrid={useGrid} maxColumns={maxColumns} />
  );
  const newlyCreatedCard = newlyCreatedMemo ? (
    <div className="mx-auto w-full max-w-2xl">{props.renderer(newlyCreatedMemo, { compact: effectiveCompact })}</div>
  ) : null;
  // The Home composer stays in the same full-width header whether a pin exists or not.
  // Moving it into/out of the masonry leading tile on pin changes would remount an active draft.
  const gridHeader = props.groupPinned ? (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {headerContent}
      <div className="mx-auto w-full max-w-2xl">
        {leadingContent}
        <MemoFilters />
      </div>
      {initialLoader}
      {initialError}
      {emptyPlaceholder}
      {newlyCreatedCard}
      {pinnedSection}
    </div>
  ) : (
    headerContent
  );

  // Pagination controls are identical across both layouts.
  const footer = (
    <>
      {pageError}
      {isFetchingNextPage && <Loader />}
      {!isFetchingNextPage && (hasNextPage || displayMemoList.length > 0) && <BackToTop />}
    </>
  );

  const children = (
    <MentionResolutionProvider contents={contents} userNames={userNames}>
      <div ref={layoutMeasureRef} className="w-full">
        <div className={cn("flex flex-col justify-start w-full mx-auto", useGrid ? "max-w-none" : "max-w-2xl")}>
          {useGrid ? (
            <>
              <ColumnGridUntrappedProvider>
                <ColumnGrid
                  items={ordinaryMemos}
                  getKey={getMemoKey}
                  renderItem={(memo) => props.renderer(memo, { compact: effectiveCompact })}
                  estimateHeight={estimateMemoCardHeight}
                  header={gridHeader}
                  leading={gridLeading}
                  priorityKey={priorityKey}
                  maxColumns={maxColumns}
                  maxColumnWidth={MAX_COLUMN_WIDTH}
                />
              </ColumnGridUntrappedProvider>
              {!isDisplayPending && footer}
            </>
          ) : (
            <>
              {headerContent}
              {leadingContent}
              <MemoFilters className="mb-2" />
              {initialLoader}
              {initialError}
              {newlyCreatedCard}
              {pinnedSection}
              {ordinaryMemos.map((memo) => props.renderer(memo, { compact: effectiveCompact }))}
              {emptyPlaceholder}
              {!isDisplayPending && footer}
            </>
          )}
        </div>
      </div>
    </MentionResolutionProvider>
  );

  return children;
};

const BackToTop = () => {
  const t = useTranslate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > 400;
      setIsVisible(shouldShow);
    };

    // A restored page can already be scrolled before the button mounts.
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    // Check at activation time to honor changes to the user's motion preference.
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  // Render nothing at all while hidden, so the list's end carries no phantom spacing.
  if (!isVisible) {
    return null;
  }

  return (
    <div className="my-4 flex w-full flex-row items-center justify-center opacity-70">
      <Button variant="ghost" onClick={scrollToTop}>
        {t("router.back-to-top")}
        <ArrowUpIcon className="ml-1 w-4 h-auto" />
      </Button>
    </div>
  );
};

export default PagedMemoList;
