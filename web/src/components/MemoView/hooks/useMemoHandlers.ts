import { useCallback } from "react";
import type { PreviewMediaItem } from "@/utils/media-item";

interface UseMemoHandlersOptions {
  readonly: boolean;
  openEditor: () => void;
  openPreview: (items: string | string[] | PreviewMediaItem[], index?: number) => void;
}

export const useMemoHandlers = (options: UseMemoHandlersOptions) => {
  const { readonly, openEditor, openPreview } = options;

  const handleMemoContentClick = useCallback(
    (e: React.MouseEvent) => {
      const targetEl = e.target as HTMLElement;
      if (targetEl.tagName === "IMG") {
        const linkElement = targetEl.closest("a");
        if (linkElement) return; // If image is inside a link, don't show preview
        const imgUrl = targetEl.getAttribute("src");
        if (imgUrl) openPreview(imgUrl);
        return;
      }
      if (
        !readonly &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey &&
        !window.getSelection()?.toString() &&
        !targetEl.closest("a, button, input, textarea, select, [role='button'], [contenteditable]")
      ) {
        openEditor();
      }
    },
    [readonly, openEditor, openPreview],
  );

  // Double-click now remains available for native text selection.
  const handleMemoContentDoubleClick = useCallback(() => undefined, []);

  return { handleMemoContentClick, handleMemoContentDoubleClick };
};
