import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PinnedMemoSection from "@/components/PagedMemoList/PinnedMemoSection";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) => (key === "home.pinned-memos" ? "Pinned memos" : key),
}));

const memos = [{ name: "memos/one" }, { name: "memos/two" }] as Memo[];
const renderMemo = (memo: Memo) => <article>{memo.name}</article>;

describe("collapsible pinned memo section", () => {
  it("exposes a keyboard-activatable heading with the correct disclosure state", () => {
    render(<PinnedMemoSection memos={memos} renderer={renderMemo} compact={false} useGrid={false} />);

    const button = screen.getByRole("button", { name: "Pinned memos" });
    const content = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(content).not.toBeNull();
    expect(content).not.toHaveClass("hidden");
    expect(content).toHaveClass("flex", "flex-col");

    const firstMemo = screen.getByText("memos/one");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveClass("hidden");
    expect(screen.getByText("memos/one")).toBe(firstMemo);
    expect(screen.getByText("memos/two")).toBeInTheDocument();

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(content).not.toHaveClass("hidden");
    expect(screen.getByText("memos/one")).toBe(firstMemo);
  });

  it("preserves the disclosure state and card DOM when the feed switches layout", () => {
    const { rerender } = render(<PinnedMemoSection memos={memos} renderer={renderMemo} compact={false} useGrid={true} />);
    const button = screen.getByRole("button", { name: "Pinned memos" });
    const content = document.getElementById(button.getAttribute("aria-controls") ?? "");
    expect(content).toHaveClass("grid");

    fireEvent.click(button);
    const firstMemo = screen.getByText("memos/one");
    rerender(<PinnedMemoSection memos={memos} renderer={renderMemo} compact={true} useGrid={false} />);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveClass("hidden");
    expect(screen.getByText("memos/one")).toBe(firstMemo);
    fireEvent.click(button);
    expect(content).toHaveClass("flex", "flex-col");
  });

  it("renders no section when there are no loaded pinned memos", () => {
    const { rerender } = render(<PinnedMemoSection memos={[]} renderer={renderMemo} compact={false} useGrid={true} />);
    expect(screen.queryByRole("region", { name: "Pinned memos" })).not.toBeInTheDocument();
    rerender(<PinnedMemoSection memos={memos} renderer={renderMemo} compact={false} useGrid={true} />);
    expect(screen.getByRole("region", { name: "Pinned memos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pinned memos" })).toHaveAttribute("aria-expanded", "true");
  });
});
