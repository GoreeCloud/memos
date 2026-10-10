import { colorToHex } from "@/lib/color";
import { isLiteralLabelName } from "@/lib/label-name";

/** Restrict sidebar swatches to actual label names, never regex metadata rules. */
export const getConfiguredLabelColors = (
  tags?: Record<string, { backgroundColor?: { red?: number; green?: number; blue?: number } }>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tags ?? {}).flatMap(([name, metadata]) => {
      if (!isLiteralLabelName(name)) return [];
      const color = colorToHex(metadata.backgroundColor);
      return color ? [[name, color]] : [];
    }),
  );
