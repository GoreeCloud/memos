import { CheckIcon, PaletteIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { userServiceClient } from "@/connect";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateUserGeneralSetting } from "@/hooks/useUserQueries";
import { LABEL_PRESET_COLORS } from "@/lib/label-palette";

const MemoColorMenu = ({ memoName }: { memoName: string }) => {
  const { currentUser, userGeneralSetting, refetchSettings } = useAuth();
  const { mutateAsync } = useUpdateUserGeneralSetting(currentUser?.name);
  const [busy, setBusy] = useState(false);
  const current = userGeneralSetting?.memoColors?.[memoName]?.toLowerCase();
  const save = async (hex?: string) => {
    if (!currentUser || busy) return;
    setBusy(true);
    try {
      // The initial card settings may be stale when another device changes colors.
      // Refresh before writing a whole-map setting to preserve remote edits.
      const { settings } = await userServiceClient.listUserSettings({ parent: currentUser.name });
      const latest = settings.find((setting) => setting.value.case === "generalSetting");
      if (!latest || latest.value.case !== "generalSetting") {
        throw new Error("Current memo-color settings are unavailable");
      }
      const next = { ...latest.value.value.memoColors };
      if (hex) next[memoName] = hex;
      else delete next[memoName];
      await mutateAsync({ generalSetting: { memoColors: next }, updateMask: ["memo_colors"] });
      await refetchSettings();
    } catch {
      toast.error("Could not save memo color. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={!currentUser || busy}>
        <PaletteIcon aria-hidden="true" />
        Memo color
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem disabled={busy} onClick={() => void save()}>
          {!current && <CheckIcon aria-hidden="true" />}
          {current && <span className="size-4 rounded-full border" aria-hidden="true" />}
          Default
        </DropdownMenuItem>
        {LABEL_PRESET_COLORS.map(({ id, label, hex }) => (
          <DropdownMenuItem key={id} disabled={busy} onClick={() => void save(hex)}>
            <span className="size-4 rounded-full border border-black/15" style={{ backgroundColor: hex }} aria-hidden="true" />
            {label}
            {current === hex.toLowerCase() && <CheckIcon className="ms-auto size-4" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};

export default MemoColorMenu;
