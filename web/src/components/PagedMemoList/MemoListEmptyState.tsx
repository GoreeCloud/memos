import { FilePenLineIcon, SearchXIcon, SparklesIcon } from "lucide-react";
import { useTranslate } from "@/utils/i18n";

interface Props {
  filtered: boolean;
  message?: string;
}

const MemoListEmptyState = ({ filtered, message }: Props) => {
  const t = useTranslate();
  const Icon = filtered ? SearchXIcon : FilePenLineIcon;
  return (
    <section
      data-testid="memos-empty-state"
      aria-label={message || t(filtered ? "home.no-results-title" : "home.empty-title")}
      className="relative mx-auto my-4 w-full max-w-xl overflow-hidden rounded-2xl border border-border/65 bg-card/75 px-6 py-10 text-center shadow-[0_16px_45px_-38px_rgba(0,0,0,.35)] sm:px-10"
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-28 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
        <Icon className="size-7" strokeWidth={1.4} aria-hidden="true" />
        {!filtered && <SparklesIcon className="absolute -end-2 -top-2 size-5 text-primary/75" strokeWidth={1.6} aria-hidden="true" />}
      </div>
      <h2 className="relative text-lg font-semibold tracking-tight text-foreground">
        {message || t(filtered ? "home.no-results-title" : "home.empty-title")}
      </h2>
      <p className="relative mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {t(filtered ? "home.no-results-description" : "home.empty-description")}
      </p>
    </section>
  );
};

export default MemoListEmptyState;
