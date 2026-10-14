import { create } from "@bufbuild/protobuf";
import { PlusIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "react-hot-toast";
import LabelColorSwatches from "@/components/LabelColorSwatches";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateUserSetting } from "@/hooks/useUserQueries";
import { isLiteralLabelName } from "@/lib/label-name";
import { buildUserSettingName } from "@/lib/resource-names";
import {
  UserSetting_Key,
  UserSetting_TagMetadataSchema,
  UserSetting_TagsSettingSchema,
  UserSettingSchema,
} from "@/types/proto/api/v1/user_service_pb";
import { ColorSchema } from "@/types/proto/google/type/color_pb";
import { useTranslate } from "@/utils/i18n";

/** Creates an exact tag-metadata label without leaving the memo collection. */
const SidebarCreateLabel = ({ prominent = false }: { prominent?: boolean }) => {
  const t = useTranslate();
  const { currentUser, userTagsSetting, refetchSettings } = useAuth();
  const { mutateAsync: updateUserSetting } = useUpdateUserSetting();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [color, setColor] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  if (!currentUser) return null;
  const label = t("common.add") + " " + t("common.labels");
  const name = value.trim();
  const valid = isLiteralLabelName(name) && !Object.hasOwn(userTagsSetting?.tags ?? {}, name);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      const tags = {
        ...(userTagsSetting?.tags ?? {}),
        [name]: create(UserSetting_TagMetadataSchema, {
          blurContent: false,
          ...(color
            ? {
                backgroundColor: create(ColorSchema, {
                  red: parseInt(color.slice(1, 3), 16) / 255,
                  green: parseInt(color.slice(3, 5), 16) / 255,
                  blue: parseInt(color.slice(5, 7), 16) / 255,
                }),
              }
            : {}),
        }),
      };
      await updateUserSetting({
        setting: create(UserSettingSchema, {
          name: buildUserSettingName(currentUser.name, UserSetting_Key.TAGS),
          value: { case: "tagsSetting", value: create(UserSetting_TagsSettingSchema, { tags }) },
        }),
        updateMask: ["tags"],
      });
      await refetchSettings();
      setValue("");
      setColor(undefined);
      setOpen(false);
    } catch {
      toast.error(t("editor.validation.cannot-save"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        variant={prominent ? "default" : "quiet"}
        size={prominent ? "sm" : "icon-sm"}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <PlusIcon className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
        {prominent && label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) {
            setOpen(next);
            if (!next) {
              setValue("");
              setColor(undefined);
            }
          }
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{t("home.labels-empty")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="flex flex-col gap-4">
            <Input
              autoFocus
              value={value}
              maxLength={64}
              onChange={(event) => setValue(event.target.value)}
              placeholder="work"
              aria-label={t("common.labels")}
            />
            <LabelColorSwatches label={t("setting.tags.background-color")} value={color} onChange={setColor} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setValue("");
                  setColor(undefined);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={!valid || busy}>
                {t("common.add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default SidebarCreateLabel;
