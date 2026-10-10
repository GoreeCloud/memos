export const GOREECLOUD_BUTTON_STYLE_STORAGE_KEY = "goreecloud-button-style";

export const GOREECLOUD_BUTTON_STYLES = ["icons", "icons-text", "text"] as const;

export type GoreeCloudButtonStyle = (typeof GOREECLOUD_BUTTON_STYLES)[number];

export const DEFAULT_GOREECLOUD_BUTTON_STYLE: GoreeCloudButtonStyle = "icons";

export const isGoreeCloudButtonStyle = (value: unknown): value is GoreeCloudButtonStyle =>
  typeof value === "string" && (GOREECLOUD_BUTTON_STYLES as readonly string[]).includes(value);

export const applyGoreeCloudButtonStyle = (style: GoreeCloudButtonStyle) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.goreecloudButtonStyle = style;
};
