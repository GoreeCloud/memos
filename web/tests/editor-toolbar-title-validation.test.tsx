import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { EditorProvider, useEditorContext } from "@/components/MemoEditor/state";
import { EditorToolbar } from "@/components/MemoEditor/Toolbar/EditorToolbar";

vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));
vi.mock("@/components/MemoEditor/Toolbar/InsertMenu", () => ({ default: () => null }));
vi.mock("@/components/MemoEditor/Toolbar/VisibilitySelector", () => ({ default: () => null }));
vi.mock("@/components/MemoEditor/Toolbar/ComposerLabelSelector", () => ({ default: () => null }));

const ToolbarHarness = () => {
  const [title, setTitle] = useState("");
  const { dispatch, actions } = useEditorContext();
  return (
    <>
      <input aria-label="Memo title" value={title} onChange={(event) => setTitle(event.target.value)} />
      <button type="button" onClick={() => dispatch(actions.setRecorderBusy(true))}>
        Start recording
      </button>
      <button type="button" onClick={() => dispatch(actions.setRecorderBusy(false))}>
        Stop recording
      </button>
      <EditorToolbar title={title} onSave={() => {}} onAudioRecorderClick={() => {}} onInsertImages={() => {}} onInsertLabels={() => {}} />
    </>
  );
};

describe("Memo toolbar title-only save eligibility", () => {
  it("enables Save after a title-only edit, disables when cleared, and respects busy state", () => {
    render(
      <EditorProvider>
        <ToolbarHarness />
      </EditorProvider>,
    );
    // Disabled-state tooltip and enabled button use different host elements.
    const getSave = () => screen.getByRole("button", { name: "editor.save" });
    const title = screen.getByRole("textbox", { name: "Memo title" });
    expect(getSave()).toBeDisabled();
    fireEvent.change(title, { target: { value: "Meaningful title" } });
    expect(getSave()).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
    expect(getSave()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    expect(getSave()).toBeEnabled();
    fireEvent.change(title, { target: { value: "" } });
    expect(getSave()).toBeDisabled();
  });
});
