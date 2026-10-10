import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SIDEBAR_ROW_BOX_CLASSES, SIDEBAR_ROW_COUNT_RAIL_CLASSES, SIDEBAR_ROW_SLOT_CLASSES } from "@/components/AppSidebar/SidebarRow";
import { SIDEBAR_SECTION_ACTION_ICON_CLASSES } from "@/components/AppSidebar/SidebarSection";
import TagsSection from "@/components/AppSidebar/TagsSection";
import { MemoFilterProvider } from "@/contexts/MemoFilterContext";

const mocks = vi.hoisted(() => ({
  tags: {} as Record<string, { blurContent: boolean }>,
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  refetchSettings: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: { name: "users/owner" }, userTagsSetting: { tags: mocks.tags }, refetchSettings: mocks.refetchSettings }),
}));
vi.mock("@/hooks/useUserQueries", () => ({ useUpdateUserSetting: () => ({ mutateAsync: mocks.mutateAsync }) }));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));

describe("TagsSection", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.tags = {};
    mocks.mutateAsync.mockClear();
    mocks.refetchSettings.mockClear();
  });

  it("keeps the Labels section visible before a user has added any labels", () => {
    render(
      <MemoryRouter>
        <MemoFilterProvider>
          <TagsSection tagCount={{}} scope="home" />
        </MemoFilterProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "common.labels" })).toBeInTheDocument();
    expect(screen.getByText("home.labels-empty")).toBeInTheDocument();
  });

  it("shows a configured unused label but never offers regex metadata as a literal label", () => {
    mocks.tags = { work: { blurContent: false }, "project/.*": { blurContent: false } };
    render(
      <MemoryRouter>
        <MemoFilterProvider>
          <TagsSection tagCount={{}} scope="home" />
        </MemoFilterProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "#work, setting.tags.used-count" })).toBeInTheDocument();
    expect(screen.queryByText("project/.*")).not.toBeInTheDocument();
  });

  it("creates an exact-name label from the sidebar without leaving the memo list", async () => {
    render(
      <MemoryRouter>
        <MemoFilterProvider>
          <TagsSection tagCount={{}} scope="home" />
        </MemoFilterProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "common.add common.labels" }));
    const dialog = screen.getByRole("dialog");
    const name = within(dialog).getByRole("textbox", { name: "common.labels" });
    fireEvent.change(name, { target: { value: "project/notes" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "common.add" }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledOnce());
    expect(mocks.mutateAsync.mock.calls[0][0].setting.value.value.tags).toHaveProperty("project/notes");
    expect(mocks.refetchSettings).toHaveBeenCalledOnce();
  });

  it("persists the selected pastel color when creating a sidebar label", async () => {
    mocks.tags = { existing: { blurContent: false } };
    render(
      <MemoryRouter>
        <MemoFilterProvider>
          <TagsSection tagCount={{}} scope="home" />
        </MemoFilterProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "common.add common.labels" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox", { name: "common.labels" }), { target: { value: "design" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lavender" }));
    expect(within(dialog).getByRole("button", { name: "Lavender" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(dialog).getByRole("button", { name: "common.add" }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledOnce());
    const tags = mocks.mutateAsync.mock.calls[0][0].setting.value.value.tags;
    expect(tags).toHaveProperty("existing");
    expect(tags.design.backgroundColor).toMatchObject({ red: 238 / 255, green: 229 / 255, blue: 1 });
    expect(mocks.refetchSettings).toHaveBeenCalledOnce();
  });

  it("keeps the title count-free and uses the shared section action grammar", () => {
    render(
      <MemoryRouter>
        <MemoFilterProvider>
          <TagsSection tagCount={{ a: 2, "a/b": 1 }} scope="home" />
        </MemoFilterProvider>
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", { name: "common.labels", level: 2 });
    expect(heading.parentElement).toHaveTextContent(/^common.labels$/);

    const trigger = screen.getByRole("button", { name: "common.labels: common.more" });
    expect(trigger).toHaveClass("size-6", "rounded-md", "text-muted-foreground/70", "hover:bg-muted/60", "hover:text-foreground");
    expect(trigger.querySelector("svg")).toHaveClass(SIDEBAR_SECTION_ACTION_ICON_CLASSES);
    expect(screen.queryByRole("button", { name: "common.tags: memo.layout-list" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitemcheckbox")).not.toBeInTheDocument();
  });

  it("switches layouts from the menu, closes it, and persists the preference", async () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <MemoFilterProvider>
          <TagsSection tagCount={{ a: 2, "a/b": 1 }} scope="home" onSelect={onSelect} />
        </MemoFilterProvider>
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "common.labels: common.more" });
    fireEvent.click(trigger);
    const treeMode = await screen.findByRole("menuitemcheckbox", { name: "common.tree-mode" });
    expect(treeMode).toHaveAttribute("aria-checked", "false");
    fireEvent.click(treeMode);

    expect(screen.getByRole("tree")).toBeInTheDocument();
    expect(localStorage.getItem("tag-view-as-tree")).toBe("true");
    await waitFor(() => expect(screen.queryByRole("menuitemcheckbox")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());

    fireEvent.click(trigger);
    const checkedTreeMode = await screen.findByRole("menuitemcheckbox", { name: "common.tree-mode" });
    expect(checkedTreeMode).toHaveAttribute("aria-checked", "true");
    fireEvent.click(checkedTreeMode);

    expect(screen.queryByRole("tree")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "#a/b, setting.tags.used-count" })).toBeInTheDocument();
    expect(localStorage.getItem("tag-view-as-tree")).toBe("false");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("reflects an existing tree preference when opening the menu", async () => {
    localStorage.setItem("tag-view-as-tree", "true");
    render(
      <MemoryRouter>
        <MemoFilterProvider>
          <TagsSection tagCount={{ a: 2, "a/b": 1 }} scope="home" />
        </MemoFilterProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("tree")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "common.labels: common.more" }));
    expect(await screen.findByRole("menuitemcheckbox", { name: "common.tree-mode" })).toHaveAttribute("aria-checked", "true");
  });

  it("keeps flat rows on the shared row grammar with a trailing count rail", () => {
    render(
      <MemoryRouter>
        <MemoFilterProvider>
          <TagsSection tagCount={{ alpha: 2, "a/very-long-tag-path": 1 }} scope="home" />
        </MemoFilterProvider>
      </MemoryRouter>,
    );

    const alpha = screen.getByText("alpha");
    const alphaButton = alpha.closest("button") as HTMLButtonElement;
    const path = alpha.parentElement?.parentElement as HTMLSpanElement;
    const count = screen.getByText("2");

    expect(alphaButton).toHaveClass(...SIDEBAR_ROW_BOX_CLASSES.split(" "));
    // The # sits in the same fixed slot the tree uses, so switching modes keeps it in place.
    expect(alphaButton.firstElementChild).toHaveClass(...SIDEBAR_ROW_SLOT_CLASSES.split(" "));
    expect(path).toHaveClass("truncate", "text-start");
    expect(path).not.toContainElement(count);
    expect(count).toHaveClass(...SIDEBAR_ROW_COUNT_RAIL_CLASSES.split(" "));
  });
});
