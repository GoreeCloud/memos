import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import UpdateAccountDialog from "@/components/UpdateAccountDialog";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useUser } from "@/hooks/useUserQueries";
import { LOADING_INDICATOR_DELAY_MS } from "@/lib/constants";
import { userNamePrefix } from "@/lib/resource-names";
import { ROUTES } from "@/router/routes";
import type { User } from "@/types/proto/api/v1/user_service_pb";
import { useTranslate } from "@/utils/i18n";

/**
 * Profile identity and the memo collection are different parts of the page.
 * The user menu must never land in what looks like a second All Memos screen.
 */
const ProfileOverview = ({ user, isOwner, onEdit }: { user: User; isOwner: boolean; onEdit: () => void }) => {
  const t = useTranslate();

  return (
    <>
      <section aria-label={t("common.profile")} className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar className="size-12 shrink-0 rounded-xl" avatarUrl={user.avatarUrl} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("common.profile")}</h1>
            <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{user.displayName || user.username}</h2>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
            {user.description && (
              <p className="mt-1 max-w-2xl whitespace-pre-wrap break-words text-xs text-muted-foreground">{user.description}</p>
            )}
          </div>
          {isOwner && (
            <Button variant="outline" size="sm" className="shrink-0" onClick={onEdit}>
              <PencilIcon className="me-1.5 size-3.5" aria-hidden="true" />
              {t("common.edit")}
            </Button>
          )}
        </div>
      </section>
    </>
  );
};

const ProfileLoading = () => {
  const t = useTranslate();
  return (
    <section className="flex w-full flex-col gap-5" aria-busy="true" aria-label={t("common.profile")}>
      <div className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40" />
      <div className="h-36 animate-pulse rounded-2xl border border-border bg-muted/40" />
    </section>
  );
};

const ProfileNotFound = ({ username }: { username: string }) => {
  const t = useTranslate();
  return (
    <section className="w-full rounded-2xl border border-border bg-card p-8">
      <h1 className="text-2xl font-semibold text-foreground">{t("profile.not-found-title")}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("profile.not-found-description", { username })}</p>
      <Link to={ROUTES.EXPLORE} className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
        {t("common.explore")}
      </Link>
    </section>
  );
};

const UserProfile = () => {
  const username = useParams().username ?? "";
  const currentUser = useCurrentUser();
  const [editOpen, setEditOpen] = useState(false);
  const { data: user, isLoading } = useUser(`${userNamePrefix}${username}`, { enabled: !!username });
  const showSkeleton = useDelayedFlag(isLoading, LOADING_INDICATOR_DELAY_MS);

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        {isLoading ? showSkeleton && <ProfileLoading /> : <ProfileNotFound username={username} />}
      </div>
    );
  }

  const isOwner = currentUser?.name === user.name;
  return (
    <div className="gc-profile-page mx-auto flex w-full max-w-7xl flex-col gap-6">
      <ProfileOverview user={user} isOwner={isOwner} onEdit={() => setEditOpen(true)} />

      {isOwner && <UpdateAccountDialog open={editOpen} onOpenChange={setEditOpen} />}
    </div>
  );
};

export default UserProfile;
