import { matchPath } from "react-router-dom";
import { ROUTES, resolveCollectionRoute } from "@/router/routes";

export type MemoScope = "home" | "explore" | "archived";
export type PrimaryMemoScope = Exclude<MemoScope, "archived">;

export const BUILTIN_TASKS_VIEW_ID = "__built_in_tasks__";
export const BUILTIN_TASKS_VIEW_FILTER = "has_task_list && has_incomplete_tasks";

/** Reject blank or whitespace-only saved-view names and query expressions before submission. */
export const hasMemoViewDraftContent = (title: string, filter: string): boolean => title.trim().length > 0 && filter.trim().length > 0;

export const getMemoViewId = (name: string): string => {
  const parts = name.split("/");
  return parts.length === 4 ? parts[3] : name;
};

const cleanPathname = (value: string): string => {
  const pathname = value.split(/[?#]/, 1)[0] || ROUTES.HOME;
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
};

/** Lower-cased global pathname, so a Space-scoped URL compares like its global twin. */
const comparablePathname = (pathname: string): string => resolveCollectionRoute(pathname).pathname.toLowerCase();

export const isMemoScopeRoute = (pathname: string): boolean => {
  const comparablePath = comparablePathname(pathname);
  return comparablePath === ROUTES.HOME || comparablePath === ROUTES.EXPLORE || comparablePath === ROUTES.ARCHIVED;
};

const PROFILE_ROUTE_PATTERN = /^\/u\/([^/]+)$/i;

/** The decoded username for a valid profile route; malformed URI escapes are not a profile. */
export const getProfileUsername = (pathname: string): string | undefined => {
  const match = cleanPathname(pathname).match(PROFILE_ROUTE_PATTERN);
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
};

/** `/calendar` and any month or day beneath it. */
export const isCalendarRoute = (pathname: string): boolean => {
  const comparablePath = comparablePathname(pathname);
  return comparablePath === ROUTES.CALENDAR || comparablePath.startsWith(`${ROUTES.CALENDAR}/`);
};

/**
 * Routes that render a memo collection the sidebar can narrow: the scope routes, a user
 * profile and the calendar. Views, calendar days and tags apply in place on all of them.
 */
export const isMemoCollectionRoute = (pathname: string): boolean =>
  isMemoScopeRoute(pathname) ||
  getProfileUsername(pathname) !== undefined ||
  isCalendarRoute(pathname) ||
  matchPath(ROUTES.MAP, comparablePathname(pathname)) !== null;

export const getMemoScopePath = (scope: PrimaryMemoScope): string => (scope === "explore" ? ROUTES.EXPLORE : ROUTES.HOME);

interface ResolveMemoScopeOptions {
  currentUsername?: string;
  detailFrom?: string;
  memoArchived?: boolean;
  fallback?: MemoScope;
}

export const resolveMemoScope = (pathname: string, options: ResolveMemoScopeOptions = {}): MemoScope => {
  const cleanPath = cleanPathname(pathname);
  const comparablePath = comparablePathname(cleanPath);
  if (comparablePath === ROUTES.EXPLORE) return "explore";
  if (comparablePath === ROUTES.ARCHIVED) return "archived";
  if (comparablePath === ROUTES.HOME) return "home";

  const profileUsername = getProfileUsername(cleanPath);
  if (profileUsername !== undefined) {
    return options.currentUsername && profileUsername === options.currentUsername ? "home" : "explore";
  }

  if (comparablePath.startsWith("/memos/") && options.detailFrom) {
    return resolveMemoScope(options.detailFrom, {
      currentUsername: options.currentUsername,
      fallback: options.fallback,
    });
  }

  if (comparablePath.startsWith("/memos/") && options.memoArchived) {
    return "archived";
  }

  return options.fallback ?? "home";
};
