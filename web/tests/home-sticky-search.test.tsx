import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/pages/Home";

const state = vi.hoisted(() => ({
  ready: true,
  selectedSpaceName: undefined as string | undefined,
  filters: [] as Array<{ factor: string; value: string }>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isUserSettingsInitialized: state.ready }),
}));
vi.mock("@/contexts/GlobalMemoEditorContext", () => ({
  useGlobalMemoEditor: () => ({ claimHomeAutoFocus: false }),
}));
vi.mock("@/contexts/MemoFilterContext", () => ({
  useMemoFilterContext: () => ({ filters: state.filters }),
  isSearchFilter: (filter: { factor: string }) => filter.factor === "contentSearch" || filter.factor === "celSearch",
}));
vi.mock("@/contexts/SpaceContext", () => ({
  useSpaceContext: () => ({ memoFilter: undefined, selectedSpaceName: state.selectedSpaceName }),
}));
vi.mock("@/contexts/NewMemoContext", () => ({
  NewMemoProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/hooks", () => ({
  useMemoFilters: () => ({}),
  useMemoSorting: () => ({ listSort: undefined, orderBy: undefined }),
}));
vi.mock("@/hooks/useCurrentUser", () => ({
  default: () => ({ name: "users/test" }),
}));
vi.mock("@/components/HomeSearchBar", () => ({
  default: () => <div role="search" data-testid="home-search">Search memos</div>,
}));
vi.mock("@/components/MemoEditor", () => ({
  default: ({ cacheKey }: { cacheKey: string }) => <textarea data-testid="home-composer" data-cache-key={cacheKey} />,
}));
vi.mock("@/components/MemoView", () => ({
  default: () => <div>Memo</div>,
}));
vi.mock("@/components/PagedMemoList", () => ({
  default: ({
    renderHeader,
    renderLeading,
  }: {
    renderHeader?: () => ReactNode;
    renderLeading?: (options: { useGrid: boolean }) => ReactNode;
  }) => (
    <section data-testid="memo-feed">
      {renderHeader?.()}
      {renderLeading?.({ useGrid: true })}
      <div data-testid="loaded-memos">Loaded memos</div>
    </section>
  ),
  getMemoKey: (memo: { name: string }) => memo.name,
}));
vi.mock("@/components/MemoEditor/utils/deriveDefaultCreateTime", () => ({
  deriveDefaultCreateTimeFromFilters: () => undefined,
}));
vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) => key,
}));

describe("Home sticky search layout", () => {
  beforeEach(() => {
    state.ready = true;
    state.selectedSpaceName = undefined;
    state.filters = [];
  });

  it("renders exactly one search above the paginated feed and keeps the composer in the feed", () => {
    const { container } = render(<Home />);
    const stickyHeader = container.querySelector("[data-home-sticky-search]");
    const feed = screen.getByTestId("memo-feed");

    expect(stickyHeader).not.toBeNull();
    expect(screen.getAllByRole("search")).toHaveLength(1);
    expect(stickyHeader).toContainElement(screen.getByTestId("home-search"));
    expect((stickyHeader?.compareDocumentPosition(feed) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(feed).toContainElement(screen.getByTestId("home-composer"));
    expect(stickyHeader).not.toContainElement(screen.getByTestId("home-composer"));
    expect(screen.getByTestId("loaded-memos")).toBeInTheDocument();
  });

  it("does not expose search or the composer until settings are initialized", () => {
    state.ready = false;
    const { container, rerender } = render(<Home />);
    expect(container.querySelector("[data-home-sticky-search]")).toBeNull();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-composer")).not.toBeInTheDocument();
    expect(screen.getByTestId("memo-feed")).toBeInTheDocument();

    state.ready = true;
    rerender(<Home />);
    expect(screen.getAllByRole("search")).toHaveLength(1);
    expect(screen.getByTestId("home-composer")).toBeInTheDocument();
  });

  it("preserves responsive sticky offsets and does not duplicate search when the Space changes", () => {
    const { container, rerender } = render(<Home />);
    const header = container.querySelector("[data-home-sticky-search]");
    expect(header).toHaveClass("sticky", "top-12", "md:top-0");
    expect(screen.getAllByRole("search")).toHaveLength(1);
    const previousCacheKey = screen.getByTestId("home-composer").getAttribute("data-cache-key");

    state.selectedSpaceName = "spaces/project";
    rerender(<Home />);
    expect(container.querySelectorAll("[data-home-sticky-search]")).toHaveLength(1);
    expect(screen.getAllByRole("search")).toHaveLength(1);
    expect(screen.getByTestId("home-composer").getAttribute("data-cache-key")).not.toBe(previousCacheKey);
  });
});
