import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/pages/Home";

const state = vi.hoisted(() => ({
  ready: true,
  canOpen: true,
  columns: 0,
  timeBasis: "update_time" as "update_time" | "create_time",
  selectedSpaceName: undefined as string | undefined,
  filters: [] as Array<{ factor: string; value: string }>,
  openEditor: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isUserSettingsInitialized: state.ready, userTagsSetting: { tags: {} } }),
}));
vi.mock("@/contexts/GlobalMemoEditorContext", () => ({
  useGlobalMemoEditor: () => ({ canOpen: state.canOpen, openEditor: state.openEditor }),
}));
vi.mock("@/contexts/ViewContext", () => ({
  useView: () => ({
    maxColumns: state.columns,
    setMaxColumns: (value: number) => {
      state.columns = value;
    },
    timeBasis: state.timeBasis,
    setTimeBasis: (value: "update_time" | "create_time") => {
      state.timeBasis = value;
    },
  }),
}));
vi.mock("@/contexts/MemoFilterContext", () => ({
  useMemoFilterContext: () => ({ filters: state.filters, setMemoView: vi.fn() }),
  isSearchFilter: (filter: { factor: string }) => filter.factor === "contentSearch" || filter.factor === "celSearch",
  getFilterSearch: () => "",
}));
vi.mock("@/contexts/SpaceContext", () => ({
  useSpaceContext: () => ({ memoFilter: undefined, selectedSpaceName: state.selectedSpaceName }),
}));
vi.mock("@/contexts/NewMemoContext", () => ({
  NewMemoProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/hooks", () => ({
  useMemoFilters: () => "",
  useMemoSorting: () => ({ listSort: undefined, orderBy: "create_time desc" }),
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  default: () => ({ name: "users/test" }),
}));
vi.mock("@/hooks/useMemoQueries", () => ({
  useInfiniteMemos: () => ({
    data: { pages: [{ memos: [{ name: "memos/first" }, { name: "memos/second" }, { name: "memos/third" }] }] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/lib/cel-filter", () => ({
  combineCELFilters: (...parts: Array<string | undefined>) => parts.filter(Boolean).join(" && "),
}));
vi.mock("@/components/HomeSearchBar", () => ({
  default: () => (
    <div role="search" data-testid="home-search">
      Search memos
    </div>
  ),
}));
vi.mock("@/components/MemoView", () => ({
  default: ({ memo }: { memo: { name: string } }) => <article>{memo.name}</article>,
}));
vi.mock("@/components/PagedMemoList", () => ({
  default: ({ filter }: { filter?: string }) => (
    <section data-testid="memo-feed" data-filter={filter}>
      Paginated memos
    </section>
  ),
  getMemoKey: (memo: { name: string }) => memo.name,
}));
vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) =>
    (
      ({
        "dashboard.grid-view": "Grid view",
        "dashboard.list-view": "List view",
        "dashboard.two-column-view": "Two-column view",
        "dashboard.memo-layout": "Memo layout",
        "dashboard.recent-memos": "Recent Memos",
        "dashboard.all-memos": "All Memos",
        "dashboard.date-modified": "Date modified",
        "dashboard.date-created": "Date created",
      }) as Record<string, string>
    )[key] ?? key,
}));

const show = (initialPath = "/") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Home />
    </MemoryRouter>,
  );

describe("Home mockup dashboard layout", () => {
  beforeEach(() => {
    state.ready = true;
    state.canOpen = true;
    state.columns = 0;
    state.timeBasis = "update_time";
    state.selectedSpaceName = undefined;
    state.filters = [];
    state.openEditor.mockClear();
  });

  it("shows one search, the banner, three recent cards and quick actions", () => {
    const { container } = show();
    const search = container.querySelector("[data-home-sticky-search]");
    expect(search).not.toBeNull();
    expect(screen.getAllByRole("search")).toHaveLength(1);
    expect(search).toContainElement(screen.getByTestId("home-search"));
    expect(screen.getByRole("heading", { name: /Capture your thoughts/i })).toBeInTheDocument();
    expect(container.querySelectorAll(".gc-dashboard-memos article")).toHaveLength(3);
    expect(container.querySelector(".gc-dashboard-memos-list")).toBeNull();
    expect(screen.getByRole("heading", { name: "Quick Actions" })).toBeInTheDocument();
    expect(screen.queryByTestId("memo-feed")).not.toBeInTheDocument();
  });

  it("wires Home quick actions to the composer and the intended destinations", () => {
    show();
    const actions = within(screen.getByRole("region", { name: "Quick Actions" }));

    fireEvent.click(actions.getByRole("button", { name: /New Memo/i }));
    expect(state.openEditor).toHaveBeenCalledOnce();
    expect(actions.getByRole("link", { name: /Manage Labels/i })).toHaveAttribute("href", "/?dashboard=labels");
    expect(actions.getByRole("link", { name: /Settings/i })).toHaveAttribute("href", "/setting");
    expect(actions.getByRole("button", { name: /Search Memos/i })).toBeEnabled();
  });

  it("focuses the existing Home search control when Quick Search is activated", () => {
    const searchField = document.createElement("input");
    searchField.id = "goreecloud-home-search";
    document.body.append(searchField);
    try {
      show();
      const actions = within(screen.getByRole("region", { name: "Quick Actions" }));
      fireEvent.click(actions.getByRole("button", { name: /Search Memos/i }));
      expect(searchField).toHaveFocus();
    } finally {
      searchField.remove();
    }
  });

  it("uses the existing global New Memo action and respects readiness", () => {
    state.ready = false;
    state.canOpen = false;
    const { rerender } = show();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Memo/i })).toBeDisabled();
    state.ready = true;
    state.canOpen = true;
    rerender(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
  });

  it("retains the floating compose flow and supports the dashboard grid/list switch", () => {
    const { container, rerender } = show();
    expect(container.querySelector(".gc-dashboard-fab")).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("region", { name: "Quick Actions" })).getByRole("button", { name: /New Memo/i }));
    expect(state.openEditor).toHaveBeenCalledOnce();
    expect(container.querySelector(".gc-dashboard-memos-masonry")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(state.columns).toBe(1);
    rerender(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(container.querySelector(".gc-dashboard-memos-list")).not.toBeNull();
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Grid view" }));
    expect(state.columns).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Two-column view" }));
    expect(state.columns).toBe(2);
  });

  it("generates actual server-side local-date filters for Today and This Week", () => {
    const { unmount } = show("/?dashboard=today");
    const today = screen.getByTestId("memo-feed");
    expect(today.dataset.filter).toContain("updated_ts");
    expect(today.dataset.filter).toContain("timestamp(");
    unmount();
    show("/?dashboard=week");
    const week = screen.getByTestId("memo-feed");
    expect(week.dataset.filter).toContain("updated_ts");
    expect(week.dataset.filter).toContain("timestamp(");
  });

  it("keeps only one Home search when switching Space scope", () => {
    const { rerender } = show();
    state.selectedSpaceName = "spaces/project";
    rerender(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("search")).toHaveLength(1);
  });

  it("moves from recent preview into the full paginated feed", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /View all/i }));
    expect(screen.getByTestId("memo-feed")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Capture your thoughts/i })).not.toBeInTheDocument();
  });

  it("applies the server-side private filter rather than filtering only loaded cards", () => {
    show("/?dashboard=private");
    expect(screen.getByTestId("memo-feed").getAttribute("data-filter")).toContain('visibility == "PRIVATE"');
  });
});
