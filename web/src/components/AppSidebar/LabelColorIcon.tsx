import { HashIcon } from "lucide-react";
import { SIDEBAR_ROW_ICON_CLASSES, SIDEBAR_ROW_SLOT_CLASSES } from "./SidebarRow";

/** Keep labels identifiable by name; colored swatches are decorative enhancements. */
const LabelColorIcon = ({ color }: { color?: string }) => (
  <span className={SIDEBAR_ROW_SLOT_CLASSES} aria-hidden="true">
    {color ? (
      <span
        data-testid="label-color-marker"
        className="size-3.5 shrink-0 rounded-[5px] border border-black/10 shadow-sm dark:border-white/20"
        style={{ backgroundColor: color }}
      />
    ) : (
      <HashIcon className={SIDEBAR_ROW_ICON_CLASSES} strokeWidth={1.8} />
    )}
  </span>
);
export default LabelColorIcon;
