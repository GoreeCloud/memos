import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import MemoFilters from "@/components/MemoFilters";
import { MemoFilterProvider, useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { BUILTIN_TASKS_VIEW_ID } from "@/lib/memo-views";

vi.mock("@/contexts/AppSidebarContext", () => ({
  useAppSidebar: () => ({ setQuickFindOpen: vi.fn() }),
}));
vi.mock("@/hooks/useCurrentUser", () => ({ default: () => ({ name: "users/test" }) }));
vi.mock("@/hooks/useUserQueries", () => ({ useMemoViews: () => ({ data: [] }) }));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));

const Harness = () => {
  const location = useLocation();
  const { filters, memoView, setMemoView } = useMemoFilterContext();
  return (
    <>
      <MemoFilters />
      <button type="button" onClick={() => setMemoView(BUILTIN_TASKS_VIEW_ID)}>
        Activate tasks view
      </button>
      <output data-testid="filter-count">{filters.length}</output>
      <output data-testid="active-view">{memoView ?? "none"}</output>
      <output data-testid="query">{location.search}</output>
    </>
  );
};

const renderFilters = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <MemoFilterProvider>
        <Harness />
      </MemoFilterProvider>
    </MemoryRouter>,
  );

describe("memo filter bulk clear", () => {
  it("clears combined search and label filters while retaining unrelated URL parameters", async () => {
    renderFilters("/?sort=displayTime&filter=tagSearch%3Awork%2CcontentSearch%3Aurgent");

    fireEvent.click(screen.getByRole("button", { name: "memo.filters.clear-all" }));

    await waitFor(() => {
      const query = new URLSearchParams(screen.getByTestId("query").textContent ?? "");
      expect(query.get("sort")).toBe("displayTime");
      expect(query.has("filter")).toBe(false);
      expect(screen.getByTestId("filter-count")).toHaveTextContent("0");
    });
    expect(screen.queryByRole("button", { name: "memo.filters.clear-all" })).not.toBeInTheDocument();
  });

  it("keeps the dedicated Clear query action instead of duplicating it for a search-only query", () => {
    renderFilters("/?filter=contentSearch%3Aalpha%2CcontentSearch%3Abeta");

    expect(screen.getByRole("button", { name: "search.clear-query" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "memo.filters.clear-all" })).not.toBeInTheDocument();
  });

  it("clears both a visible saved view and a label filter", async () => {
    renderFilters("/?filter=tagSearch%3Awork");
    fireEvent.click(screen.getByRole("button", { name: "Activate tasks view" }));
    expect(screen.getByTestId("active-view")).toHaveTextContent(BUILTIN_TASKS_VIEW_ID);

    fireEvent.click(screen.getByRole("button", { name: "memo.filters.clear-all" }));

    await waitFor(() => {
      expect(screen.getByTestId("filter-count")).toHaveTextContent("0");
      expect(screen.getByTestId("active-view")).toHaveTextContent("none");
    });
  });

  it("does not clear a remembered view that is dormant on a settings route", async () => {
    renderFilters("/settings?filter=tagSearch%3Awork%2Cpinned%3Atrue");
    fireEvent.click(screen.getByRole("button", { name: "Activate tasks view" }));

    fireEvent.click(screen.getByRole("button", { name: "memo.filters.clear-all" }));

    await waitFor(() => expect(screen.getByTestId("filter-count")).toHaveTextContent("0"));
    expect(screen.getByTestId("active-view")).toHaveTextContent(BUILTIN_TASKS_VIEW_ID);
  });
});
