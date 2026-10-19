import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, render as testingLibraryRender, within } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppSidebar, { MobileAppHeader, MobileAppSidebar } from "@/components/AppSidebar";
import { type MemoFilter, parseFilterQuery } from "@/contexts/MemoFilterContext";
import { resolveCollectionRoute } from "@/router/routes";

const authState = vi.hoisted(() => ({
  currentUser: { name: "users/test", username: "test" } as { name: string; username: string } | undefined,
  memoViews: [] as Array<{ name: string; title: string }>,
  notifications: [] as Array<{ status: number }>,
}));
const sidebarState = vi.hoisted(() => ({
  memoScope: "home" as "home" | "explore",
  memoDetail: undefined as { memo: { name: string } } | undefined,
  mobileOpen: false,
  setMobileOpen: vi.fn(),
  setQuickFindOpen: vi.fn(),
}));
const globalEditorState = vi.hoisted(() => ({
  canOpen: true,
  openEditor: vi.fn(),
}));
const spaceState = vi.hoisted(() => ({
  spaces: [] as Array<{ name: string; title: string; description: string }>,
  selectedSpace: undefined as { name: string; title: string; description: string } | undefined,
  selectSpace: vi.fn(),
}));
const memoDetailPanelRender = vi.hoisted(() => vi.fn());
const filteredStatsHook = vi.hoisted(() => vi.fn());
const filterState = vi.hoisted(() => ({ filters: [] as MemoFilter[] }));
const tagsSectionHook = vi.hoisted(() => vi.fn());

vi.mock("@/components/MemosLogo", () => ({
  default: ({ size }: { size?: string }) => <span data-logo-size={size}>Memos logo</span>,
}));

vi.mock("@/components/MemoDetailSidebar", () => ({
  MemoDetailSidebar: ({ memo }: { memo: { name: string } }) => {
    memoDetailPanelRender(memo.name);
    return (
      <section aria-label="Memo details" data-testid="memo-detail-lazy-panel">
        {memo.name}
      </section>
    );
  },
}));

vi.mock("@/components/MemoDisplaySettingMenu", () => ({
  default: () => <button type="button">memo.view-options</button>,
}));

vi.mock("@/components/UserMenu", () => ({
  default: () => (
    <button type="button" className="w-full">
      User menu
    </button>
  ),
}));

vi.mock("@/components/CreateSpaceDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/StatisticsView", () => ({
  default: () => <div>Calendar</div>,
}));

vi.mock("@/components/AppSidebar/TagsSection", () => ({
  default: (props: unknown) => {
    tagsSectionHook(props);
    return <div>Tags</div>;
  },
}));

vi.mock("@/contexts/AppSidebarContext", () => ({
  useAppSidebar: () => ({
    attachmentSection: "all",
    setAttachmentSection: vi.fn(),
    inboxFilter: "all",
    setInboxFilter: vi.fn(),
    memoDetail: sidebarState.memoDetail,
    setMemoDetail: vi.fn(),
    closeMobileThen: (callback: () => void) => callback(),
    mobileOpen: sidebarState.mobileOpen,
    setMobileOpen: sidebarState.setMobileOpen,
    quickFindOpen: false,
    setQuickFindOpen: sidebarState.setQuickFindOpen,
    memoScope: sidebarState.memoScope,
    setMemoScope: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isInitialized: true }),
}));

vi.mock("@/contexts/GlobalMemoEditorContext", () => ({
  useGlobalMemoEditor: () => globalEditorState,
}));

vi.mock("@/contexts/InstanceContext", () => ({
  useInstance: () => ({ isInitialized: true }),
}));

vi.mock("@/contexts/MemoFilterContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/contexts/MemoFilterContext")>()),
  useMemoFilterContext: () => ({
    filters: filterState.filters,
    memoView: undefined,
    setMemoView: vi.fn(),
  }),
}));

vi.mock("@/contexts/SpaceContext", () => ({
  useSpaceContext: () => {
    const { spaceName } = resolveCollectionRoute(useLocation().pathname);
    const duplicateSpaceTitles = new Set(
      spaceState.spaces
        .filter((space, index) => spaceState.spaces.findIndex((candidate) => candidate.title === space.title) !== index)
        .map((space) => space.title),
    );
    return {
      ...spaceState,
      selectedSpaceName: spaceName,
      selectedSpace: spaceName ? spaceState.selectedSpace : undefined,
      memoFilter: spaceName ? `space == ${JSON.stringify(spaceName)}` : undefined,
      duplicateSpaceTitles,
      isLoadingSpaces: false,
      isSpacesError: false,
    };
  },
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  default: () => authState.currentUser,
}));

vi.mock("@/hooks/useFilteredMemoStats", () => ({
  useFilteredMemoStats: (options: unknown) => {
    filteredStatsHook(options);
    return { statistics: { activityStats: {}, timeBasis: "create_time" }, tags: {} };
  },
}));

vi.mock("@/hooks/useAttachmentLibrary", () => ({
  useAttachmentLibraryStats: () => ({ stats: { media: 0, documents: 0, audio: 0, unused: 0 } }),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  default: () => true,
}));

vi.mock("@/hooks/useUserQueries", () => ({
  userKeys: {
    memoViews: (parent?: string) => ["users", "memoViews", parent],
  },
  useMemoViews: () => ({ data: authState.memoViews }),
  useNotifications: () => ({ data: authState.notifications }),
  useUser: () => ({ data: undefined }),
}));

vi.mock("@/i18n", () => ({
  default: { language: "en" },
}));

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) => key,
}));

const render = (ui: Parameters<typeof testingLibraryRender>[0]) =>
  testingLibraryRender(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>,
  );

const expectCollapsedNavPill = (pill: HTMLElement, label: string) => {
  expect(pill).toHaveClass("h-7", "rounded-md", "px-1.5");
  expect(pill.firstElementChild).toHaveClass("size-4");
  const labelTrack = pill.querySelector('span.grid[aria-hidden="true"]');
  expect(labelTrack).toHaveClass("grid-cols-[0fr]", "ps-0");
  expect(labelTrack).not.toHaveClass("@min-[230px]:grid-cols-[1fr]");
  expect(labelTrack).toHaveTextContent(label);
};

const expectExpandedNavPill = (pill: HTMLElement, label: string) => {
  expect(pill).toHaveClass("h-7", "rounded-md", "px-1.5");
  expect(pill.firstElementChild).toHaveClass("size-4");
  const labelTrack = pill.querySelector("span.grid");
  // The label opens only where the row can afford it; the control's aria-label names it regardless.
  expect(labelTrack).toHaveClass("@min-[230px]:grid-cols-[1fr]", "@min-[230px]:ps-2");
  expect(labelTrack).toHaveAttribute("aria-hidden", "true");
  expect(pill.querySelector("[data-sidebar-label]")).toHaveTextContent(label);
};

const expectActiveNavPill = (pill: HTMLElement, label: string) => {
  expectExpandedNavPill(pill, label);
  expect(pill).toHaveAttribute("aria-current", "page");
};

const expectDefaultNavPill = (pill: HTMLElement, label: string) => {
  expectExpandedNavPill(pill, label);
  expect(pill).not.toHaveAttribute("aria-current");
};

describe("App sidebar logo", () => {
  beforeEach(() => {
    authState.currentUser = { name: "users/test", username: "test" };
    authState.memoViews = [];
    authState.notifications = [];
    sidebarState.memoScope = "home";
    sidebarState.memoDetail = undefined;
    memoDetailPanelRender.mockClear();
    sidebarState.mobileOpen = false;
    sidebarState.setMobileOpen.mockClear();
    sidebarState.setQuickFindOpen.mockClear();
    globalEditorState.canOpen = true;
    globalEditorState.openEditor.mockClear();
    spaceState.spaces = [];
    spaceState.selectedSpace = undefined;
    spaceState.selectSpace.mockClear();
    filteredStatsHook.mockClear();
    filterState.filters = [];
    tagsSectionHook.mockClear();
  });

  it("loads memo details only when navigating to a memo and removes them on Home", async () => {
    sidebarState.memoDetail = { memo: { name: "memos/123" } };
    const Navigation = () => {
      const navigate = useNavigate();
      return (
        <>
          <button type="button" onClick={() => navigate("/memos/123")}>
            Open memo details
          </button>
          <button type="button" onClick={() => navigate("/")}>
            Return Home
          </button>
        </>
      );
    };

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
        <Navigation />
      </MemoryRouter>,
    );
    expect(memoDetailPanelRender).not.toHaveBeenCalled();
    expect(screen.queryByTestId("memo-detail-lazy-panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open memo details" }));
    expect(await screen.findByRole("region", { name: "Memo details" })).toHaveTextContent("memos/123");
    expect(memoDetailPanelRender).toHaveBeenCalledWith("memos/123");

    fireEvent.click(screen.getByRole("button", { name: "Return Home" }));
    expect(screen.queryByTestId("memo-detail-lazy-panel")).not.toBeInTheDocument();
  });

  it("preserves a CEL expression when switching sidebar scopes", async () => {
    const expression = 'tags.exists(t, t.contains("50%, café & C++"))\n || pinned';
    filterState.filters = [{ factor: "celSearch", value: expression }];
    const LocationProbe = () => {
      const location = useLocation();
      return (
        <output data-testid="scope-location">
          {JSON.stringify({ path: location.pathname, filters: parseFilterQuery(new URLSearchParams(location.search).get("filter")) })}
        </output>
      );
    };
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <AppSidebar />
        <LocationProbe />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "common.explore" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "common.all common.memos" }));
    expect(screen.getByTestId("scope-location")).toHaveTextContent(JSON.stringify({ path: "/", filters: filterState.filters }));
  });

  it("shows the context switcher and leaves Compose to the floating action", () => {
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const switcher = screen.getByRole("button", { name: "space.switch: common.memos" });
    const header = switcher.closest("[data-sidebar-header]");
    expect(screen.queryByRole("button", { name: "editor.new-memo" })).not.toBeInTheDocument();
    const primaryNavigation = screen.getByRole("navigation", { name: "Primary" });
    const search = within(primaryNavigation).getByRole("button", { name: "common.search" });

    expect(header).toHaveClass("h-13", "px-3");
    expect(switcher).toHaveTextContent("Memos logo");
    expect(switcher).toHaveClass("min-w-0", "h-9", "gap-2", "px-2");
    expect(switcher).not.toHaveClass("px-1");
    expect(switcher.firstElementChild).not.toHaveClass("flex-1");
    expect(within(switcher).getByText("Memos logo")).toHaveAttribute("data-logo-size", "header");
    expect(switcher.querySelector(".lucide-chevrons-up-down")).not.toBeNull();
    expect(switcher.querySelector(".lucide-chevron-down")).toBeNull();
    expect(header).not.toContainElement(search);
    expect(search).toHaveClass("ms-auto", "h-7", "px-1.5");
    expect(search.querySelector(".lucide-search")).toHaveClass("size-4");

    fireEvent.click(search);
    expect(sidebarState.setQuickFindOpen).toHaveBeenCalledWith(true);
    expect(sidebarState.setMobileOpen).toHaveBeenCalledWith(false);

    // The Calendar has no sidebar shortcut; the standalone calendar URL remains available.
    expect(within(primaryNavigation).queryByRole("link", { name: "common.calendar" })).not.toBeInTheDocument();
    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
  });

  it.each([
    "/spaces/product",
    "/spaces/product/explore",
    "/spaces/product/attachments",
    "/spaces/product/Explore/",
    "/spaces/product/Attachments/",
  ])("shows the selected Space only on collection route %s", (path) => {
    const product = { name: "spaces/product", title: "Product", description: "" };
    spaceState.spaces = [product];
    spaceState.selectedSpace = product;

    render(
      <MemoryRouter initialEntries={[path]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "space.switch: Product" })).toBeInTheDocument();
  });

  it.each([
    "/archived",
    "/inbox",
    "/u/alice",
    "/setting",
    "/about",
    "/views",
    "/memos/123",
    "/memos/shares/token",
    "/404",
  ])("shows Memos in the switcher on global page %s", (path) => {
    const product = { name: "spaces/product", title: "Product", description: "" };
    spaceState.spaces = [product];
    spaceState.selectedSpace = product;

    render(
      <MemoryRouter initialEntries={[path]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const brand = screen.getByRole("button", { name: "space.switch: common.memos" });
    expect(brand).toHaveClass("h-9", "gap-2", "px-2");
    expect(within(brand).getByText("Memos logo")).toHaveAttribute("data-logo-size", "header");
  });

  it("scopes collection statistics to the selected Space", () => {
    render(
      <MemoryRouter initialEntries={["/spaces/product/explore"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(filteredStatsHook).toHaveBeenCalledWith(expect.objectContaining({ context: "explore", filter: 'space == "spaces/product"' }));
  });

  it("includes authorized Space memos in All Explore statistics", () => {
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(filteredStatsHook).toHaveBeenCalledWith(expect.objectContaining({ context: "explore", filter: undefined }));
  });

  it("keeps a signed-in Profile inside the GoreeCloud dashboard navigation", () => {
    render(
      <MemoryRouter initialEntries={["/u/test"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Memos dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "common.profile" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/dashboard");
    expect(tagsSectionHook).not.toHaveBeenCalled();
  });

  it("keeps Archived statistics and tag UI state unscoped by Space", () => {
    render(
      <MemoryRouter initialEntries={["/archived"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Memos dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Archived" })).toHaveAttribute("aria-current", "page");
  });

  it("uses one unified signed-in footer surface", () => {
    render(
      <MemoryRouter initialEntries={["/inbox"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const footer = screen.getByRole("button", { name: "User menu" }).closest("footer");
    expect(footer).not.toBeNull();
    expect(footer).not.toHaveClass("px-3");
    expect(footer).not.toHaveClass("py-1");
    expect(footer).not.toHaveClass("py-1.5");
    expect(footer?.childElementCount).toBe(1);
    expect(screen.getByRole("link", { name: "common.inbox" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps Attachments active after route normalization", () => {
    render(
      <MemoryRouter initialEntries={["/Attachments/"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "common.attachments" })).toHaveAttribute("aria-current", "page");
  });

  it("hides the instance-level unused attachment collection in a Space", () => {
    render(
      <MemoryRouter initialEntries={["/spaces/product/attachments"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "attachment-library.labels.unused" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "attachment-library.tabs.media" })).toBeInTheDocument();
  });

  it("hides Compose when the composer reports it is not available", () => {
    globalEditorState.canOpen = false;
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "editor.new-memo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "common.search" })).toBeInTheDocument();
  });

  it("shows the compact public navigation for a guest", () => {
    authState.currentUser = undefined;
    globalEditorState.canOpen = false;
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Memos logo" })).toHaveAttribute("href", "/explore");
    expect(screen.queryByRole("button", { name: /^space\.switch:/ })).not.toBeInTheDocument();
    const primaryNavigation = screen.getByRole("navigation", { name: "Primary" });
    expect(primaryNavigation).toHaveClass("h-7", "items-center", "gap-0.5", "px-3");
    expect(primaryNavigation).not.toHaveClass("flex-col");
    const navigation = within(primaryNavigation);
    expect(navigation.getByRole("button", { name: "common.search" })).toHaveClass("ms-auto", "h-7", "px-1.5");
    expectActiveNavPill(navigation.getByRole("link", { name: "common.explore" }), "common.explore");
    const about = navigation.getByRole("link", { name: "common.about" });
    expect(about).toHaveAttribute("href", "/about");
    expectCollapsedNavPill(about, "common.about");
    const signIn = screen.getByRole("link", { name: "common.sign-in-to-memos" });
    expect(signIn).toHaveClass("w-full", "px-2.5", "rounded-lg");
    expect(signIn).not.toHaveClass("rounded-none");
    expect(signIn.closest("footer")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "editor.new-memo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "common.all common.memos" })).not.toBeInTheDocument();
  });

  it.each(["/403", "/404", "/unknown"])("uses the common sidebar without inheriting collection content on %s", (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "common.about" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "common.about" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("heading", { name: "common.resources", level: 2 })).toBeInTheDocument();
    const documentationLink = screen.getByRole("link", { name: "about.documents" });
    expect(documentationLink).toHaveAttribute("href", "https://github.com/GoreeCloud/memos/tree/main/docs");
    expect(documentationLink).toHaveAttribute("target", "_blank");
    expect(documentationLink).toHaveAttribute("rel", "noreferrer");
    fireEvent.click(documentationLink);
    expect(sidebarState.setMobileOpen).toHaveBeenCalledWith(false);
    expect(screen.getByRole("link", { name: "about.api-docs" })).toHaveAttribute(
      "href",
      "https://github.com/GoreeCloud/memos/blob/main/docs/API.md",
    );
    expect(screen.getByRole("link", { name: "about.github-repository" })).toHaveAttribute("href", "https://github.com/GoreeCloud/memos");
    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "common.statistics" })).not.toBeInTheDocument();
    expect(screen.queryByText("common.views")).not.toBeInTheDocument();
    expect(screen.queryByText("Tags")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "space.switch: common.memos" })).toBeInTheDocument();
    const navigation = within(screen.getByRole("navigation", { name: "Primary" }));
    expectDefaultNavPill(navigation.getByRole("button", { name: "common.all common.memos" }), "common.all common.memos");
    const attachments = navigation.getByRole("link", { name: "common.attachments" });
    expect(attachments).toHaveAttribute("href", "/attachments");
    expectCollapsedNavPill(attachments, "common.attachments");
    expect(screen.queryByRole("link", { name: "common.inbox" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "common.all common.memos" })).not.toBeInTheDocument();
    expect(screen.getByText("User menu").closest("footer")).not.toBeNull();
  });

  it.each(["/about", "/About/"])("marks the common About link active on %s", (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "common.about" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "common.resources", level: 2 })).toBeInTheDocument();

    const navigation = within(screen.getByRole("navigation", { name: "Primary" }));
    const scopeTrigger = navigation.getByRole("button", { name: "common.all common.memos" });
    expectDefaultNavPill(scopeTrigger, "common.all common.memos");
    expect(scopeTrigger.querySelector(".lucide-chevron-down")).not.toBeInTheDocument();
    expectCollapsedNavPill(navigation.getByRole("link", { name: "common.attachments" }), "common.attachments");
  });

  it("uses a visitor sidebar for a guest on a route without contextual content", () => {
    authState.currentUser = undefined;
    render(
      <MemoryRouter initialEntries={["/404"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const navigation = within(screen.getByRole("navigation", { name: "Primary" }));
    const explore = navigation.getByRole("link", { name: "common.explore" });
    expect(explore).toHaveAttribute("href", "/explore");
    expectDefaultNavPill(explore, "common.explore");
    expect(screen.queryByRole("link", { name: "common.all common.memos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "common.attachments" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "common.inbox" })).not.toBeInTheDocument();
    const about = navigation.getByRole("link", { name: "common.about" });
    expect(about).toHaveAttribute("href", "/about");
    expectCollapsedNavPill(about, "common.about");
    expect(screen.getByRole("link", { name: "common.sign-in-to-memos" }).closest("footer")).not.toBeNull();
  });

  it.each(["/about", "/About/"])("marks About active for a guest on %s", (path) => {
    authState.currentUser = undefined;
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const navigation = within(screen.getByRole("navigation", { name: "Primary" }));
    expectCollapsedNavPill(navigation.getByRole("link", { name: "common.explore" }), "common.explore");
    expectActiveNavPill(navigation.getByRole("link", { name: "common.about" }), "common.about");
    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
  });

  it("shows the mockup dashboard navigation without an unrelated calendar widget", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const dashboard = within(screen.getByRole("navigation", { name: "Memos dashboard" }));
    expect(screen.queryByRole("button", { name: "editor.new-memo" })).not.toBeInTheDocument();
    expect(dashboard.getByRole("link", { name: "All Memos" })).toHaveAttribute("aria-current", "page");
    for (const label of [
      "All Memos",
      "Pinned",
      "Private",
      "Labels",
      "Archived",
      "Recent",
      "My Tasks",
      "common.attachments",
      "common.settings",
    ]) {
      expect(dashboard.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(dashboard.getByRole("heading", { name: "Quick Filters" })).toBeInTheDocument();
    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "common.statistics" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User menu" }).closest("footer")).not.toBeNull();

    fireEvent.click(dashboard.getByRole("link", { name: "Pinned" }));
    expect(dashboard.getByRole("link", { name: "Pinned" })).toHaveAttribute("aria-current", "page");
  });

  it("uses compact text-only actions for a saved view", async () => {
    authState.memoViews = [{ name: "memoViews/1", title: "testgp" }];
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "common.edit testgp" }));

    const menu = await screen.findByRole("menu");
    expect(menu).toHaveAttribute("data-size", "sm");
    expect(menu).toHaveClass("min-w-24", "p-0.5");
    const editItem = screen.getByRole("menuitem", { name: "common.edit" });
    const deleteItem = screen.getByRole("menuitem", { name: "common.delete" });
    expect(editItem.querySelector("svg")).toBeNull();
    expect(deleteItem.querySelector("svg")).toBeNull();
    expect(deleteItem).toHaveAttribute("data-variant", "destructive");
  });

  it("keeps collection navigation together and uses the unified user footer", async () => {
    render(
      <MemoryRouter initialEntries={["/attachments"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const scopeTrigger = screen.getByRole("link", { name: "Home" });
    expect(scopeTrigger).toHaveAttribute("href", "/dashboard");

    expect(screen.getByRole("button", { name: "User menu" }).closest("footer")).not.toBeNull();
    expect(screen.getByRole("link", { name: "common.inbox" })).toHaveAttribute("href", "/inbox");

    const attachments = screen.getByRole("link", { name: "common.attachments" });
    expect(attachments).toHaveAttribute("aria-current", "page");

    fireEvent.click(scopeTrigger);
    expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Memos dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home", current: "page" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "common.explore" })).not.toBeInTheDocument();
  });

  it.each([
    ["/attachments", "common.attachments"],
    ["/inbox", "common.inbox"],
  ])("labels the sidebar content section on %s", (path, label) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    if (path === "/inbox") {
      expect(screen.getByRole("navigation", { name: "Memos dashboard" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    } else {
      expect(screen.getByRole("heading", { name: label, level: 2 })).toBeInTheDocument();
    }
  });

  it("opens Settings as a standalone page without extending the global sidebar", () => {
    render(
      <MemoryRouter initialEntries={["/setting"]}>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "common.settings" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: "Memos dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "common.basic" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "setting.spaces.label" })).not.toBeInTheDocument();
  });

  it("keeps the Explore scope available from a global destination", async () => {
    sidebarState.memoScope = "explore";
    render(
      <MemoryRouter initialEntries={["/map"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const scopeTrigger = screen.getByRole("button", { name: "common.explore" });
    expectCollapsedNavPill(scopeTrigger, "common.explore");
    expect(scopeTrigger.querySelector(".lucide-chevron-down")).not.toBeInTheDocument();
    expectCollapsedNavPill(screen.getByRole("link", { name: "common.attachments" }), "common.attachments");

    fireEvent.click(scopeTrigger);
    expectActiveNavPill(await screen.findByRole("button", { name: "common.explore", current: "page" }), "common.explore");
  });

  it("leaves Archived through the remembered primary feed without presenting it as a scope", async () => {
    sidebarState.memoScope = "explore";
    render(
      <MemoryRouter initialEntries={["/archived"]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    const scopeTrigger = screen.getByRole("link", { name: "Home" });
    expect(scopeTrigger).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Archived" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "common.attachments" })).toHaveAttribute("href", "/attachments");

    fireEvent.click(scopeTrigger);
    expect(await screen.findByRole("link", { name: "Home", current: "page" })).toBeInTheDocument();
  });

  it("keeps the mobile header limited to navigation and context", () => {
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <MobileAppHeader />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute("data-mobile-navigation-trigger");
    const mobileBrand = screen.getByRole("button", { name: "space.switch: common.memos" });
    expect(mobileBrand).toHaveClass("h-9", "gap-1.5", "px-1");
    expect(screen.queryByRole("button", { name: "common.search" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "editor.new-memo" })).not.toBeInTheDocument();
  });

  it("keeps Compose out of the mobile drawer in favor of the floating action", () => {
    sidebarState.mobileOpen = true;
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <MobileAppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "common.search" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "editor.new-memo" })).not.toBeInTheDocument();
  });

  it("keeps an accessible Close control in the mobile navigation drawer", () => {
    sidebarState.mobileOpen = true;
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <MobileAppSidebar />
      </MemoryRouter>,
    );

    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "Close" });
    expect(dialog).toHaveClass("[&>[data-slot=sheet-close]]:sr-only");
    expect(close).toHaveAttribute("data-slot", "sheet-close");
    fireEvent.click(close);
    expect(sidebarState.setMobileOpen.mock.calls.at(-1)?.[0]).toBe(false);
  });
});
