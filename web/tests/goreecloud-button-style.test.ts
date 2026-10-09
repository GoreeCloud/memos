import { describe, expect, it } from "vitest";
import {
  applyGoreeCloudButtonStyle,
  DEFAULT_GOREECLOUD_BUTTON_STYLE,
  GOREECLOUD_BUTTON_STYLES,
  isGoreeCloudButtonStyle,
} from "@/lib/button-style";

describe("GoreeCloud Button Style", () => {
  it("keeps Icons & Glyphs as the default", () => {
    expect(DEFAULT_GOREECLOUD_BUTTON_STYLE).toBe("icons");
    expect(GOREECLOUD_BUTTON_STYLES).toEqual(["icons", "icons-text", "text"]);
  });

  it("rejects unknown persisted values", () => {
    expect(isGoreeCloudButtonStyle("icons")).toBe(true);
    expect(isGoreeCloudButtonStyle("icons-text")).toBe(true);
    expect(isGoreeCloudButtonStyle("text")).toBe(true);
    expect(isGoreeCloudButtonStyle("compact")).toBe(false);
    expect(isGoreeCloudButtonStyle(null)).toBe(false);
  });

  it("applies the presentation mode to the document root", () => {
    applyGoreeCloudButtonStyle("text");
    expect(document.documentElement.dataset.goreecloudButtonStyle).toBe("text");

    applyGoreeCloudButtonStyle("icons");
    expect(document.documentElement.dataset.goreecloudButtonStyle).toBe("icons");
  });
});
