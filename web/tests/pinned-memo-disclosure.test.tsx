import { DirectionProvider } from "@base-ui/react/direction-provider";
import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import PinnedMemoSection from "@/components/PagedMemoList/PinnedMemoSection";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) => key,
}));

const memos = [{ name: "memos/1" }, { name: "memos/2" }] as Memo[];

const StatefulDraft = ({ memo }: { memo: Memo }) => {
  const [draft, setDraft] = useState("");
  return (
    <label>
      Draft for {memo.name}
      <input aria-label={`draft-${memo.name}`} value={draft} onChange={(event) => setDraft(event.target.value)} />
    </label>
  );
};

const renderMemo = (memo: Memo): ReactElement => <StatefulDraft memo={memo} />;

const mount = (useGrid: boolean, direction: "ltr" | "rtl" = "ltr") =>
  render(
    <DirectionProvider direction={direction}>
      <PinnedMemoSection memos={memos} renderer={renderMemo} compact={false} useGrid={useGrid} maxColumns={3} />
    </DirectionProvider>,
  );

describe("Pinned memo disclosure", () => {
  for (const useGrid of [false, true]) {
    it(`keeps memo drafts and DOM identity on collapse/reopen in ${useGrid ? "grid" : "list"} mode`, () => {
      mount(useGrid);
      const toggle = screen.getByRole("button", { name: "home.pinned-memos" });
      const panelId = toggle.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      const panel = document.getElementById(panelId as string);
      expect(panel).not.toBeNull();
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(panel).not.toHaveClass("hidden");

      const input = screen.getByRole("textbox", { name: "draft-memos/1" }) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "keep an unsaved note" } });
      expect(input).toHaveValue("keep an unsaved note");

      toggle.focus();
      expect(toggle).toHaveFocus();
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(panel).toHaveClass("hidden");
      expect(screen.getByRole("textbox", { name: "draft-memos/1", hidden: true })).toBe(input);

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(panel).not.toHaveClass("hidden");
      expect(screen.getByRole("textbox", { name: "draft-memos/1" })).toBe(input);
      expect(input).toHaveValue("keep an unsaved note");
      expect(screen.getAllByRole("textbox")).toHaveLength(2);
    });
  }

  it("provides the same disclosure semantics in RTL", () => {
    mount(true, "rtl");
    const toggle = screen.getByRole("button", { name: "home.pinned-memos" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("renders no disclosure or empty landmark when there are no pinned memos", () => {
    const { container } = render(
      <PinnedMemoSection memos={[]} renderer={renderMemo} compact={false} useGrid={false} maxColumns={1} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "home.pinned-memos" })).not.toBeInTheDocument();
  });
});
