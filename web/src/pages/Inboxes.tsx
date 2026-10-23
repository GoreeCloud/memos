import { timestampDate } from "@bufbuild/protobuf/wkt";
import { BellIcon, BellOffIcon, CheckCheckIcon, RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import MemoCommentMessage from "@/components/Inbox/MemoCommentMessage";
import MemoMentionMessage from "@/components/Inbox/MemoMentionMessage";
import SpaceInvitationMessage from "@/components/Inbox/SpaceInvitationMessage";
import { useAppSidebar } from "@/contexts/AppSidebarContext";
import { useNotifications } from "@/hooks/useUserQueries";
import { cn } from "@/lib/utils";
import { type UserNotification, UserNotification_Status, UserNotification_Type } from "@/types/proto/api/v1/user_service_pb";
import { useTranslate } from "@/utils/i18n";

type InboxFilter = "all" | "unread" | "archived";

/** The dashboard sidebar owns navigation; Inbox owns its notification filters and actions. */
const Inboxes = () => {
  const t = useTranslate();
  const { inboxFilter: filter, setInboxFilter } = useAppSidebar();
  const { data: fetchedNotifications = [], isPending, isError, isFetching, refetch } = useNotifications();
  const allNotifications = [...fetchedNotifications].sort(
    (a, b) => (b.createTime ? timestampDate(b.createTime).getTime() : 0) - (a.createTime ? timestampDate(a.createTime).getTime() : 0),
  );
  const unreadCount = allNotifications.filter((item) => item.status === UserNotification_Status.UNREAD).length;
  const archivedCount = allNotifications.filter((item) => item.status === UserNotification_Status.ARCHIVED).length;
  const filters: { id: InboxFilter; label: string; count: number }[] = [
    { id: "all", label: t("common.all"), count: allNotifications.length },
    { id: "unread", label: t("inbox.unread"), count: unreadCount },
    { id: "archived", label: t("common.archived"), count: archivedCount },
  ];
  const notifications = allNotifications.filter((item) => {
    if (filter === "unread") return item.status === UserNotification_Status.UNREAD;
    if (filter === "archived") return item.status === UserNotification_Status.ARCHIVED;
    return true;
  });
  const emptyTitle = filter === "unread" ? t("inbox.no-unread") : filter === "archived" ? t("inbox.no-archived") : t("inbox.empty-all");
  const emptyDescription =
    filter === "unread"
      ? t("inbox.empty-unread-description")
      : filter === "archived"
        ? t("inbox.empty-archived-description")
        : t("inbox.empty-description");

  const renderNotification = (notification: UserNotification) => {
    if (notification.type === UserNotification_Type.MEMO_COMMENT) {
      return <MemoCommentMessage key={notification.name} notification={notification} />;
    }
    if (notification.type === UserNotification_Type.MEMO_MENTION) {
      return <MemoMentionMessage key={notification.name} notification={notification} />;
    }
    if (notification.type === UserNotification_Type.SPACE_INVITATION) {
      return <SpaceInvitationMessage key={notification.name} notification={notification} />;
    }
    return null;
  };

  return (
    <section data-inbox-page className="min-h-full w-full px-4 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 py-5 md:gap-6 md:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm sm:size-12">
              <BellIcon className="size-5 sm:size-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">{t("common.inbox")}</h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("inbox.page-description")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:opacity-60"
          >
            <RefreshCwIcon className={cn("size-4", isFetching && "animate-spin")} aria-hidden="true" />
            {t("inbox.refresh")}
          </button>
        </header>

        <div role="group" className="grid grid-cols-3 gap-2.5 sm:gap-4" aria-label={t("inbox.summary")}>
          {filters.map(({ id, label, count }) => (
            <div key={id} className="min-w-0 rounded-2xl border border-border/80 bg-background px-3 py-3 shadow-sm sm:px-5 sm:py-4">
              <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl" data-inbox-count={id}>
                {count}
              </p>
            </div>
          ))}
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/75 px-3 py-3 sm:px-5">
            <div className="flex max-w-full flex-wrap gap-1.5" role="group" aria-label={t("inbox.filter-label")}>
              {filters.map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  data-inbox-filter={id}
                  aria-pressed={filter === id}
                  onClick={() => setInboxFilter(id)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                    filter === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {label}
                  <span className={cn("text-xs tabular-nums", filter === id ? "text-primary" : "text-muted-foreground")}>{count}</span>
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {t("inbox.showing-count", { count: notifications.length })}
            </span>
          </div>

          {isPending ? (
            <div role="status" className="flex flex-col gap-3 px-5 py-8" aria-label={t("inbox.loading")}>
              {[0, 1, 2].map((id) => (
                <div key={id} className="flex animate-pulse items-center gap-3" aria-hidden="true">
                  <div className="size-10 shrink-0 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/5 rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                </div>
              ))}
              <span className="sr-only">{t("inbox.loading")}</span>
            </div>
          ) : isError ? (
            <div role="alert" className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 py-12 text-center">
              <RotateCcwIcon className="size-8 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-base font-semibold">{t("inbox.load-error")}</h2>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("inbox.try-again")}
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-14 text-center" data-inbox-empty>
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-border/70 bg-muted/50 text-muted-foreground">
                {filter === "unread" ? (
                  <CheckCheckIcon className="size-8" aria-hidden="true" />
                ) : (
                  <BellOffIcon className="size-8" aria-hidden="true" />
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground">{emptyTitle}</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{emptyDescription}</p>
              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => setInboxFilter("all")}
                  className="mt-5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("inbox.view-all")}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col" data-inbox-notifications>
              {notifications.map(renderNotification)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Inboxes;
