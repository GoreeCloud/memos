import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LABEL_PRESET_COLORS } from "@/lib/label-palette";

const source = readFileSync(resolve(process.cwd(), "src/components/MemoContent/Tag.tsx"), "utf8");

const hexToRgb = (hex: string): number[] => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
const mix = (a: number[], b: number[], weight: number): number[] => a.map((channel, index) => channel * weight + b[index] * (1 - weight));
const luminance = (rgb: number[]): number => {
  const linear = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
const ratio = (foreground: number[], background: number[]): number => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

describe("memo label color contrast", () => {
  it("uses theme-aware ink and card backgrounds, never a forced black foreground", () => {
    expect(source).toContain("28%, var(--foreground)");
    expect(source).toContain("15%, var(--card)");
    expect(source).not.toContain("60%, black");
  });

  it("keeps all preset swatches legible against representative light/dark theme surfaces", () => {
    // A regression approximation of rendered sRGB color-mix; live browser checks
    // and native/assistive technology acceptance remain separate.
    const surfaces = [
      { ink: [41, 48, 59], card: [255, 255, 255] },
      { ink: [236, 238, 240], card: [33, 36, 40] },
    ];
    for (const preset of LABEL_PRESET_COLORS) {
      const pastel = hexToRgb(preset.hex);
      for (const { ink, card } of surfaces) {
        const foreground = mix(pastel, ink, 0.28);
        const background = mix(pastel, card, 0.15);
        expect(ratio(foreground, background), preset.label).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
