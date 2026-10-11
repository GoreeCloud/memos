import { CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";

interface Props {
  enabled: boolean;
  revision?: string;
}

/** Build-gated, informational only: never expose deployment data, user content, or credentials. */
const DevelopmentUpdateNotice = ({ enabled, revision }: Props) => {
  const [expanded, setExpanded] = useState(true);
  if (!enabled) return null;

  const buildLabel = revision?.match(/^[0-9a-f]{40}$/i) ? revision.slice(0, 8) : "Development";

  return (
    <aside
      aria-label="GoreeCloud Memos Development preview"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm rounded-2xl border border-primary/30 bg-card/95 text-card-foreground shadow-xl backdrop-blur-md sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-80"
      data-development-update
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate text-sm font-semibold">Development preview</span>
        </div>
        <button
          type="button"
          aria-label={expanded ? "Collapse Development updates" : "Show Development updates"}
          aria-expanded={expanded}
          aria-controls="goreecloud-development-update-details"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronDownIcon className="size-4" aria-hidden="true" /> : <ChevronUpIcon className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <div id="goreecloud-development-update-details" hidden={!expanded} className="border-t border-border/70 px-4 pb-4 pt-3">
        <p className="text-sm font-medium">Search improvements are live</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Open Quick Find with Ctrl+K or ⌘K. Edit search chips or clear multiple search terms at once.
        </p>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">Build {buildLabel} · Development only</p>
      </div>
    </aside>
  );
};

export default DevelopmentUpdateNotice;
