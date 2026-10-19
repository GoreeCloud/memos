import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWithReload } from "@/utils/lazy";

afterEach(() => vi.unstubAllGlobals());

describe("lazy chunk-load recovery", () => {
  it("returns successfully loaded modules without triggering recovery", async () => {
    const getItem = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { getItem }, location: { reload } });

    await expect(loadWithReload(async () => ({ default: "loaded" }))).resolves.toEqual({ default: "loaded" });
    expect(getItem).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("attempts one reload for a missing chunk and rethrows the original error", async () => {
    const original = new Error("Failed to fetch dynamically imported module");
    const getItem = vi.fn().mockReturnValueOnce(null).mockReturnValueOnce("1");
    const setItem = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { getItem, setItem }, location: { reload } });

    await expect(
      loadWithReload(async () => {
        throw original;
      }),
    ).rejects.toBe(original);
    expect(setItem).toHaveBeenCalledExactlyOnceWith("chunk-reload", "1");
    expect(reload).toHaveBeenCalledTimes(1);

    await expect(
      loadWithReload(async () => {
        throw original;
      }),
    ).rejects.toBe(original);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("preserves the original chunk error when reading session storage is forbidden", async () => {
    const original = new Error("Importing a module script failed");
    const getItem = vi.fn(() => {
      throw new Error("SecurityError");
    });
    const reload = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { getItem }, location: { reload } });

    await expect(
      loadWithReload(async () => {
        throw original;
      }),
    ).rejects.toBe(original);
    expect(getItem).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it("preserves the original chunk error if reloading itself fails", async () => {
    const original = new Error("Failed to fetch dynamically imported module");
    const reload = vi.fn(() => {
      throw new Error("Navigation blocked");
    });
    vi.stubGlobal("window", {
      sessionStorage: { getItem: () => null, setItem: vi.fn() },
      location: { reload },
    });

    await expect(
      loadWithReload(async () => {
        throw original;
      }),
    ).rejects.toBe(original);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not attempt reload for unrelated component errors", async () => {
    const original = new Error("Component initialization failed");
    const getItem = vi.fn();
    const reload = vi.fn();
    vi.stubGlobal("window", { sessionStorage: { getItem }, location: { reload } });

    await expect(
      loadWithReload(async () => {
        throw original;
      }),
    ).rejects.toBe(original);
    expect(getItem).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
