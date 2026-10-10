import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ComposerLabelSelector from "@/components/MemoEditor/Toolbar/ComposerLabelSelector";

const mock = vi.hoisted(() => ({
  content: "Initial draft #work",
  tags: { work: 1, personal: 2 },
  configured: {} as Record<string, { blurContent: boolean }>,
  mutation: vi.fn().mockResolvedValue(undefined),
  refetch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/components/MemoEditor/state", () => ({
  useEditorSelector: (select: (state: { content: string }) => unknown) => select({ content: mock.content }),
}));
vi.mock("@/hooks/useUserQueries", () => ({
  useTagCounts: () => ({ data: mock.tags }),
  useUpdateUserSetting: () => ({ mutateAsync: mock.mutation }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentUser: { name: "users/owner" },
    userTagsSetting: { tags: mock.configured },
    refetchSettings: mock.refetch,
  }),
}));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));

describe("composer labels", () => {
  beforeEach(() => {
    mock.content = "Initial draft #work";
    mock.configured = {};
    mock.mutation.mockClear();
    mock.refetch.mockClear();
  });

  it("offers multi-selection beside visibility and does not re-add existing labels", async () => {
    const onInsert = vi.fn();
    render(<ComposerLabelSelector onInsert={onInsert} />);
    fireEvent.click(screen.getByRole("button", { name: "common.labels" }));
    expect(screen.getByRole("button", { name: "#work" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "#personal" }));
    fireEvent.click(screen.getByRole("button", { name: "common.add (1)" }));
    await waitFor(() => expect(onInsert).toHaveBeenCalledWith(["personal"]));
  });

  it("creates a named label while preserving the memo draft and stages it for assignment", async () => {
    const onInsert = vi.fn();
    render(<ComposerLabelSelector onInsert={onInsert} />);
    fireEvent.click(screen.getByRole("button", { name: "common.labels" }));
    fireEvent.change(screen.getByRole("textbox", { name: "common.create common.labels" }), { target: { value: "project/notes" } });
    fireEvent.click(screen.getByRole("button", { name: "common.create" }));
    await waitFor(() => expect(mock.mutation).toHaveBeenCalledOnce());
    expect(mock.mutation.mock.calls[0][0].setting.value.value.tags).toHaveProperty("project/notes");
    await waitFor(() => expect(mock.refetch).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "common.add (1)" }));
    expect(onInsert).toHaveBeenCalledWith(["project/notes"]);
  });

  it("rejects unsafe regular-expression names and prevents editing during save", () => {
    const onInsert = vi.fn();
    const { rerender } = render(<ComposerLabelSelector onInsert={onInsert} disabled />);
    expect(screen.getByRole("button", { name: "common.labels" })).toBeDisabled();
    rerender(<ComposerLabelSelector onInsert={onInsert} />);
    fireEvent.click(screen.getByRole("button", { name: "common.labels" }));
    fireEvent.change(screen.getByRole("textbox", { name: "common.create common.labels" }), { target: { value: "project/.*" } });
    expect(screen.getByRole("button", { name: "common.create" })).toBeDisabled();
  });
});
