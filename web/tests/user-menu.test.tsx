import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserMenu from "@/components/UserMenu";

const mocks = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  setMobileOpen: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/contexts/AppSidebarContext", () => ({
  useAppSidebar: () => ({ setMobileOpen: mocks.setMobileOpen }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    userGeneralSetting: undefined,
    refetchSettings: vi.fn(),
    logout: mocks.logout,
  }),
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  default: () => ({ name: "users/steven", username: "steven", displayName: "Steven" }),
}));

vi.mock("@/hooks/useLiveMemoRefresh", () => ({
  useSSEConnectionStatus: () => "connected",
}));

vi.mock("@/hooks/useNavigateTo", () => ({
  default: () => mocks.navigateTo,
}));

vi.mock("@/hooks/useUserQueries", () => ({
  useUpdateUserGeneralSetting: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/utils/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/i18n")>();
  return {
    ...actual,
    getLocaleWithFallback: () => "en",
    loadLocale: vi.fn(),
    useTranslate: () => (key: string) => key,
  };
});

describe("User menu", () => {
  beforeEach(() => {
    mocks.navigateTo.mockReset();
    mocks.setMobileOpen.mockReset();
    mocks.logout.mockReset();
  });

  it.each(["/", "/setting", "/archived", "/u/steven"])("keeps only unique account actions and omits sidebar links on %s", async (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <UserMenu />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Steven/ }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("menuitem", { name: "common.inbox" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "common.profile" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "common.archived" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "common.settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "common.language" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "setting.preference.theme" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "common.about" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "common.sign-out" })).toBeInTheDocument();
    expect(screen.getAllByRole("separator")).toHaveLength(2);
  });

  it("keeps the full-width account footer and leaves Inbox to the sidebar", async () => {
    render(
      <MemoryRouter initialEntries={["/inbox"]}>
        <UserMenu />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole("button", { name: "Steven, common.more" });
    expect(trigger).toHaveClass("h-11", "w-full", "rounded-lg", "gap-2.5");
    expect(trigger.firstElementChild).toHaveClass("size-8");
    expect(trigger.querySelector(".lucide-chevrons-up-down")).not.toBeNull();
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("w-[256px]", "rounded-xl");
    expect(menu).toHaveTextContent("@steven");
    expect(screen.queryByRole("menuitem", { name: "common.inbox" })).not.toBeInTheDocument();
  });

  it("keeps the collapsed trigger on the artwork rail", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <UserMenu collapsed />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /Steven/ });
    expect(trigger).toHaveClass("ms-3", "size-9", "rounded-md", "p-2");
    expect(trigger).not.toHaveClass("w-full");
    expect(trigger).not.toHaveClass("px-5");
    expect(trigger).not.toHaveClass("rounded-none");
  });
});
