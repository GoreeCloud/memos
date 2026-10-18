import {
  ArchiveIcon,
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
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { DEFAULT_SETTING_SECTION, SETTINGS_SECTIONS } from "@/components/Settings/settingSections";
import { type AttachmentSection, useAppSidebar } from "@/contexts/AppSidebarContext";
import { useSpaceContext } from "@/contexts/SpaceContext";
import { useAttachmentLibraryStats } from "@/hooks/useAttachmentLibrary";
import useCurrentUser from "@/hooks/useCurrentUser";
import { buildCollectionPath, ROUTES } from "@/router/routes";
import { User_Role } from "@/types/proto/api/v1/user_service_pb";
import { useTranslate } from "@/utils/i18n";
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

const SettingsNavigation = () => {
  const t = useTranslate();
  const user = useCurrentUser();
  const { hash } = useLocation();
  const { setMobileOpen } = useAppSidebar();
  const current = hash.slice(1) || DEFAULT_SETTING_SECTION;
  const groups = [
    { scope: "basic", label: t("common.basic") },
    ...(user?.role === User_Role.ADMIN ? [{ scope: "admin", label: t("common.admin") }] : []),
  ];
  return (
    <div aria-label={t("common.settings")} className="gc-dashboard-settings-navigation">
      {groups.map(({ scope, label }) => (
        <section key={scope} aria-label={label}>
          <div className="gc-dashboard-side-separator" />
          <h2 className="gc-dashboard-side-caption">{label}</h2>
          <div className="gc-dashboard-side-main">
            {SETTINGS_SECTIONS.filter((section) => section.scope === scope).map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.key}
                  to={`${ROUTES.SETTING}#${section.key}`}
                  aria-current={current === section.key ? "page" : undefined}
                  className="gc-dashboard-side-link gc-dashboard-side-link--nested"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={17} aria-hidden="true" strokeWidth={1.9} />
                  <span className="gc-dashboard-side-label">{t(section.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

/** Persist the GoreeCloud navigation on every dashboard-adjacent route. */
const DashboardSidebar = () => {
  const t = useTranslate();
  const { setMobileOpen } = useAppSidebar();
  const { selectedSpaceName } = useSpaceContext();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const dashboard = params.get("dashboard") || "home";
  const root = buildCollectionPath(ROUTES.HOME, selectedSpaceName);
  const attachments = buildCollectionPath(ROUTES.ATTACHMENTS, selectedSpaceName);
  const routeKind = getSidebarRouteKind(pathname);
  const isHome = routeKind === "home";
  const isArchived = routeKind === "archived";
  const isAttachments = routeKind === "attachments";
  const isSettings = routeKind === "settings";
  const primary: NavigationItem[] = [
    { id: "home", label: "Home", icon: HouseIcon, href: root },
    { id: "all", label: "All Memos", icon: FileStackIcon, href: `${root}?dashboard=all` },
    { id: "favorites", label: "Favorites", icon: StarIcon, href: `${root}?dashboard=favorites` },
    { id: "private", label: "Private", icon: LockKeyholeIcon, href: `${root}?dashboard=private` },
    { id: "labels", label: "Labels", icon: TagIcon, href: `${root}?dashboard=labels` },
    { id: "archived", label: "Archived", icon: ArchiveIcon, href: ROUTES.ARCHIVED },
  ];
  const quick: NavigationItem[] = [
    { id: "recent", label: "Recent", icon: Clock3Icon, href: `${root}?dashboard=recent` },
    { id: "tasks", label: "My Tasks", icon: CheckSquare2Icon, href: `${root}?dashboard=tasks` },
    { id: "attachments", label: t("common.attachments"), icon: PaperclipIcon, href: attachments },
    { id: "settings", label: t("common.settings"), icon: Settings2Icon, href: ROUTES.SETTING },
  ];
  const row = (item: NavigationItem) => {
    const Icon = item.icon;
    const active =
      item.id === "archived"
        ? isArchived
        : item.id === "attachments"
          ? isAttachments
          : item.id === "settings"
            ? isSettings
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
      <h2 className="gc-dashboard-side-caption">Quick Filters</h2>
      <div className="gc-dashboard-side-main">{quick.map(row)}</div>
      {isAttachments && <AttachmentFilters />}
      {isSettings && <SettingsNavigation />}
    </nav>
  );
};
export default DashboardSidebar;
