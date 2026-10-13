import { create } from "@bufbuild/protobuf";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MemoLabelsDialog from "@/components/MemoActionMenu/MemoLabelsDialog";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

const mocks = vi.hoisted(() => ({
  getMemo: vi.fn(),
  updateMemo: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/connect", () => ({ memoServiceClient: { getMemo: mocks.getMemo } }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ userTagsSetting: { tags: { Work: {}, Personal: {} } } }),
}));
vi.mock("@/hooks/useUserQueries", () => ({ useTagCounts: () => ({ data: {} }) }));
vi.mock("@/hooks/useMemoQueries", () => ({
  useUpdateMemo: () => ({ mutateAsync: mocks.updateMemo }),
}));
vi.mock("react-hot-toast", () => ({ toast: { error: mocks.error } }));

describe("MemoLabelsDialog", () => {
  const memo = create(MemoSchema, { name: "memos/test", content: "Original content", tags: [] });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMemo.mockResolvedValue(create(MemoSchema, { ...memo }));
    mocks.updateMemo.mockResolvedValue(create(MemoSchema, { ...memo }));
  });

  it("appends only the selected label after reading fresh memo content", async () => {
    const onOpenChange = vi.fn();
    render(<MemoLabelsDialog memo={memo} open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "#Work" }));
    fireEvent.click(screen.getByRole("button", { name: "Add (1)" }));

    await waitFor(() => expect(mocks.updateMemo).toHaveBeenCalledOnce());
    expect(mocks.getMemo).toHaveBeenCalledWith({ name: memo.name });
    expect(mocks.updateMemo).toHaveBeenCalledWith({
      update: { name: memo.name, content: "Original content\\n\\n#Work" },
      updateMask: ["content", "update_time"],
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("refuses to overwrite content changed on another device", async () => {
    mocks.getMemo.mockResolvedValue(create(MemoSchema, { ...memo, content: "Newer remote edit" }));
    render(<MemoLabelsDialog memo={memo} open onOpenChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "#Work" }));
    fireEvent.click(screen.getByRole("button", { name: "Add (1)" }));

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("This memo changed. Reload it before adding labels."));
    expect(mocks.updateMemo).not.toHaveBeenCalled();
  });
});
