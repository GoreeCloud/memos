import type { ComponentType } from "react";
import { lazy } from "react";

const reloadOnChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  const isChunkError =
    message.includes("Failed to fetch dynamically imported module") || message.includes("Importing a module script failed");
  if (!isChunkError || typeof window === "undefined") return;

  // Browser privacy settings can reject sessionStorage access; a failed reload
  // must not hide the original chunk error from the error boundary.
  try {
    const reloadKey = "chunk-reload";
    if (window.sessionStorage.getItem(reloadKey)) return;
    window.sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
  } catch {
    // loadWithReload will rethrow the original error for UI recovery.
  }
};

export async function loadWithReload<T>(factory: () => Promise<T>): Promise<T> {
  try {
    return await factory();
  } catch (error) {
    reloadOnChunkLoadError(error);
    throw error;
  }
}

// Wrap lazy imports to auto-reload on chunk load failure (e.g., after redeployment).
// biome-ignore lint/suspicious/noExplicitAny: mirrors React.lazy's own constraint
export function lazyWithReload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => loadWithReload(factory));
}
