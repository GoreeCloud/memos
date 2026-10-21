import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type MemoTimeBasis = "create_time" | "update_time";

/** Upper bound on feed columns, in display order. 1 = single reading column; 0 = as many as fit. */
export const MAX_COLUMNS_VALUES = [1, 2, 3, 0] as const;
export type MemoMaxColumns = (typeof MAX_COLUMNS_VALUES)[number];

interface ViewState {
  orderByTimeAsc: boolean;
  timeBasis?: MemoTimeBasis;
  sortTimeField?: MemoTimeBasis;
  compactMode: boolean;
  linkPreview: boolean;
  maxColumns: MemoMaxColumns;
  /** Marks an intentional list/grid selection after the masonry-default migration. */
  layoutPreferenceVersion?: 2;
}

interface ViewContextValue {
  orderByTimeAsc: boolean;
  timeBasis: MemoTimeBasis;
  compactMode: boolean;
  linkPreview: boolean;
  maxColumns: MemoMaxColumns;
  setOrderByTimeAsc: (value: boolean) => void;
  setTimeBasis: (field: MemoTimeBasis) => void;
  setCompactMode: (value: boolean) => void;
  setLinkPreview: (value: boolean) => void;
  setMaxColumns: (value: MemoMaxColumns) => void;
  resetViewSettings: () => void;
}

const ViewContext = createContext<ViewContextValue | null>(null);

const LOCAL_STORAGE_KEY = "memos-view-setting";

const DEFAULT_VIEW_STATE: ViewState = {
  orderByTimeAsc: false,
  timeBasis: "update_time",
  compactMode: false,
  linkPreview: true,
  maxColumns: 0,
};

/** Parse both initial preferences and cross-tab updates without trusting stored values. */
function parseStoredViewState(raw: string | null): ViewState {
  if (!raw) return { ...DEFAULT_VIEW_STATE };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...DEFAULT_VIEW_STATE };
    const data = parsed as Partial<ViewState>;
    const timeBasis =
      data.timeBasis === "create_time" || data.timeBasis === "update_time"
        ? data.timeBasis
        : data.sortTimeField === "create_time" || data.sortTimeField === "update_time"
          ? data.sortTimeField
          : undefined;
    // An unversioned single column represented an old default, not a user selection.
    const maxColumns =
      data.maxColumns === 1 && data.layoutPreferenceVersion !== 2
        ? DEFAULT_VIEW_STATE.maxColumns
        : MAX_COLUMNS_VALUES.includes(data.maxColumns as MemoMaxColumns)
          ? (data.maxColumns as MemoMaxColumns)
          : DEFAULT_VIEW_STATE.maxColumns;
    return {
      orderByTimeAsc: typeof data.orderByTimeAsc === "boolean" ? data.orderByTimeAsc : DEFAULT_VIEW_STATE.orderByTimeAsc,
      timeBasis,
      compactMode: typeof data.compactMode === "boolean" ? data.compactMode : DEFAULT_VIEW_STATE.compactMode,
      linkPreview: typeof data.linkPreview === "boolean" ? data.linkPreview : DEFAULT_VIEW_STATE.linkPreview,
      maxColumns,
      layoutPreferenceVersion: data.layoutPreferenceVersion === 2 ? 2 : undefined,
    };
  } catch {
    // Malformed browser-local preferences are not fatal and should not be logged.
    return { ...DEFAULT_VIEW_STATE };
  }
}

function getInitialViewState(): ViewState {
  try {
    return parseStoredViewState(localStorage.getItem(LOCAL_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_VIEW_STATE };
  }
}

export function ViewProvider({ children }: { children: ReactNode }) {
  const [viewState, setViewState] = useState(getInitialViewState);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      // Ignore sessionStorage, unrelated keys, and other storage areas.
      if (event.storageArea !== localStorage || (event.key !== LOCAL_STORAGE_KEY && event.key !== null)) return;
      // A remote update, removal or clear updates React state but never echoes a write.
      setViewState(parseStoredViewState(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const timeBasis = viewState.timeBasis ?? "update_time";

  const persistToStorage = (newState: ViewState) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.warn("Failed to persist view settings:", error);
    }
  };

  const updateState = (patch: Partial<ViewState> | ((prev: ViewState) => Partial<ViewState>)) => {
    setViewState((prev) => {
      const newState = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
      persistToStorage(newState);
      return newState;
    });
  };

  const setOrderByTimeAsc = (value: boolean) => updateState({ orderByTimeAsc: value });
  const setTimeBasis = (field: MemoTimeBasis) => updateState({ timeBasis: field });
  const setCompactMode = (value: boolean) => updateState({ compactMode: value });
  const setLinkPreview = (value: boolean) => updateState({ linkPreview: value });
  const setMaxColumns = (value: MemoMaxColumns) => updateState({ maxColumns: value, layoutPreferenceVersion: 2 });
  const resetViewSettings = () => {
    // Reset in one state/storage write so legacy sort aliases and stale values
    // cannot survive a sequence of partial setter updates.
    const defaults = { ...DEFAULT_VIEW_STATE };
    setViewState(defaults);
    persistToStorage(defaults);
  };

  return (
    <ViewContext.Provider
      value={{
        orderByTimeAsc: viewState.orderByTimeAsc,
        timeBasis,
        compactMode: viewState.compactMode,
        linkPreview: viewState.linkPreview,
        maxColumns: viewState.maxColumns,
        setOrderByTimeAsc,
        setTimeBasis,
        setCompactMode,
        setLinkPreview,
        setMaxColumns,
        resetViewSettings,
      }}
    >
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error("useView must be used within ViewProvider");
  }
  return context;
}

// Read the link-preview preference from deep inside the markdown renderer, which
// can render outside a ViewProvider (tests, isolated previews). Defaults to
// enabled when no provider is present, preserving the historical behavior.
export function useLinkPreviewEnabled() {
  return useContext(ViewContext)?.linkPreview ?? DEFAULT_VIEW_STATE.linkPreview;
}
