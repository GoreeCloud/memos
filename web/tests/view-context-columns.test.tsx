import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { useView, ViewProvider } from "@/contexts/ViewContext";

const LOCAL_STORAGE_KEY = "memos-view-setting";

const wrapper = ({ children }: { children: ReactNode }) => <ViewProvider>{children}</ViewProvider>;

const persisted = () => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? "{}");

describe("ViewContext maxColumns setting", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to an adaptive masonry board", () => {
    const { result } = renderHook(() => useView(), { wrapper });
    expect(result.current.maxColumns).toBe(0);
  });

  it("updates and persists the column ceiling", () => {
    const { result } = renderHook(() => useView(), { wrapper });

    act(() => result.current.setMaxColumns(0));

    expect(result.current.maxColumns).toBe(0);
    expect(persisted().maxColumns).toBe(0);
    expect(persisted().layoutPreferenceVersion).toBe(2);
  });

  it("sets and persists the sort direction explicitly", () => {
    const { result } = renderHook(() => useView(), { wrapper });

    act(() => result.current.setOrderByTimeAsc(true));

    expect(result.current.orderByTimeAsc).toBe(true);
    expect(persisted().orderByTimeAsc).toBe(true);
  });

  it("restores a persisted column count on init", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ maxColumns: 2 }));

    const { result } = renderHook(() => useView(), { wrapper });

    expect(result.current.maxColumns).toBe(2);
  });

  it("restores all view defaults in one persisted state and discards stale sort aliases", () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        orderByTimeAsc: true,
        timeBasis: "update_time",
        sortTimeField: "update_time",
        compactMode: true,
        linkPreview: false,
        maxColumns: 3,
      }),
    );
    const { result } = renderHook(() => useView(), { wrapper });
    expect(result.current.timeBasis).toBe("update_time");
    expect(result.current.maxColumns).toBe(3);

    act(() => result.current.resetViewSettings());

    expect(result.current).toMatchObject({
      orderByTimeAsc: false,
      timeBasis: "update_time",
      compactMode: false,
      linkPreview: true,
      maxColumns: 0,
    });
    expect(persisted()).toEqual({
      orderByTimeAsc: false,
      timeBasis: "update_time",
      compactMode: false,
      linkPreview: true,
      maxColumns: 0,
    });
  });

  it("upgrades the legacy single-column default without changing unrelated preferences", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ maxColumns: 1, linkPreview: false }));
    const { result } = renderHook(() => useView(), { wrapper });
    expect(result.current.maxColumns).toBe(0);
    expect(result.current.linkPreview).toBe(false);
  });

  it("preserves a deliberately selected single-column list across remounts", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ maxColumns: 1, layoutPreferenceVersion: 2 }));
    const { result } = renderHook(() => useView(), { wrapper });
    expect(result.current.maxColumns).toBe(1);
  });

  it("falls back to masonry for an invalid persisted value", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ maxColumns: 7 }));

    const { result } = renderHook(() => useView(), { wrapper });

    expect(result.current.maxColumns).toBe(0);
  });
});
