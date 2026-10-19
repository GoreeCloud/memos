import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useView, ViewProvider } from "@/contexts/ViewContext";

const KEY = "memos-view-setting";
const wrapper = ({ children }: { children: ReactNode }) => <ViewProvider>{children}</ViewProvider>;

function otherTabUpdate(key: string | null, newValue: string | null, storageArea: Storage = localStorage) {
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue, storageArea }));
  });
}

describe("ViewContext cross-tab local preference updates", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("applies valid changes from another tab without writing them back", () => {
    const { result } = renderHook(() => useView(), { wrapper });
    const write = vi.spyOn(Storage.prototype, "setItem");

    otherTabUpdate(
      KEY,
      JSON.stringify({
        orderByTimeAsc: true,
        timeBasis: "update_time",
        compactMode: true,
        linkPreview: false,
        maxColumns: 1,
        layoutPreferenceVersion: 2,
      }),
    );

    expect(result.current).toMatchObject({
      orderByTimeAsc: true,
      timeBasis: "update_time",
      compactMode: true,
      linkPreview: false,
      maxColumns: 1,
    });
    expect(write).not.toHaveBeenCalled();
  });

  it("preserves legacy sort aliases and migrates an unversioned one-column default", () => {
    const { result } = renderHook(() => useView(), { wrapper });
    otherTabUpdate(KEY, JSON.stringify({ sortTimeField: "update_time", maxColumns: 1, linkPreview: false }));
    expect(result.current.timeBasis).toBe("update_time");
    expect(result.current.maxColumns).toBe(0);
    expect(result.current.linkPreview).toBe(false);
  });

  it("uses safe defaults for malformed JSON, arrays, and invalid field types", () => {
    const { result } = renderHook(() => useView(), { wrapper });
    const write = vi.spyOn(Storage.prototype, "setItem");
    for (const value of [
      "{",
      "[]",
      "null",
      JSON.stringify({ orderByTimeAsc: "true", compactMode: 1, linkPreview: null, maxColumns: 100, timeBasis: "bad" }),
    ]) {
      otherTabUpdate(KEY, value);
      expect(result.current).toMatchObject({
        orderByTimeAsc: false,
        timeBasis: "create_time",
        compactMode: false,
        linkPreview: true,
        maxColumns: 0,
      });
    }
    expect(write).not.toHaveBeenCalled();
  });

  it("resets the view on removal or storage clear, but ignores unrelated keys and sessionStorage", () => {
    const { result } = renderHook(() => useView(), { wrapper });
    otherTabUpdate(KEY, JSON.stringify({ orderByTimeAsc: true, compactMode: true }));
    const write = vi.spyOn(Storage.prototype, "setItem");

    otherTabUpdate("another-key", null);
    otherTabUpdate(KEY, JSON.stringify({ compactMode: false }), sessionStorage);
    expect(result.current.orderByTimeAsc).toBe(true);
    expect(result.current.compactMode).toBe(true);

    otherTabUpdate(KEY, null);
    expect(result.current.orderByTimeAsc).toBe(false);
    expect(result.current.compactMode).toBe(false);

    otherTabUpdate(KEY, JSON.stringify({ linkPreview: false }));
    otherTabUpdate(null, null);
    expect(result.current.linkPreview).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it("removes its storage listener when the provider unmounts", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useView(), { wrapper });
    unmount();
    expect(remove).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});
