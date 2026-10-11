import { fireEvent, render, screen } from "@testing-library/react";
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

  it("provides an accessible clear action for an active query", () => {
    state.filters = [{ factor: "contentSearch", value: "sketch" }];
    render(<HomeSearchBar />);
    fireEvent.click(screen.getByRole("button", { name: "common.clear" }));
    expect(state.setFilters).toHaveBeenCalledWith([]);
  });
});
