import { create } from "@bufbuild/protobuf";
import { CheckIcon, PlusIcon, TagsIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useTagCounts, useUpdateUserSetting } from "@/hooks/useUserQueries";
import { isLiteralLabelName } from "@/lib/label-name";
import { buildUserSettingName } from "@/lib/resource-names";
import {
  UserSetting_Key,
  UserSetting_TagMetadataSchema,
  UserSetting_TagsSettingSchema,
  UserSettingSchema,
} from "@/types/proto/api/v1/user_service_pb";
import { useTranslate } from "@/utils/i18n";
import { findTagMatches } from "@/utils/tag-grammar";
import { useEditorSelector } from "../state";

/** Adds one or more hashtag-backed labels without interrupting the draft. */
const ComposerLabelSelector = ({ onInsert, disabled }: { onInsert: (labels: string[]) => void; disabled?: boolean }) => {
  const t = useTranslate();
  const { currentUser, userTagsSetting, refetchSettings } = useAuth();
  const { mutateAsync: updateUserSetting } = useUpdateUserSetting();
  const { data: tagCounts = {} } = useTagCounts(true);
  const content = useEditorSelector((s) => s.content);
  const assigned = useMemo(() => new Set(findTagMatches(content).map((match) => match.value)), [content]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const names = useMemo(
    () => Array.from(new Set([...Object.keys(tagCounts), ...Object.keys(userTagsSetting?.tags ?? {}).filter(isLiteralLabelName)])).sort(),
    [tagCounts, userTagsSetting],
  );
  const matching = names.filter((name) => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const name = newName.trim();
  const canCreate = Boolean(currentUser) && isLiteralLabelName(name) && !names.includes(name) && !busy;
  const createLabel = async () => {
    if (!canCreate || !currentUser) return;
    setBusy(true);
    try {
      const tags = { ...(userTagsSetting?.tags ?? {}), [name]: create(UserSetting_TagMetadataSchema, { blurContent: false }) };
      await updateUserSetting({
        setting: create(UserSettingSchema, {
          name: buildUserSettingName(currentUser.name, UserSetting_Key.TAGS),
          value: { case: "tagsSetting", value: create(UserSetting_TagsSettingSchema, { tags }) },
        }),
        updateMask: ["tags"],
      });
      await refetchSettings();
      setSelected((values) => (values.includes(name) ? values : [...values, name]));
      setNewName("");
    } catch {
      toast.error(t("editor.validation.cannot-save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (next) {
          setSelected([]);
          setQuery("");
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="quiet"
            size="sm"
            disabled={disabled}
            aria-label={t("common.labels")}
            className="gap-1.5 text-muted-foreground"
          />
        }
      >
        <TagsIcon className="size-4 opacity-75" strokeWidth={1.8} aria-hidden="true" />
        <span className="hidden sm:inline">{t("common.labels")}</span>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-[min(19rem,calc(100vw-2rem))] space-y-3 rounded-xl p-3">
        <h3 className="text-sm font-medium">{t("common.labels")}</h3>
        <Input
          aria-label={t("common.search") + " " + t("common.labels")}
          placeholder={t("common.search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div role="group" aria-label={t("common.labels")} className="max-h-48 space-y-0.5 overflow-y-auto">
          {matching.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">{t("home.labels-empty")}</p>}
          {matching.map((tag) => {
            const alreadyAssigned = assigned.has(tag);
            const checked = selected.includes(tag) || alreadyAssigned;
            return (
              <button
                key={tag}
                type="button"
                disabled={alreadyAssigned || busy}
                aria-pressed={checked}
                onClick={() => setSelected((values) => (values.includes(tag) ? values.filter((v) => v !== tag) : [...values, tag]))}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-start text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-65"
              >
                <span className="flex size-4 items-center justify-center rounded border border-border">
                  {checked && <CheckIcon aria-hidden="true" className="size-3 text-primary" />}
                </span>
                <span className="min-w-0 truncate">#{tag}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5 border-t pt-3">
          <Input
            aria-label={t("common.create") + " " + t("common.labels")}
            placeholder="work"
            maxLength={64}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <Button type="button" variant="outline" size="sm" disabled={!canCreate} onClick={() => void createLabel()}>
            <PlusIcon className="size-3.5" aria-hidden="true" />
            {t("common.create")}
          </Button>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="quiet" size="sm" onClick={() => setOpen(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selected.length === 0 || busy}
            onClick={() => {
              onInsert(selected);
              setSelected([]);
              setOpen(false);
            }}
          >
            {t("common.add")} ({selected.length})
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ComposerLabelSelector;
