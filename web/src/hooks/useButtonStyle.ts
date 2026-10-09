import { useEffect } from "react";
import {
  applyGoreeCloudButtonStyle,
  DEFAULT_GOREECLOUD_BUTTON_STYLE,
  GOREECLOUD_BUTTON_STYLE_STORAGE_KEY,
  type GoreeCloudButtonStyle,
  isGoreeCloudButtonStyle,
} from "@/lib/button-style";
import { useLocalStorage } from "./useLocalStorage";

export const useButtonStyle = () => {
  const [storedStyle, setStoredStyle] = useLocalStorage<GoreeCloudButtonStyle>(
    GOREECLOUD_BUTTON_STYLE_STORAGE_KEY,
    DEFAULT_GOREECLOUD_BUTTON_STYLE,
  );
  const buttonStyle = isGoreeCloudButtonStyle(storedStyle) ? storedStyle : DEFAULT_GOREECLOUD_BUTTON_STYLE;

  useEffect(() => {
    applyGoreeCloudButtonStyle(buttonStyle);
  }, [buttonStyle]);

  const setButtonStyle = (nextStyle: GoreeCloudButtonStyle) => {
    const normalized = isGoreeCloudButtonStyle(nextStyle) ? nextStyle : DEFAULT_GOREECLOUD_BUTTON_STYLE;
    applyGoreeCloudButtonStyle(normalized);
    setStoredStyle(normalized);
  };

  return { buttonStyle, setButtonStyle };
};

export default useButtonStyle;
