import { createContext, type ReactNode, useContext, useState } from "react";

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

const DEFAULT_VIEW_STATE: ViewState = { orderByTimeAsc: false, compactMode: false, linkPreview: true, maxColumns: 0 };

export function ViewProvider({ children }: { children: ReactNode }) {
  const getInitialState = (): ViewState => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as Partial<ViewState>;
        const cachedTimeBasis = data.timeBasis ?? data.sortTimeField;
        const timeBasis = cachedTimeBasis === "create_time" || cachedTimeBasis === "update_time" ? cachedTimeBasis : undefined;
        // The old one-column default was stored without evidence of an explicit choice.
        // Migrate that legacy value to masonry; preserve deliberate choices made afterward.
        const maxColumns =
          data.maxColumns === 1 && data.layoutPreferenceVersion !== 2
            ? DEFAULT_VIEW_STATE.maxColumns
            : MAX_COLUMNS_VALUES.includes(data.maxColumns as MemoMaxColumns)
              ? (data.maxColumns as MemoMaxColumns)
              : DEFAULT_VIEW_STATE.maxColumns;
        return {
          orderByTimeAsc: Boolean(data.orderByTimeAsc ?? DEFAULT_VIEW_STATE.orderByTimeAsc),
          timeBasis,
          compactMode: Boolean(data.compactMode ?? DEFAULT_VIEW_STATE.compactMode),
          linkPreview: Boolean(data.linkPreview ?? DEFAULT_VIEW_STATE.linkPreview),
          maxColumns,
          layoutPreferenceVersion: data.layoutPreferenceVersion === 2 ? 2 : undefined,
        };
      }
    } catch (error) {
      console.warn("Failed to load view settings from localStorage:", error);
    }
    return { ...DEFAULT_VIEW_STATE };
  };

  const [viewState, setViewState] = useState(getInitialState);
  const timeBasis = viewState.timeBasis ?? "create_time";

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
