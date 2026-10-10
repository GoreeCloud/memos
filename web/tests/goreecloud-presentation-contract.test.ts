import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const goreecloudCss = readFileSync(resolve(process.cwd(), "src/themes/goreecloud.css"), "utf8");

describe("GoreeCloud Glaze presentation source contract", () => {
  it("keeps the branded shell and memo surfaces", () => {
    for (const selector of [
      ".goreecloud-shell",
      ".goreecloud-sidebar",
      ".goreecloud-composer",
      ".goreecloud-memo-card",
      ".goreecloud-auth-shell",
      ".goreecloud-auth-card",
    ]) {
      expect(goreecloudCss).toContain(selector);
    }
  });

  it("retains a neutral light and dark canvas with rounded memo cards", () => {
    expect(goreecloudCss).toContain("--background: oklch(0.985 0.004 255)");
    expect(goreecloudCss).toContain("--background: oklch(0.155 0.014 257)");
    expect(goreecloudCss).toContain("--gc-memos-accent-strong: oklch(0.48 0.15 257)");
    expect(goreecloudCss).toContain("--gc-memos-accent-strong: oklch(0.76 0.13 254)");
    expect(goreecloudCss).toMatch(/\.goreecloud-memo-card \{\s*border-radius: 1\.2rem;/);
  });

  it("keeps visible focus and mobile transparency fallbacks", () => {
    expect(goreecloudCss).toContain(":focus-visible");
    expect(goreecloudCss).toContain("outline: 2px solid var(--ring);");
    expect(goreecloudCss).toContain("@media (max-width: 767px)");
    expect(goreecloudCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*?\.goreecloud-composer,[\s\S]*?\.goreecloud-memo-card[\s\S]*?backdrop-filter: none;/,
    );
  });

  it("keeps reduced-motion and reduced-transparency safeguards", () => {
    expect(goreecloudCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(goreecloudCss).toContain("animation-duration: 0.001ms !important;");
    expect(goreecloudCss).toContain("transition-duration: 0.001ms !important;");
    expect(goreecloudCss).toContain("@media (prefers-reduced-transparency: reduce)");
    expect(goreecloudCss).toMatch(/@media \(prefers-reduced-transparency: reduce\)[\s\S]*?backdrop-filter: none;/);
  });

  it("keeps forced-colors semantic fallbacks", () => {
    expect(goreecloudCss).toContain("@media (forced-colors: active)");
    expect(goreecloudCss).toContain("background: Canvas;");
    expect(goreecloudCss).toContain("color: CanvasText;");
    expect(goreecloudCss).toContain("border-color: CanvasText;");
  });
});
