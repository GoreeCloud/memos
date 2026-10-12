import { forwardRef, useMemo } from "react";
import { useTranslate } from "@/utils/i18n";
import Editor from "../Editor";
import { useEditorContext, useEditorSelector } from "../state";
import type { EditorContentProps } from "../types";
import type { EditorController } from "../types/editorController";
import { getDraftStatistics } from "../utils/draftStatistics";

// Imported eagerly (not React.lazy): the editor is the always-present compose
// box on the home route, which is already code-split — so deferring the
// CodeMirror bundle separately bought nothing and made the editor paint empty
// for a beat before its placeholder appeared (a visible flicker on load).

/**
 * Hosts the CodeMirror Editor behind the EditorController contract. The
 * editor serializes into state.content on every change and exposes its
 * formatting capability for the focus-mode toolbar.
 */
export const EditorContent = forwardRef<EditorController, EditorContentProps>(({ placeholder, onSubmit, onFiles }, ref) => {
  const { actions, dispatch } = useEditorContext();
  const t = useTranslate();
  const content = useEditorSelector((s) => s.content);
  const contentSource = useEditorSelector((s) => s.contentSource);
  const isFocusMode = useEditorSelector((s) => s.ui.isFocusMode);
  const statistics = useMemo(() => getDraftStatistics(content), [content]);

  const handleContentChange = (content: string) => {
    dispatch(actions.updateContent(content));
  };

  const handleExternalContentApplied = (content: string) => {
    dispatch(actions.setContent(content));
  };

  return (
    <div className="w-full flex flex-col flex-1">
      <Editor
        ref={ref}
        className="memo-editor-content"
        initialContent={content}
        contentIsExternal={contentSource === "external"}
        placeholder={placeholder || ""}
        isFocusMode={isFocusMode}
        onContentChange={handleContentChange}
        onExternalContentApplied={handleExternalContentApplied}
        onFiles={onFiles}
        onSubmit={onSubmit}
      />
      {content.trim() && (
        <div
          role="group"
          aria-label={t("editor.draft-statistics")}
          className="flex items-center justify-end gap-2 px-1 pt-1 text-xs tabular-nums text-muted-foreground"
        >
          <span>{t("editor.draft-words", { count: statistics.words })}</span>
          <span aria-hidden="true">·</span>
          <span>{t("editor.draft-characters", { count: statistics.characters })}</span>
        </div>
      )}
    </div>
  );
});

EditorContent.displayName = "EditorContent";
