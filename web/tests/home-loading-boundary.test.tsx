import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/pages/Home";

const state = vi.hoisted(() => ({
  selectedSpaceName: undefined as string | undefined,
  query: undefined as Record<string, unknown> | undefined,
  ready: true,
  openEditor: vi.fn(),
}));
vi.mock("@/components/HomeSearchBar", () => ({
  default: () => <div role="search" data-testid="home-search-bar" />,
}));
vi.mock("@/components/MemoView", () => ({
  default: ({ memo }: { memo: { name: string } }) => <article data-testid="memo-view">{memo.name}</article>,
}));
vi.mock("@/components/PagedMemoList", () => ({
  default: () => <section data-testid="memo-feed">Full feed</section>,
  getMemoKey: (memo: { name: string }) => memo.name,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isUserSettingsInitialized: state.ready, userTagsSetting: { tags: {} } }),
}));
vi.mock("@/contexts/GlobalMemoEditorContext", () => ({
  useGlobalMemoEditor: () => ({ canOpen: true, openEditor: state.openEditor }),
}));
vi.mock("@/contexts/ViewContext", () => ({
  useView: () => ({ maxColumns: 1, setMaxColumns: vi.fn() }),
}));
vi.mock("@/contexts/MemoFilterContext", () => ({
  isSearchFilter: (filter: { factor: string }) => filter.factor === "contentSearch" || filter.factor === "celSearch",
  useMemoFilterContext: () => ({ filters: [], setMemoView: vi.fn() }),
  getFilterSearch: () => "",
}));
vi.mock("@/contexts/NewMemoContext", () => ({
  NewMemoProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/contexts/SpaceContext", () => ({
  useSpaceContext: () => ({
    selectedSpaceName: state.selectedSpaceName,
    memoFilter: state.selectedSpaceName ? `space == "${state.selectedSpaceName}"` : undefined,
  }),
}));
vi.mock("@/hooks", () => ({
  useMemoFilters: () => "",
  useMemoSorting: () => ({ listSort: undefined, orderBy: "create_time desc" }),
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  default: () => ({ name: "users/1" }),
}));
vi.mock("@/hooks/useMemoQueries", () => ({
  useInfiniteMemos: (options: Record<string, unknown>) => {
    state.query = options;
    return { data: { pages: [{ memos: [{ name: "memos/1" }] }] }, isLoading: false, isError: false, refetch: vi.fn() };
  },
}));
vi.mock("@/lib/cel-filter", () => ({
  combineCELFilters: (...parts: Array<string | undefined>) => parts.filter(Boolean).join(" && "),
}));
vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) => key,
}));

const show = () =>
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );

describe("Home dashboard loading and Space boundaries", () => {
  beforeEach(() => {
    state.selectedSpaceName = undefined;
    state.query = undefined;
    state.ready = true;
    state.openEditor.mockClear();
  });

  it("renders real memo previews with a functioning New Memo action instead of an inline composer", () => {
    show();
    const search = screen.getByTestId("home-search-bar");
    const memo = screen.getByTestId("memo-view");
    expect(search.compareDocumentPosition(memo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByTestId("memo-view")).toHaveLength(1);
    // The Home Quick Action has a visible accessible label; the global floating editor trigger lives in the app shell.
    fireEvent.click(screen.getByRole("button", { name: /^New Memo\b/ }));
    expect(state.openEditor).toHaveBeenCalledOnce();
    expect(state.query).toMatchObject({ state: 1, pageSize: 3 });
  });

  it("passes selected Space restrictions through to the server-backed preview query", () => {
    state.selectedSpaceName = "spaces/product";
    show();
    expect(state.query?.filter).toContain('space == "spaces/product"');
    expect(screen.getByTestId("memo-view")).toBeInTheDocument();
  });
});
