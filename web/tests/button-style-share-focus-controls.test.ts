import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sharePanelSource = readFileSync(resolve(process.cwd(), "src/components/MemoDetailSidebar/MemoSharePanel.tsx"), "utf8");
const focusModeSource = readFileSync(resolve(process.cwd(), "src/components/MemoEditor/components/FocusModeOverlay.tsx"), "utf8");

describe("GoreeCloud named icon controls", () => {
  it("names memo-share copy and revoke icon buttons so Button Style can adapt them", () => {
    expect(sharePanelSource).toContain('aria-label={t("memo.share.copy")}');
    expect(sharePanelSource).toContain('aria-label={t("memo.share.revoke")}');
    expect(sharePanelSource).toContain('size="icon"');
  });

  it("names the focus-mode exit icon button so Button Style can adapt it", () => {
    expect(focusModeSource).toContain("aria-label={title}");
    expect(focusModeSource).toContain('size="icon"');
  });
});
