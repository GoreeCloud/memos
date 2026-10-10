import { CheckIcon } from "lucide-react";
import { LABEL_PRESET_COLORS } from "@/lib/label-palette";
import { cn } from "@/lib/utils";

/** Preset swatches supplement the existing custom hex control; color is never the only cue. */
const LabelColorSwatches = ({ value, onChange, label }: { value?: string; onChange: (next?: string) => void; label: string }) => (
  <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={() => onChange(undefined)}
      aria-label="Default color"
      aria-pressed={!value}
      title="Default color"
      className={cn(
        "flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        !value && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      {!value && <CheckIcon aria-hidden="true" className="size-4" />}
    </button>
    {LABEL_PRESET_COLORS.map((color) => {
      const selected = value?.toLowerCase() === color.hex.toLowerCase();
      return (
        <button
          type="button"
          key={color.id}
          onClick={() => onChange(color.hex)}
          aria-label={color.label}
          title={color.label}
          aria-pressed={selected}
          className={cn(
            "flex size-8 items-center justify-center rounded-full border border-black/10 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
          style={{ backgroundColor: color.hex }}
        >
          {selected && <CheckIcon aria-hidden="true" className="size-4" />}
        </button>
      );
    })}
  </div>
);
export default LabelColorSwatches;
