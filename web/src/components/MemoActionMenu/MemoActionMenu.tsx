import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  BookmarkMinusIcon,
  BookmarkPlusIcon,
  CheckCheckIcon,
  CheckIcon,
  CopyIcon,
  Edit3Icon,
  FileTextIcon,
  FolderInputIcon,
  LinkIcon,
  ListChecksIcon,
  ListRestartIcon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  PaletteIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LABEL_PRESET_COLORS } from "@/lib/label-palette";
import { State } from "@/types/proto/api/v1/common_pb";
import { useTranslate } from "@/utils/i18n";
import { useMemoActionHandlers } from "./hooks";
import MemoMoveDialog from "./MemoMoveDialog";
import type { MemoActionMenuProps } from "./types";

const MemoActionMenu = (props: MemoActionMenuProps) => {
  const { memo, readonly } = props;
  const t = useTranslate();

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  // Derived state
  const isComment = Boolean(memo.parent);
  const isArchived = memo.state === State.ARCHIVED;
  const canMutateTasks = !readonly && !isArchived && Boolean(memo.property?.hasTaskList);
  const hasOpenTasks = Boolean(memo.property?.hasIncompleteTasks);

  // Action handlers
  const {
    canMove,
    handleTogglePinMemoBtnClick,
    handleMemoCardColorChange,
    handleEditMemoClick,
    handleToggleMemoStatusClick,
    handleCopyLink,
    handleCopyContent,
    handleCheckAllTaskListItemsClick,
    handleUncheckAllTaskListItemsClick,
    handleDeleteMemoClick,
    confirmDeleteMemo,
  } = useMemoActionHandlers({
    memo,
    parentPage: props.parentPage,
    onEdit: props.onEdit,
    setDeleteDialogOpen,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="quiet" size="icon-sm" aria-label={t("common.more")} />}>
        <MoreVerticalIcon className="size-4" strokeWidth={1.8} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={2} size="sm">
        {/* Edit actions (non-readonly, non-archived) */}
        {!readonly && !isArchived && (
          <>
            {!isComment && (
              <DropdownMenuItem onClick={handleTogglePinMemoBtnClick}>
                {memo.pinned ? <BookmarkMinusIcon /> : <BookmarkPlusIcon />}
                {memo.pinned ? t("common.unpin") : t("common.pin")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleEditMemoClick}>
              <Edit3Icon />
              {t("common.edit")}
            </DropdownMenuItem>
            {!isComment && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <PaletteIcon />
                  {t("setting.tags.background-color")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent aria-label={t("setting.tags.background-color")}>
                  <DropdownMenuItem onClick={() => void handleMemoCardColorChange("")}>
                    <span aria-hidden="true" className="size-4 rounded-full border border-border bg-card" />
                    {t("setting.tags.default-color")}
                    {!memo.cardColor && <CheckIcon className="ms-auto size-4" aria-hidden="true" />}
                  </DropdownMenuItem>
                  {LABEL_PRESET_COLORS.map(({ id, label, hex }) => (
                    <DropdownMenuItem key={id} onClick={() => void handleMemoCardColorChange(id)}>
                      <span
                        aria-hidden="true"
                        className="size-4 shrink-0 rounded-full border border-black/10"
                        style={{ backgroundColor: hex }}
                      />
                      {label}
                      {memo.cardColor === id && <CheckIcon className="ms-auto size-4" aria-hidden="true" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </>
        )}

        {/* Copy submenu (non-archived) */}
        {!isArchived && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CopyIcon />
              {t("common.copy")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={handleCopyLink}>
                <LinkIcon />
                {t("memo.copy-link")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyContent}>
                <FileTextIcon />
                {t("memo.copy-content")}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Task submenu (writable task memos) */}
        {canMutateTasks && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ListChecksIcon />
              {t("memo.task-actions.title")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled={!hasOpenTasks} onClick={handleCheckAllTaskListItemsClick}>
                <CheckCheckIcon />
                {t("memo.task-actions.check-all")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleUncheckAllTaskListItemsClick}>
                <ListRestartIcon />
                {t("memo.task-actions.uncheck-all")}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {!readonly && !isComment && (
          <DropdownMenuItem onClick={handleToggleMemoStatusClick}>
            {isArchived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            {isArchived ? t("common.restore") : t("common.archive")}
          </DropdownMenuItem>
        )}

        {isComment && !readonly && (
          <>
            {!isArchived && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={handleDeleteMemoClick}>
              <TrashIcon />
              {t("common.delete")}
            </DropdownMenuItem>
          </>
        )}

        {!isComment && (canMove || !readonly) && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <MoreHorizontalIcon />
              {t("common.more")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {canMove && (
                <DropdownMenuItem onClick={() => setMoveDialogOpen(true)}>
                  <FolderInputIcon />
                  {t("memo.move.title")}
                </DropdownMenuItem>
              )}
              {!readonly && (
                <DropdownMenuItem onClick={handleDeleteMemoClick}>
                  <TrashIcon />
                  {t("common.delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
      </DropdownMenuContent>

      {moveDialogOpen && <MemoMoveDialog memo={memo} onOpenChange={setMoveDialogOpen} />}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("memo.delete-confirm")}
        confirmLabel={t("common.delete")}
        description={t("memo.delete-confirm-description")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmDeleteMemo}
        confirmVariant="destructive"
      />
    </DropdownMenu>
  );
};

export default MemoActionMenu;
