import {
  ChevronRightIcon,
  CloudIcon,
  Grid2X2Icon,
  ListIcon,
  LockKeyholeIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SquarePenIcon,
  TagIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ColumnGrid, { ColumnGridUntrappedProvider } from "@/components/ColumnGrid";
import HomeSearchBar from "@/components/HomeSearchBar";
import MemoDisplaySettingMenu from "@/components/MemoDisplaySettingMenu";
import MemoView from "@/components/MemoView";
import PagedMemoList, { getMemoKey } from "@/components/PagedMemoList";
import { estimateMemoCardHeight } from "@/components/PagedMemoList/memoCardHeight";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalMemoEditor } from "@/contexts/GlobalMemoEditorContext";
import { getFilterSearch, isSearchFilter, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { NewMemoProvider } from "@/contexts/NewMemoContext";
import { useSpaceContext } from "@/contexts/SpaceContext";
import { useView } from "@/contexts/ViewContext";
import { useMemoFilters, useMemoSorting } from "@/hooks";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useInfiniteMemos } from "@/hooks/useMemoQueries";
import { combineCELFilters } from "@/lib/cel-filter";
import { buildCollectionPath, ROUTES } from "@/router/routes";
import { State } from "@/types/proto/api/v1/common_pb";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import "./Home.css";
import "./Home.mobile.css";
import "./Home.masonry.css";

type DashboardSection = "home" | "all" | "favorites" | "private" | "labels" | "recent" | "tasks";
export const parseDashboardSection = (value: string | null): DashboardSection =>
  value === "all" || value === "favorites" || value === "private" || value === "labels" || value === "recent" || value === "tasks"
    ? value
    : "home";

const SECTION_FILTERS: Record<DashboardSection, string | undefined> = {
  home: undefined,
  all: undefined,
  favorites: "pinned",
  private: 'visibility == "PRIVATE"',
  labels: undefined,
  recent: undefined,
  tasks: "has_task_list",
};

const WelcomeArtwork = () => (
  <div className="gc-dashboard-art" aria-hidden="true">
    <div className="gc-dashboard-orbit" />
    <div className="gc-dashboard-orbit-secondary" />
    <div className="gc-dashboard-paper gc-dashboard-paper-back">
      <i />
      <i />
      <i />
      <i />
    </div>
    <div className="gc-dashboard-paper gc-dashboard-paper-front">
      <i />
      <i />
      <span className="gc-dashboard-paper-icon">
        <SquarePenIcon />
      </span>
      <i />
      <i />
      <i />
    </div>
    <span className="gc-dashboard-float gc-dashboard-float-cloud">
      <CloudIcon />
    </span>
    <span className="gc-dashboard-float gc-dashboard-float-lock">
      <LockKeyholeIcon />
    </span>
    <span className="gc-dashboard-float gc-dashboard-float-label">
      <TagIcon />
    </span>
  </div>
);

const WELCOME_FEATURES = [
  { icon: SquarePenIcon, title: "Fast & Simple", description: "Jot down ideas quickly", tone: "blue" },
  { icon: CloudIcon, title: "Sync Anywhere", description: "Access memos across devices", tone: "green" },
  { icon: ShieldCheckIcon, title: "Private by Default", description: "Keep your thoughts secure", tone: "purple" },
  { icon: TagIcon, title: "Organize with Labels", description: "Find what you need easily", tone: "yellow" },
] as const;

const Home = ({ allMemos = false }: { allMemos?: boolean }) => {
  const currentUser = useCurrentUser();
  const { isUserSettingsInitialized, userTagsSetting } = useAuth();
  const { canOpen, openEditor } = useGlobalMemoEditor();
  const { maxColumns, setMaxColumns } = useView();
  const dashboardGrid = maxColumns !== 1;
  const { filters, setMemoView } = useMemoFilterContext();
  const { selectedSpaceName, memoFilter: contextFilter } = useSpaceContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = parseDashboardSection(searchParams.get("dashboard"));
  const section = allMemos && requestedSection === "home" ? "all" : requestedSection;
  const hasSearch = filters.some(isSearchFilter);
  const isDashboard = !allMemos && section === "home" && !hasSearch;
  const basePath = buildCollectionPath(ROUTES.HOME, selectedSpaceName);
  const memoFilter = useMemoFilters({
    creatorName: hasSearch ? undefined : currentUser?.name,
    includeMemoViews: true,
    includePinned: true,
  });
  const { listSort, orderBy } = useMemoSorting({ pinnedFirst: false, state: State.NORMAL });
  const sectionFilter = hasSearch ? undefined : SECTION_FILTERS[section];
  const queryFilter = combineCELFilters(combineCELFilters(contextFilter, memoFilter), sectionFilter);
  const { data, isLoading, isError, refetch } = useInfiniteMemos(
    { state: State.NORMAL, filter: queryFilter, pageSize: 3, orderBy },
    { enabled: isUserSettingsInitialized && isDashboard },
  );
  const recentMemos = useMemo(() => {
    const page = data?.pages[0]?.memos ?? [];
    return listSort ? listSort(page).slice(0, 3) : page.slice(0, 3);
  }, [data, listSort]);

  const visibleLabels = [...new Set(Object.keys(userTagsSetting?.tags ?? {}).filter((tag) => tag && !tag.includes(".*")))].sort((a, b) =>
    a.localeCompare(b),
  );
  const navigateToAll = () => {
    const next = new URLSearchParams(searchParams);
    next.set("dashboard", "all");
    setSearchParams(next);
  };
  const handleLabel = (label: string) => {
    setMemoView(undefined);
    const next = new URLSearchParams(getFilterSearch([{ factor: "tagSearch", value: label }]));
    next.set("dashboard", "all");
    setSearchParams(next);
  };
  const title =
    section === "home" || section === "recent"
      ? "Recent Memos"
      : {
          all: "All Memos",
          favorites: "Pinned",
          private: "Private Memos",
          labels: "Labels",
          tasks: "My Tasks",
        }[section];

  return (
    <NewMemoProvider>
      <div className="gc-dashboard" data-dashboard-home>
        <div className="gc-dashboard-controls">
          <div className="gc-dashboard-search" data-home-sticky-search>
            {isUserSettingsInitialized && <HomeSearchBar />}
          </div>
          <div className="gc-dashboard-tools">
            <div className="gc-dashboard-layout-toggle" role="group" aria-label="Memo layout">
              <button type="button" aria-label="Grid view" aria-pressed={dashboardGrid} onClick={() => setMaxColumns(0)}>
                <Grid2X2Icon size={19} aria-hidden="true" />
              </button>
              <button type="button" aria-label="List view" aria-pressed={!dashboardGrid} onClick={() => setMaxColumns(1)}>
                <ListIcon size={19} aria-hidden="true" />
              </button>
              <MemoDisplaySettingMenu className="gc-dashboard-view-settings" />
            </div>
          </div>
        </div>
        {isDashboard && (
          <section className="gc-dashboard-welcome" aria-label="Welcome to GoreeCloud Memos">
            <div className="gc-dashboard-welcome-copy">
              <h1>
                Capture your thoughts, <span>anywhere.</span>
              </h1>
              <p>Keep your ideas, notes, and to-dos organized and in sync with GoreeCloud.</p>
              <div className="gc-dashboard-features">
                {WELCOME_FEATURES.map(({ icon: Icon, title: name, description, tone }) => (
                  <div className="gc-dashboard-feature" key={name}>
                    <span className={`gc-dashboard-feature-icon gc-dashboard-${tone}`}>
                      <Icon aria-hidden="true" size={21} />
                    </span>
                    <span>
                      <strong>{name}</strong>
                      <small>{description}</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <WelcomeArtwork />
          </section>
        )}
        <section aria-label={hasSearch ? "Search results" : title} className="gc-dashboard-results">
          <div className="gc-dashboard-section-heading">
            <h2>{hasSearch ? "Search results" : title}</h2>
            {isDashboard && (
              <button className="gc-dashboard-all" type="button" onClick={navigateToAll}>
                View all <ChevronRightIcon size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          {section === "labels" && !hasSearch ? (
            <div className="gc-dashboard-labels">
              {visibleLabels.length ? (
                visibleLabels.map((label) => (
                  <button type="button" key={label} onClick={() => handleLabel(label)}>
                    <TagIcon size={17} /> {label}
                  </button>
                ))
              ) : (
                <p>No configured labels yet. Add labels from a memo or your settings.</p>
              )}
            </div>
          ) : isDashboard ? (
            isLoading ? (
              <p className="gc-dashboard-empty" role="status">
                Loading your memos…
              </p>
            ) : isError ? (
              <div className="gc-dashboard-empty" role="alert">
                Unable to load memos.{" "}
                <button type="button" onClick={() => void refetch()}>
                  Retry
                </button>
              </div>
            ) : recentMemos.length ? (
              <div
                className={dashboardGrid ? "gc-dashboard-memos gc-dashboard-memos-masonry" : "gc-dashboard-memos gc-dashboard-memos-list"}
              >
                {dashboardGrid ? (
                  <ColumnGridUntrappedProvider>
                    <ColumnGrid
                      items={recentMemos}
                      getKey={getMemoKey}
                      estimateHeight={estimateMemoCardHeight}
                      maxColumns={maxColumns === 0 ? 3 : maxColumns}
                      maxColumnWidth={420}
                      renderItem={(memo) => (
                        <MemoView
                          memo={memo}
                          showVisibility
                          showPinned
                          showSpace={!selectedSpaceName}
                          compact
                          className="gc-dashboard-memo"
                        />
                      )}
                    />
                  </ColumnGridUntrappedProvider>
                ) : (
                  recentMemos.map((memo) => (
                    <MemoView
                      key={getMemoKey(memo)}
                      memo={memo}
                      showVisibility
                      showPinned
                      showSpace={!selectedSpaceName}
                      compact
                      className="gc-dashboard-memo"
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="gc-dashboard-empty">
                No memos yet.{" "}
                <button type="button" onClick={openEditor} disabled={!canOpen}>
                  Create your first memo
                </button>
              </div>
            )
          ) : (
            <div className="gc-dashboard-feed">
              <PagedMemoList
                renderer={(memo: Memo, { compact }) => (
                  <MemoView key={getMemoKey(memo)} memo={memo} showVisibility showPinned showSpace={!selectedSpaceName} compact={compact} />
                )}
                listSort={listSort}
                orderBy={orderBy}
                filter={combineCELFilters(memoFilter, sectionFilter)}
                contextFilter={contextFilter}
              />
            </div>
          )}
        </section>
        {isDashboard && (
          <section className="gc-dashboard-quick" aria-label="Quick Actions">
            <h2>Quick Actions</h2>
            <div className="gc-dashboard-quick-grid">
              <button type="button" className="gc-dashboard-action" disabled={!canOpen} onClick={openEditor}>
                <span className="gc-dashboard-action-icon gc-dashboard-blue">
                  <SquarePenIcon />
                </span>
                <span>
                  <strong>New Memo</strong>
                  <small>Start writing a new memo right now.</small>
                </span>
                <ChevronRightIcon className="gc-dashboard-action-arrow" size={19} />
              </button>
              <Link className="gc-dashboard-action" to={`${basePath}?dashboard=labels`}>
                <span className="gc-dashboard-action-icon gc-dashboard-purple">
                  <TagIcon />
                </span>
                <span>
                  <strong>Manage Labels</strong>
                  <small>Organize your memos with labels.</small>
                </span>
                <ChevronRightIcon className="gc-dashboard-action-arrow" size={19} />
              </Link>
              <button
                type="button"
                className="gc-dashboard-action"
                onClick={() => document.getElementById("goreecloud-home-search")?.focus()}
              >
                <span className="gc-dashboard-action-icon gc-dashboard-green">
                  <SearchIcon />
                </span>
                <span>
                  <strong>Search Memos</strong>
                  <small>Find anything in your memos instantly.</small>
                </span>
                <ChevronRightIcon className="gc-dashboard-action-arrow" size={19} />
              </button>
              <Link className="gc-dashboard-action" to={ROUTES.SETTING}>
                <span className="gc-dashboard-action-icon gc-dashboard-orange">
                  <Settings2Icon />
                </span>
                <span>
                  <strong>Settings</strong>
                  <small>Customize your memo experience.</small>
                </span>
                <ChevronRightIcon className="gc-dashboard-action-arrow" size={19} />
              </Link>
            </div>
          </section>
        )}
      </div>
    </NewMemoProvider>
  );
};
export default Home;
