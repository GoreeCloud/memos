import {
  ArchiveIcon,
  BellIcon,
  CalendarDaysIcon,
  CheckSquare2Icon,
  Clock3Icon,
  FileAudioIcon,
  FileStackIcon,
  FileTextIcon,
  HouseIcon,
  ImageIcon,
  ListIcon,
  LockKeyholeIcon,
  type LucideIcon,
  PaperclipIcon,
  Settings2Icon,
  StarIcon,
  TagIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { type AttachmentSection, useAppSidebar } from "@/contexts/AppSidebarContext";
import { useSpaceContext } from "@/contexts/SpaceContext";
import { useAttachmentLibraryStats } from "@/hooks/useAttachmentLibrary";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useFilteredMemoStats } from "@/hooks/useFilteredMemoStats";
import { getProfileUsername } from "@/lib/memo-views";
import { buildCollectionPath, ROUTES } from "@/router/routes";
import { useTranslate } from "@/utils/i18n";
import TagsSection from "./TagsSection";
import "./DashboardSidebar.css";
import { getSidebarRouteKind } from "./routes";

type NavigationItem = { id: string; label: string; icon: LucideIcon; href: string };

const AttachmentFilters = () => {
  const t = useTranslate();
  const { attachmentSection, setAttachmentSection, setMobileOpen } = useAppSidebar();
  const { selectedSpaceName, memoFilter } = useSpaceContext();
  const { stats, isComplete } = useAttachmentLibraryStats(memoFilter);
  const rows = [
    { id: "all", label: t("common.all"), icon: ListIcon, count: stats.media + stats.documents + stats.audio },
    { id: "media", label: t("attachment-library.tabs.media"), icon: ImageIcon, count: stats.media },
    { id: "audio", label: t("attachment-library.tabs.audio"), icon: FileAudioIcon, count: stats.audio },
    { id: "documents", label: t("attachment-library.tabs.documents"), icon: FileTextIcon, count: stats.documents },
    ...(!selectedSpaceName ? [{ id: "unused", label: t("attachment-library.labels.unused"), icon: Trash2Icon, count: stats.unused }] : []),
  ] as const;
  return (
    <section aria-label={t("common.attachments")}>
      <div className="gc-dashboard-side-separator" />
      <h2 className="gc-dashboard-side-caption">{t("common.attachments")}</h2>
      <div className="gc-dashboard-side-main">
        {rows.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            type="button"
            aria-pressed={attachmentSection === id}
            className="gc-dashboard-side-link gc-dashboard-side-link--nested"
            onClick={() => {
              setAttachmentSection(id as AttachmentSection);
              setMobileOpen(false);
            }}
          >
            <Icon size={17} aria-hidden="true" strokeWidth={1.9} />
            <span className="gc-dashboard-side-label">{label}</span>
            {isComplete && <span className="gc-dashboard-side-count">{count}</span>}
          </button>
        ))}
      </div>
    </section>
  );
};

/** Persist the GoreeCloud navigation on every dashboard-adjacent route. */
const DashboardSidebar = () => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const { setMobileOpen } = useAppSidebar();
  const { selectedSpaceName, memoFilter } = useSpaceContext();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const dashboard = params.get("dashboard") || (pathname === ROUTES.DASHBOARD ? "home" : "all");
  const root = buildCollectionPath(ROUTES.HOME, selectedSpaceName);
  const attachments = buildCollectionPath(ROUTES.ATTACHMENTS, selectedSpaceName);
  const routeKind = getSidebarRouteKind(pathname);
  const isHome = routeKind === "home";
  const { tags } = useFilteredMemoStats({
    context: "home",
    userName: currentUser?.name,
    filter: memoFilter,
    enabled: isHome && Boolean(currentUser),
  });
  const isArchived = routeKind === "archived";
  const isAttachments = routeKind === "attachments";
  const isInbox = routeKind === "inbox";
  const isSettings = routeKind === "settings";
  const primary: NavigationItem[] = [
    { id: "home", label: t("common.home"), icon: HouseIcon, href: ROUTES.DASHBOARD },
    { id: "all", label: t("dashboard.all-memos"), icon: FileStackIcon, href: root },
    { id: "favorites", label: t("dashboard.pinned"), icon: StarIcon, href: `${root}?dashboard=favorites` },
    { id: "private", label: t("memo.visibility.private"), icon: LockKeyholeIcon, href: `${root}?dashboard=private` },
    { id: "labels", label: t("common.labels"), icon: TagIcon, href: `${root}?dashboard=labels` },
    { id: "archived", label: t("common.archived"), icon: ArchiveIcon, href: ROUTES.ARCHIVED },
  ];
  const quick: NavigationItem[] = [
    { id: "recent", label: t("dashboard.recent"), icon: Clock3Icon, href: `${root}?dashboard=recent` },
    { id: "tasks", label: t("dashboard.my-tasks"), icon: CheckSquare2Icon, href: `${root}?dashboard=tasks` },
    { id: "today", label: t("common.today"), icon: CalendarDaysIcon, href: `${root}?dashboard=today` },
    { id: "week", label: t("dashboard.this-week"), icon: CalendarDaysIcon, href: `${root}?dashboard=week` },
    { id: "attachments", label: t("common.attachments"), icon: PaperclipIcon, href: attachments },
  ];
  // Keep account and service routes available without pushing the owner's
  // Labels section below the sidebar fold on normal desktop viewports.
  const utilities: NavigationItem[] = [
    ...(currentUser?.username
      ? [{ id: "profile", label: t("common.profile"), icon: UserRoundIcon, href: `/u/${encodeURIComponent(currentUser.username)}` }]
      : []),
    { id: "inbox", label: t("common.inbox"), icon: BellIcon, href: ROUTES.INBOX },
    { id: "settings", label: t("common.settings"), icon: Settings2Icon, href: ROUTES.SETTING },
  ];
  const row = (item: NavigationItem) => {
    const Icon = item.icon;
    const active =
      item.id === "archived"
        ? isArchived
        : item.id === "attachments"
          ? isAttachments
          : item.id === "inbox"
            ? isInbox
            : item.id === "settings"
              ? isSettings
              : item.id === "profile"
                ? routeKind === "profile" && getProfileUsername(pathname) === currentUser?.username
                : isHome && dashboard === item.id;
    return (
      <Link
        key={item.id}
        to={item.href}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
        className="gc-dashboard-side-link"
      >
        <Icon aria-hidden="true" size={20} strokeWidth={2} />
        <span className="gc-dashboard-side-label">{item.label}</span>
      </Link>
    );
  };
  return (
    <nav className="gc-dashboard-side-navigation" aria-label="Memos dashboard">
      <div className="gc-dashboard-side-main">{primary.map(row)}</div>
      <div className="gc-dashboard-side-separator" />
      <h2 className="gc-dashboard-side-caption"> {t("dashboard.quick-filters")}</h2>
      <div className="gc-dashboard-side-main">{quick.map(row)}</div>
      {isAttachments && <AttachmentFilters />}
      {isHome && currentUser && (
        <div className="gc-dashboard-side-tags">
          <div className="gc-dashboard-side-separator" />
          <TagsSection
            tagCount={tags}
            scope={`${currentUser.name}${selectedSpaceName ? `:${selectedSpaceName}` : ""}`}
            onSelect={() => setMobileOpen(false)}
          />
        </div>
      )}
      <div className="gc-dashboard-side-separator" />
      <h2 className="gc-dashboard-side-caption">{t("setting.sso.account")}</h2>
      <div className="gc-dashboard-side-main">{utilities.map(row)}</div>
      {/* Settings categories live inside the Settings page, not in global navigation. */}
    </nav>
  );
};
export default DashboardSidebar;
