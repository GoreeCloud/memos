import {
  ArchiveIcon,
  CheckSquare2Icon,
  Clock3Icon,
  FileStackIcon,
  HouseIcon,
  LockKeyholeIcon,
  PaperclipIcon,
  StarIcon,
  TagIcon,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppSidebar } from "@/contexts/AppSidebarContext";
import { useSpaceContext } from "@/contexts/SpaceContext";
import { buildCollectionPath, ROUTES } from "@/router/routes";

const DashboardSidebar = () => {
  const { setMobileOpen } = useAppSidebar();
  const { selectedSpaceName } = useSpaceContext();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const dashboard = params.get("dashboard") || "home";
  const root = buildCollectionPath(ROUTES.HOME, selectedSpaceName);
  const attachments = buildCollectionPath(ROUTES.ATTACHMENTS, selectedSpaceName);
  const primary = [
    { id: "home", label: "Home", icon: HouseIcon, href: root },
    { id: "all", label: "All Memos", icon: FileStackIcon, href: `${root}?dashboard=all` },
    { id: "favorites", label: "Favorites", icon: StarIcon, href: `${root}?dashboard=favorites` },
    { id: "private", label: "Private", icon: LockKeyholeIcon, href: `${root}?dashboard=private` },
    { id: "labels", label: "Labels", icon: TagIcon, href: `${root}?dashboard=labels` },
    { id: "archived", label: "Archived", icon: ArchiveIcon, href: ROUTES.ARCHIVED },
  ];
  const quick = [
    { id: "recent", label: "Recent", icon: Clock3Icon, href: `${root}?dashboard=recent` },
    { id: "tasks", label: "My Tasks", icon: CheckSquare2Icon, href: `${root}?dashboard=tasks` },
    { id: "attachments", label: "Attachments", icon: PaperclipIcon, href: attachments },
  ];
  const row = (item: (typeof primary)[number]) => {
    const Icon = item.icon;
    const active =
      item.id === "archived" ? pathname === ROUTES.ARCHIVED : item.id === "attachments" ? pathname === attachments : dashboard === item.id;
    return (
      <Link
        key={item.id}
        to={item.href}
        onClick={() => setMobileOpen(false)}
        aria-current={active ? "page" : undefined}
        className="gc-dashboard-side-link"
      >
        <Icon aria-hidden="true" size={20} strokeWidth={2} />
        <span>{item.label}</span>
      </Link>
    );
  };
  return (
    <nav className="gc-dashboard-side-navigation" aria-label="Memos dashboard">
      <div className="gc-dashboard-side-main">{primary.map(row)}</div>
      <div className="gc-dashboard-side-separator" />
      <h2 className="gc-dashboard-side-caption">Quick Filters</h2>
      <div className="gc-dashboard-side-main">{quick.map(row)}</div>
    </nav>
  );
};
export default DashboardSidebar;
