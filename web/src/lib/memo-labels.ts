import { isLiteralLabelName } from "@/lib/label-name";
import { findTagMatches } from "@/utils/tag-grammar";

/** Only append valid, not-yet-present labels to an editable memo draft. */
export const getMissingLabels = (markdown: string, labels: string[]): string[] => {
  const existing = new Set(findTagMatches(markdown).map((tag) => tag.value));
  return [...new Set(labels)].filter((label) => isLiteralLabelName(label) && !existing.has(label));
};
