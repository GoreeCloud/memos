import { Code, ConnectError } from "@connectrpc/connect";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PagedMemoList from "@/components/PagedMemoList";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

const view = vi.hoisted(() => ({ maxColumns: 1 as 0 | 1 | 2 | 3, compactMode: false }));
const feed = vi.hoisted(() => ({
  memos: [] as unknown[],
  hasNextPage: false,
  isLoading: false,
  fetchNextPage: vi.fn(async () => undefined),
  refetch: vi.fn(),
  error: null as ConnectError | null,
  isFetchNextPageError: false,
}));
const sidebar = vi.hoisted(() => ({ setQuickFindOpen: vi.fn() }));
const filterContext = vi.hoisted(() => ({ removeFilter: vi.fn() }));
const readiness = vi.hoisted(() => ({ userSettings: true }));
const memoQuery = vi.hoisted(() => ({ request: undefined as Record<string, unknown> | undefined }));

vi.mock("@/hooks/useMemoQueries", () => ({
  useInfiniteMemos: (request: Record<string, unknown>) => {
    memoQuery.request = request;
    return {
      data: { pages: [{ memos: feed.memos, nextPageToken: "" }] },
      fetchNextPage: feed.fetchNextPage,
      hasNextPage: feed.hasNextPage,
      isFetchingNextPage: false,
      isLoading: feed.isLoading,
      error: feed.error,
      isError: !!feed.error,
      isFetchNextPageError: feed.isFetchNextPageError,
      refetch: feed.refetch,
      isFetching: false,
    };
  },
}));

vi.mock("@/contexts/MemoFilterContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/contexts/MemoFilterContext")>()),
  useMemoFilterContext: () => ({ filters: [{ factor: "celSearch", value: "pinned" }], removeFilter: filterContext.removeFilter }),
}));

vi.mock("@/contexts/AppSidebarContext", () => ({ useAppSidebar: () => sidebar }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isUserSettingsInitialized: readiness.userSettings }),
}));

vi.mock("@/contexts/ViewContext", () => ({
  useView: () => view,
}));

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) => key,
}));

vi.mock("@/components/MemoContent/MentionResolutionContext", () => ({
  MentionResolutionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/MemoFilters", () => ({
  default: () => <div data-testid="memo-filters" />,
}));

const memo = { name: "memos/1", content: "hello", updateTime: undefined } as unknown as Memo;

const renderList = (
  renderer: (memo: Memo, options: { compact: boolean }) => React.ReactElement = () => <div />,
  options: { leading?: React.ReactNode; groupPinned?: boolean } = {},
) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PagedMemoList
        renderer={renderer}
        groupPinned={options.groupPinned}
        renderLeading={options.leading ? () => options.leading : undefined}
      />
    </QueryClientProvider>,
  );

describe("<PagedMemoList>", () => {
  beforeEach(() => {
    view.maxColumns = 1;
    view.compactMode = false;
    feed.memos = [];
    feed.hasNextPage = false;
    feed.isLoading = false;
    feed.fetchNextPage.mockClear();
    feed.refetch.mockClear();
    feed.error = null;
    feed.isFetchNextPageError = false;
    sidebar.setQuickFindOpen.mockClear();
    filterContext.removeFilter.mockClear();
    readiness.userSettings = true;
    memoQuery.request = undefined;
  });

  it.each([1, 0] as const)("separates loaded pinned notes from the ordinary feed in layout %i", (columns) => {
    view.maxColumns = columns;
    const spy = vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1200);
    try {
      feed.memos = [
        { name: "memos/pin", content: "#work", pinned: true },
        { name: "memos/other", content: "other", pinned: false },
      ];
      renderList(
        (memo) => (
          <div key={memo.name} data-testid={"memo-" + memo.name}>
            {memo.content}
          </div>
        ),
        {
          groupPinned: true,
          leading: <div data-testid="composer">Editor</div>,
        },
      );
      const section = screen.getByRole("region", { name: "home.pinned-memos" });
      expect(section).toContainElement(screen.getByTestId("memo-memos/pin"));
      expect(screen.getAllByTestId("memo-memos/pin")).toHaveLength(1);
      expect(screen.getAllByTestId("memo-memos/other")).toHaveLength(1);
      expect(screen.getByTestId("composer")).toBeInTheDocument();
      expect(screen.getByTestId("composer").compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps the Home composer mounted when the first memo is pinned or unpinned", () => {
    view.maxColumns = 0;
    const widthSpy = vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1200);
    try {
      const client = new QueryClient();
      const renderHomeList = () => (
        <QueryClientProvider client={client}>
          <PagedMemoList
            groupPinned
            renderer={(memo) => <div key={memo.name}>{memo.content}</div>}
            renderLeading={() => <div data-testid="persistent-composer">Writing a draft</div>}
          />
        </QueryClientProvider>
      );
      feed.memos = [{ name: "memos/regular", content: "Regular", pinned: false }];
      const { rerender } = render(renderHomeList());
      const composer = screen.getByTestId("persistent-composer");
      feed.memos = [
        { name: "memos/pin", content: "Pinned", pinned: true },
        { name: "memos/regular", content: "Regular", pinned: false },
      ];
      rerender(renderHomeList());
      expect(screen.getByRole("region", { name: "home.pinned-memos" })).toBeInTheDocument();
      expect(screen.getByTestId("persistent-composer")).toBe(composer);
      feed.memos = [{ name: "memos/regular", content: "Regular", pinned: false }];
      rerender(renderHomeList());
      expect(screen.queryByRole("region", { name: "home.pinned-memos" })).not.toBeInTheDocument();
      expect(screen.getByTestId("persistent-composer")).toBe(composer);
    } finally {
      widthSpy.mockRestore();
    }
  });

  it.each([1, 0] as const)("shows recoverable validation errors in layout %i instead of an empty state", (columns) => {
    view.maxColumns = columns;
    const widthSpy = vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1200);
    try {
      feed.error = new ConnectError("unknown identifier <script>bad</script>", Code.InvalidArgument);
      renderList();
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("search.invalid-expression");
      expect(alert).toHaveTextContent("unknown identifier <script>bad</script>");
      expect(alert.querySelector("script")).toBeNull();
      expect(screen.queryByText("home.no-results-title")).not.toBeInTheDocument();
      expect(screen.getByTestId("memo-filters")).toBeInTheDocument();
      if (columns === 0) expect(alert.closest(".absolute")).not.toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "search.edit-query" }));
      expect(sidebar.setQuickFindOpen).toHaveBeenCalledWith(true);
      fireEvent.click(screen.getByRole("button", { name: "search.clear-query" }));
      const remove = filterContext.removeFilter.mock.calls[0][0];
      expect(remove({ factor: "celSearch" })).toBe(true);
      expect(remove({ factor: "contentSearch" })).toBe(true);
      expect(remove({ factor: "tagSearch" })).toBe(false);
      expect(screen.queryByRole("button", { name: "search.retry" })).not.toBeInTheDocument();
    } finally {
      widthSpy.mockRestore();
    }
  });

  it.each([Code.PermissionDenied, Code.Unauthenticated])("shows access errors separately (%i)", (code) => {
    feed.error = new ConnectError("denied", code);
    renderList();
    expect(screen.getByRole("alert")).toHaveTextContent("search.access-error");
    expect(screen.queryByText("search.invalid-expression")).not.toBeInTheDocument();
  });

  it("retries initial network errors", () => {
    feed.error = new ConnectError("offline", Code.Unavailable);
    renderList();
    expect(screen.getByRole("alert")).toHaveTextContent("search.load-error");
    fireEvent.click(screen.getByRole("button", { name: "search.retry" }));
    expect(feed.refetch).toHaveBeenCalledOnce();
    expect(feed.fetchNextPage).not.toHaveBeenCalled();
  });

  it("keeps prior pages but stops automatic pagination after a failed page until Retry", async () => {
    vi.useFakeTimers();
    try {
      feed.memos = [memo];
      feed.hasNextPage = true;
      feed.error = new ConnectError("offline", Code.Unavailable);
      feed.isFetchNextPageError = true;
      renderList((memo) => <div>{memo.content}</div>);
      expect(screen.getByText("hello")).toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(1000));
      fireEvent.scroll(window);
      expect(feed.fetchNextPage).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "search.retry" }));
      expect(feed.fetchNextPage).toHaveBeenCalledOnce();
      expect(feed.refetch).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reveals Back to top on a restored scroll position and honors reduced motion", () => {
    feed.memos = [memo];
    const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", { configurable: true, value: 650 });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));

    try {
      renderList();
      const button = screen.getByRole("button", { name: "router.back-to-top" });
      fireEvent.click(button);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "auto" });

      // The preference is checked for each action, not cached at mount.
      vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
      fireEvent.click(button);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "smooth" });

      Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
      fireEvent.scroll(window);
      expect(screen.queryByRole("button", { name: "router.back-to-top" })).not.toBeInTheDocument();
    } finally {
      if (originalScrollY) Object.defineProperty(window, "scrollY", originalScrollY);
      scrollTo.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("does not resume automatic page fetching after unmount", async () => {
    vi.useFakeTimers();
    try {
      feed.memos = [memo];
      feed.hasNextPage = true;
      const { unmount } = renderList((entry) => <div>{entry.content}</div>);
      expect(screen.getByText("hello")).toBeInTheDocument();

      // The 200ms short-page check is pending when the user navigates away.
      // It must not read a torn-down document or fetch another page.
      unmount();
      await act(async () => vi.advanceTimersByTimeAsync(800));
      expect(feed.fetchNextPage).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps fetched memo content hidden until privacy settings settle", () => {
    feed.memos = [memo];
    readiness.userSettings = false;
    const renderer = vi.fn((m: Memo) => <div key={m.name}>{m.content}</div>);

    renderList(renderer);

    expect(renderer).not.toHaveBeenCalled();
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
  });

  it("renders fetched memo content once privacy settings settle", () => {
    feed.memos = [memo];
    const renderer = vi.fn((m: Memo) => <div key={m.name}>{m.content}</div>);

    renderList(renderer);

    expect(renderer).toHaveBeenCalled();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("does not auto-fetch more pages before privacy settings settle", async () => {
    vi.useFakeTimers();
    try {
      feed.memos = [memo];
      feed.hasNextPage = true;
      readiness.userSettings = false;

      renderList();
      await act(async () => vi.advanceTimersByTimeAsync(1000));

      expect(feed.fetchNextPage).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("auto-fetches more pages once memo data is ready", async () => {
    vi.useFakeTimers();
    try {
      feed.memos = [memo];
      feed.hasNextPage = true;

      renderList();
      await act(async () => vi.advanceTimersByTimeAsync(200));

      expect(feed.fetchNextPage).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("delays the initial loading spinner to avoid flashing on fast loads", async () => {
    vi.useFakeTimers();
    try {
      feed.isLoading = true;
      const { container } = renderList();

      expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(249));
      expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps route-owned leading content visible while memos load", () => {
    feed.isLoading = true;

    renderList(undefined, { leading: <div data-testid="leading-content" /> });

    expect(screen.getByTestId("leading-content")).toBeInTheDocument();
  });

  it("shows the redesigned memo welcome panel instead of the old illustration", () => {
    renderList();

    expect(screen.getByText("home.no-results-title")).toBeInTheDocument();
    expect(screen.getByTestId("memos-empty-state")).toBeInTheDocument();
  });

  it("combines the selected Space filter with the memo list filter", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PagedMemoList renderer={() => <div />} contextFilter={'space == "spaces/product"'} filter="pinned == true" />
      </QueryClientProvider>,
    );

    expect(memoQuery.request).toMatchObject({
      filter: '(space == "spaces/product") && (pinned == true)',
    });
  });

  it("shows the empty state below route-owned leading content", () => {
    renderList(undefined, { leading: <div data-testid="leading-content" /> });

    expect(screen.getByTestId("leading-content")).toBeInTheDocument();
    expect(screen.getByText("home.no-results-title")).toBeInTheDocument();
    expect(screen.getByTestId("memos-empty-state")).toBeInTheDocument();
  });

  it("places leading content and the empty state in the first grid column", () => {
    view.maxColumns = 0;
    const widthSpy = vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1200);
    try {
      renderList(undefined, { leading: <div data-testid="leading-content" /> });

      const leadingTile = screen.getByText("home.no-results-title").closest(".absolute");
      expect(leadingTile).not.toBeNull();
      expect(leadingTile).toContainElement(screen.getByTestId("leading-content"));
    } finally {
      widthSpy.mockRestore();
    }
  });

  describe("compact policy", () => {
    beforeEach(() => {
      feed.memos = [memo];
    });

    it("threads compact=false at one column with compact mode off", () => {
      const renderer = vi.fn((m: Memo) => <div key={m.name} />);
      renderList(renderer);
      expect(renderer).toHaveBeenCalledWith(expect.objectContaining({ name: "memos/1" }), { compact: false });
    });

    it("threads compact=true at one column with compact mode on", () => {
      view.compactMode = true;
      const renderer = vi.fn((m: Memo) => <div key={m.name} />);
      renderList(renderer);
      expect(renderer).toHaveBeenCalledWith(expect.objectContaining({ name: "memos/1" }), { compact: true });
    });

    it("respects the compact setting in the narrow-width fallback even when columns are allowed", () => {
      // jsdom measures 0px, so the flow fallback renders and behaves exactly like maxColumns = 1.
      view.maxColumns = 0;
      const renderer = vi.fn((m: Memo) => <div key={m.name} />);
      renderList(renderer);
      expect(renderer).toHaveBeenCalledWith(expect.objectContaining({ name: "memos/1" }), { compact: false });
    });

    it("forces compact once the width fits the grid", () => {
      view.maxColumns = 0;
      const widthSpy = vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1200);
      try {
        const renderer = vi.fn((m: Memo) => <div key={m.name} />);
        renderList(renderer);
        expect(renderer).toHaveBeenCalledWith(expect.objectContaining({ name: "memos/1" }), { compact: true });
      } finally {
        widthSpy.mockRestore();
      }
    });
  });
});
