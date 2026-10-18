import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/pages/Setting.css", "utf8");

const linear = (channel: number) => {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const values = [1, 3, 5].map((offset) => linear(Number.parseInt(hex.slice(offset, offset + 2), 16)));
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
};

describe("Settings group description contrast", () => {
  it("maintains a readable light-theme muted color at normal-text WCAG AA contrast", () => {
    const rule = styles.match(/\.gc-settings-content \.gc-setting-group-header p\s*\{([^}]*)\}/);
    expect(rule, "the shared Settings group description rule must exist").not.toBeNull();

    const color = rule?.[1].match(/color:\s*(#[a-f\d]{6})\s*;/i)?.[1];
    expect(color, "the shared description color must be explicitly defined").toMatch(/^#[a-f\d]{6}$/i);
    if (!color) throw new Error("Missing light-theme Settings description color");

    const contrastAgainstWhite = 1.05 / (luminance(color) + 0.05);
    expect(contrastAgainstWhite).toBeGreaterThanOrEqual(4.5);
  });
});
