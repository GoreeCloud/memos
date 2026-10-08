import { describe, expect, it } from "vitest";
import goreecloudCss from "@/themes/goreecloud.css?raw";

describe("GoreeCloud Glaze presentation source contract", () => {
  it("keeps the branded shell and memo surfaces", () => {
    for (const selector of [".goreecloud-shell", ".goreecloud-sidebar", ".goreecloud-composer", ".goreecloud-memo-card"]) {
      expect(goreecloudCss).toContain(selector);
    }
  });

  it("keeps visible focus and mobile transparency fallbacks", () => {
    expect(goreecloudCss).toContain(":focus-visible");
    expect(goreecloudCss).toContain("outline: 2px solid var(--ring);");
    expect(goreecloudCss).toContain("@media (max-width: 767px)");
    expect(goreecloudCss).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.goreecloud-composer,[\s\S]*?\.goreecloud-memo-card[\s\S]*?backdrop-filter: none;/);
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
