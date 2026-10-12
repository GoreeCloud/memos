import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomeSearchBar, { buildHomeSearchFilters } from "@/components/HomeSearchBar";

const state = vi.hoisted(() => ({
  filters: [] as Array<{ factor: string; value: string }>,
  selectedSpaceName: undefined as string | undefined,
  setFilters: vi.fn(),
  setMemoView: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => state.navigate }));
vi.mock("@/components/MemoDisplaySettingMenu", () => ({
  default: () => (
    <button type="button" aria-label="memo.view-options">
      Layout options
    </button>
  ),
}));
vi.mock("@/contexts/MemoFilterContext", () => ({
  useMemoFilterContext: () => ({ filters: state.filters, setFilters: state.setFilters, setMemoView: state.setMemoView }),
  getFilterSearch: (filters: Array<{ factor: string; value: string }>) =>
    filters.length ? "?filter=" + encodeURIComponent(filters.map((f) => f.factor + ":" + f.value).join(",")) : "",
  isSearchFilter: (filter: { factor: string }) => filter.factor === "contentSearch" || filter.factor === "celSearch",
}));
vi.mock("@/contexts/SpaceContext", () => ({ useSpaceContext: () => ({ selectedSpaceName: state.selectedSpaceName }) }));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));

describe("HomeSearchBar", () => {
  beforeEach(() => {
    state.filters = [];
    state.selectedSpaceName = undefined;
    state.setFilters.mockReset();
    state.setMemoView.mockReset();
    state.navigate.mockReset();
  });

  it("keeps searchable content and persistent layout controls as separate actions", () => {
    render(<HomeSearchBar />);
    expect(screen.getByRole("search", { name: "home.search-all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "memo.view-options" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "memo.view-options" }));
    expect(state.setFilters).not.toHaveBeenCalled();
  });

  it("does not duplicate view options when the dashboard owns the settings control", () => {
    render(<HomeSearchBar showDisplaySettings={false} />);
    expect(screen.getByRole("search", { name: "home.search-all" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "memo.view-options" })).not.toBeInTheDocument();
  });

  it("focuses the Home search with slash without submitting or clearing filters", () => {
    render(<HomeSearchBar />);
    const field = screen.getByRole("searchbox");
    expect(field).toHaveAttribute("aria-keyshortcuts", "/");
    expect(screen.getByText("Ctrl + K", { selector: "kbd" })).toHaveAttribute("aria-hidden", "true");
    expect(field).not.toHaveFocus();

    const shortcut = createEvent.keyDown(document.body, { key: "/" });
    fireEvent(document.body, shortcut);

    expect(shortcut.defaultPrevented).toBe(true);
    expect(field).toHaveFocus();
    expect(state.setFilters).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("does not steal slash while typing, composing, or using modified shortcuts", () => {
    render(<HomeSearchBar />);
    const field = screen.getByRole("searchbox");

    const input = document.createElement("textarea");
    document.body.append(input);
    input.focus();
    for (const options of [
      { key: "/" },
      { key: "/", isComposing: true },
      { key: "/", keyCode: 229 },
      { key: "/", ctrlKey: true },
      { key: "/", metaKey: true },
      { key: "/", altKey: true },
      { key: "/", shiftKey: true },
      { key: "?" },
    ]) {
      const event = createEvent.keyDown(input, options);
      fireEvent(input, event);
      expect(event.defaultPrevented).toBe(false);
      expect(input).toHaveFocus();
    }
    input.remove();

    const composing = createEvent.keyDown(document.body, { key: "/", isComposing: true });
    fireEvent(document.body, composing);
    expect(composing.defaultPrevented).toBe(false);
    expect(field).not.toHaveFocus();
  });

  it("respects active modal dialogs and removes the shortcut listener on unmount", () => {
    const { unmount } = render(<HomeSearchBar />);
    const field = screen.getByRole("searchbox");
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    document.body.append(dialog);
    const whileModalOpen = createEvent.keyDown(document.body, { key: "/" });
    fireEvent(document.body, whileModalOpen);
    expect(whileModalOpen.defaultPrevented).toBe(false);
    expect(field).not.toHaveFocus();
    dialog.remove();

    unmount();
    const afterUnmount = createEvent.keyDown(document.body, { key: "/" });
    fireEvent(document.body, afterUnmount);
    expect(afterUnmount.defaultPrevented).toBe(false);
  });

  it("prepares a unique content search rather than an inert visual input", () => {
    expect(buildHomeSearchFilters("  early  idea early\nnotes  ")).toEqual([
      { factor: "contentSearch", value: "early" },
      { factor: "contentSearch", value: "idea" },
      { factor: "contentSearch", value: "notes" },
    ]);
    expect(buildHomeSearchFilters("  ")).toEqual([]);
  });

  it("keeps quoted Home search phrases together when submitting", () => {
    render(<HomeSearchBar />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: '"meeting notes" follow-up' } });
    fireEvent.submit(screen.getByRole("search"));
    expect(state.setFilters).toHaveBeenCalledWith([
      { factor: "contentSearch", value: "meeting notes" },
      { factor: "contentSearch", value: "follow-up" },
    ]);
  });

  it("restores phrase boundaries in an existing Home search", () => {
    state.filters = [{ factor: "contentSearch", value: "meeting notes" }];
    render(<HomeSearchBar />);
    expect(screen.getByRole("searchbox")).toHaveValue('"meeting notes"');
  });

  it("keeps an existing advanced expression visible on Home without rewriting it as quoted text", () => {
    state.filters = [{ factor: "celSearch", value: "pinned && has_link" }];
    render(<HomeSearchBar />);
    expect(screen.getByRole("searchbox")).toHaveValue("pinned && has_link");
  });

  it("preserves the active advanced expression when submitting it unchanged", () => {
    state.filters = [
      { factor: "celSearch", value: "pinned && has_link" },
      { factor: "tagSearch", value: "old" },
    ];
    render(<HomeSearchBar />);

    expect(screen.getByRole("searchbox")).toHaveValue("pinned && has_link");
    fireEvent.submit(screen.getByRole("search"));
    expect(state.setFilters).toHaveBeenCalledWith([{ factor: "celSearch", value: "pinned && has_link" }]);
    expect(state.setMemoView).toHaveBeenCalledWith(undefined);
  });

  it("treats an edited advanced expression as an explicit new text search", () => {
    state.filters = [{ factor: "celSearch", value: "pinned && has_link" }];
    render(<HomeSearchBar />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "meeting agenda" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(state.setFilters).toHaveBeenCalledWith([
      { factor: "contentSearch", value: "meeting" },
      { factor: "contentSearch", value: "agenda" },
    ]);
  });

  it("preserves an unchanged advanced expression when moving from a Space to Home", () => {
    state.selectedSpaceName = "spaces/design";
    state.filters = [{ factor: "celSearch", value: "pinned && has_link" }];
    render(<HomeSearchBar />);

    fireEvent.submit(screen.getByRole("search"));
    expect(state.navigate).toHaveBeenCalledWith({
      pathname: "/",
      search: "?filter=celSearch%3Apinned%20%26%26%20has_link",
    });
    expect(state.setFilters).not.toHaveBeenCalled();
  });

  it("discards an unsubmitted Home draft with Escape without changing active filters", () => {
    state.filters = [{ factor: "contentSearch", value: "meeting notes" }];
    render(<HomeSearchBar />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "unsubmitted" } });
    input.focus();
    const escapeEvent = createEvent.keyDown(input, { key: "Escape" });
    fireEvent(input, escapeEvent);

    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(input).toHaveValue('"meeting notes"');
    expect(input).toHaveFocus();
    expect(state.setFilters).not.toHaveBeenCalled();
    expect(state.setMemoView).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it("does not discard Home drafts when Escape belongs to IME composition", () => {
    state.filters = [{ factor: "contentSearch", value: "published" }];
    render(<HomeSearchBar />);

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "編集中" } });
    for (const options of [
      { key: "Escape", isComposing: true },
      { key: "Escape", keyCode: 229 },
    ]) {
      const event = createEvent.keyDown(input, options);
      fireEvent(input, event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(input).toHaveValue("編集中");
    expect(state.setFilters).not.toHaveBeenCalled();
  });

  it("searches all accessible memos rather than retaining a previous label", () => {
    state.filters = [{ factor: "tagSearch", value: "old" }];
    render(<HomeSearchBar />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "fresh memo" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(state.setFilters).toHaveBeenCalledWith([
      { factor: "contentSearch", value: "fresh" },
      { factor: "contentSearch", value: "memo" },
    ]);
    expect(state.setMemoView).toHaveBeenCalledWith(undefined);
  });

  it("leaves Space scope when searching across the whole library", () => {
    state.selectedSpaceName = "spaces/design";
    render(<HomeSearchBar />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  sketch  " } });
    fireEvent.submit(screen.getByRole("search"));
    expect(state.navigate).toHaveBeenCalledWith({ pathname: "/", search: "?filter=contentSearch%3Asketch" });
    expect(state.setMemoView).toHaveBeenCalledWith(undefined);
    expect(state.setFilters).not.toHaveBeenCalled();
  });

  it("provides an accessible clear action and keeps Home search ready for typing", () => {
    state.filters = [{ factor: "contentSearch", value: "sketch" }];
    render(<HomeSearchBar />);
    const field = screen.getByRole("searchbox");
    fireEvent.click(screen.getByRole("button", { name: "common.clear" }));
    expect(state.setFilters).toHaveBeenCalledWith([]);
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
    expect(screen.queryByRole("button", { name: "common.clear" })).not.toBeInTheDocument();

    fireEvent.change(field, { target: { value: "follow-up" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(state.setFilters).toHaveBeenLastCalledWith([{ factor: "contentSearch", value: "follow-up" }]);
  });

  it("keeps global clear navigation intact when leaving a Space", () => {
    state.selectedSpaceName = "spaces/design";
    state.filters = [{ factor: "contentSearch", value: "sketch" }];
    render(<HomeSearchBar />);
    fireEvent.click(screen.getByRole("button", { name: "common.clear" }));
    expect(state.navigate).toHaveBeenCalledWith({ pathname: "/", search: "" });
    expect(state.setFilters).not.toHaveBeenCalled();
  });
});
