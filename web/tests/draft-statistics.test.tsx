import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorContent } from "@/components/MemoEditor/components/EditorContent";
import { getDraftStatistics } from "@/components/MemoEditor/utils/draftStatistics";

const state = vi.hoisted(() => ({ content: "", dispatch: vi.fn() }));

vi.mock("@/components/MemoEditor/state", () => ({
  useEditorContext: () => ({ actions: { updateContent: vi.fn(), setContent: vi.fn() }, dispatch: state.dispatch }),
  useEditorSelector: (selector: (value: unknown) => unknown) =>
    selector({ content: state.content, contentSource: "user", ui: { isFocusMode: false } }),
}));
vi.mock("@/components/MemoEditor/Editor", () => ({
  default: () => <div data-testid="markdown-editor" />,
}));
vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string, variables?: { count?: number }) =>
    variables?.count === undefined ? key : `${key}: ${variables.count}`,
}));

describe("memo editor draft statistics", () => {
  beforeEach(() => {
    state.content = "";
    state.dispatch.mockClear();
  });

  it("counts words and user-perceived characters in Unicode text", () => {
    expect(getDraftStatistics("One two")).toEqual({ words: 2, characters: 7 });
    expect(getDraftStatistics("👩‍💻")).toEqual({ words: 0, characters: 1 });
    expect(getDraftStatistics("é")).toEqual({ words: 1, characters: 1 });
    expect(getDraftStatistics("你好世界").words).toBeGreaterThan(0);
  });

  it("does not clutter a blank composer", () => {
    state.content = "   ";
    render(<EditorContent onSubmit={vi.fn()} onFiles={vi.fn()} />);
    expect(screen.queryByRole("group", { name: "editor.draft-statistics" })).not.toBeInTheDocument();
  });

  it("shows updated counts as content changes without changing the draft", () => {
    state.content = "Hello";
    const { rerender } = render(<EditorContent onSubmit={vi.fn()} onFiles={vi.fn()} />);
    expect(screen.getByRole("group", { name: "editor.draft-statistics" })).toHaveTextContent("editor.draft-words: 1");
    expect(screen.getByRole("group", { name: "editor.draft-statistics" })).toHaveTextContent("editor.draft-characters: 5");
    state.content = "Hello world";
    rerender(<EditorContent onSubmit={vi.fn()} onFiles={vi.fn()} />);
    expect(screen.getByRole("group", { name: "editor.draft-statistics" })).toHaveTextContent("editor.draft-words: 2");
    expect(screen.getByRole("group", { name: "editor.draft-statistics" })).toHaveTextContent("editor.draft-characters: 11");
    expect(state.dispatch).not.toHaveBeenCalled();
  });
});
