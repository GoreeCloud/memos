import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mapViewSource = readFileSync(resolve(process.cwd(), "src/components/MapView/MapView.tsx"), "utf8");
const memoPanelSource = readFileSync(resolve(process.cwd(), "src/components/MemoPanel/MemoPanel.tsx"), "utf8");

describe("GoreeCloud Button Style native-control coverage", () => {
  it("covers labeled map zoom and fit icon controls", () => {
    for (const key of ["map.zoom-in", "map.zoom-out", "map.fit-all"]) {
      const label = 'data-goreecloud-label={t("' + key + '")}';
      expect(mapViewSource).toContain(label);
    }
    expect(mapViewSource.match(/data-goreecloud-icon-button=""/g)).toHaveLength(3);
  });

  it("covers the labeled memo-panel close icon control", () => {
    expect(memoPanelSource).toContain('aria-label={t("common.close")}');
    expect(memoPanelSource).toContain('data-goreecloud-icon-button=""');
    expect(memoPanelSource).toContain('data-goreecloud-label={t("common.close")}');
  });
});
