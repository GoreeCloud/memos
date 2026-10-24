import { ChevronDownIcon, ChevronUpIcon, InfoIcon } from "lucide-react";
import { useState } from "react";

interface Props {
  enabled: boolean;
  revision?: string;
  stage?: string;
  qualification?: string;
}

/** Build-gated, informational only: never expose deployment data, user content, or credentials. */
const DevelopmentUpdateNotice = ({ enabled, revision, stage, qualification }: Props) => {
  // Keep the development notice available without obscuring the memo feed on phones.
  // Visitors can expand it when they want build details.
  const [expanded, setExpanded] = useState(false);
  if (!enabled) return null;

  const buildLabel = revision?.match(/^[0-9a-f]{40}$/i) ? revision.slice(0, 8) : "Development";
  const stageLabel = /^(forge|seal|anchor)$/.test(stage ?? "") ? `${stage?.slice(0, 1).toUpperCase()}${stage?.slice(1)}` : "Unknown";
  const qualificationLabel = /^(qualified|not-qualified)$/.test(qualification ?? "") ? qualification : "unverified";

  return (
    <aside
      aria-label="GoreeCloud Memos Development preview"
      className="relative mx-3 my-3 max-w-sm rounded-2xl border border-primary/30 bg-card/95 text-card-foreground shadow-xl backdrop-blur-md sm:fixed sm:inset-x-auto sm:right-5 sm:bottom-5 sm:z-50 sm:mx-0 sm:my-0 sm:w-80"
      data-development-update
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <InfoIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate text-sm font-semibold">Development preview</span>
          <span
            role="status"
            aria-label={`Source lifecycle: ${stageLabel}`}
            className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {stageLabel}
          </span>
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
        <p className="text-sm font-medium">Development feature preview</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Open Quick Find with Ctrl+K or ⌘K. Edit search chips or clear multiple search terms at once.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Source metadata: {stageLabel} · {qualificationLabel} · Runtime not verified
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">Build {buildLabel} · Development only</p>
      </div>
    </aside>
  );
};

export default DevelopmentUpdateNotice;
