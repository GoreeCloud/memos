import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/pages/Home";

const state = vi.hoisted(() => ({
  ready: true,
  canOpen: true,
  columns: 0,
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
  useTranslate: () => (key: string) => key,
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

  it("uses the existing global New Memo action and respects readiness", () => {
    state.ready = false;
    state.canOpen = false;
    const { rerender } = show();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editor.new-memo/i })).toBeDisabled();
    state.ready = true;
    state.canOpen = true;
    rerender(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
  });

  it("opens the global composer and switches preview from grid to list and back", () => {
    const { container, rerender } = show();
    const syncView = () =>
      rerender(
        <MemoryRouter>
          <Home />
        </MemoryRouter>,
      );
    fireEvent.click(screen.getByRole("button", { name: /editor.new-memo/i }));
    expect(state.openEditor).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    syncView();
    expect(container.querySelector(".gc-dashboard-memos-list")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Grid view" }));
    syncView();
    expect(container.querySelector(".gc-dashboard-memos-list")).toBeNull();
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
