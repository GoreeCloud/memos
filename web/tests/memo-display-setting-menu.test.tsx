import { DirectionProvider } from "@base-ui/react/direction-provider";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SIDEBAR_SECTION_ACTION_ICON_CLASSES } from "@/components/AppSidebar/SidebarSection";
import MemoDisplaySettingMenu from "@/components/MemoDisplaySettingMenu";
import { ViewProvider } from "@/contexts/ViewContext";

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string, params?: Record<string, number>) => {
    const labels: Record<string, string> = {
      "common.created-at": "Created",
      "common.restore": "Restore",
      "common.last-updated-at": "Last updated",
      "memo.compact-mode": "Compact mode",
      "memo.direction": "Direction",
      "memo.grid-compact-hint": "Grid layouts always use compact cards.",
      "memo.layout": "Layout",
      "memo.layout-auto": "Auto",
      "memo.layout-auto-description": "As many columns as fit",
      "memo.layout-columns-description": `Up to ${params?.n ?? ""} columns`,
      "memo.layout-list": "List",
      "memo.layout-list-description": "A single column",
      "memo.link-preview": "Link preview",
      "memo.newest-first": "Newest first",
      "memo.oldest-first": "Oldest first",
      "memo.order": "Order",
      "memo.order-by": "Order by",
      "memo.view-options": "View options",
    };
    if (key === "memo.layout-columns") return `${params?.n ?? ""} columns`;
    return labels[key] ?? key;
  },
}));

describe("MemoDisplaySettingMenu", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("opens from an accessible trigger and explains the compact grid constraint", () => {
    render(
      <ViewProvider>
        <MemoDisplaySettingMenu />
      </ViewProvider>,
    );

    const trigger = screen.getByRole("button", { name: "View options" });
    expect(trigger).toHaveClass("size-6", "rounded-md", "text-muted-foreground/70", "hover:bg-muted/60", "hover:text-foreground");
    expect(trigger.querySelector("svg")).toHaveClass(SIDEBAR_SECTION_ACTION_ICON_CLASSES);

    fireEvent.click(trigger);

    expect(screen.queryByRole("switch", { name: "Compact mode" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Link preview" })).toBeChecked();
  });

  it("restores user-selected view settings and disables the action at defaults", () => {
    render(
      <ViewProvider>
        <MemoDisplaySettingMenu />
      </ViewProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "View options" }));
    const reset = screen.getByRole("button", { name: "Restore View options" });
    expect(reset).toBeDisabled();

    fireEvent.click(screen.getByRole("switch", { name: "Link preview" }));
    expect(reset).toBeEnabled();

    fireEvent.click(reset);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Link preview" })).toBeChecked();
    expect(reset).toBeDisabled();

    const saved = JSON.parse(localStorage.getItem("memos-view-setting") ?? "{}");
    expect(saved).toMatchObject({
      orderByTimeAsc: false,
      compactMode: false,
      linkPreview: true,
      maxColumns: 0,
    });
  });

  it("exposes no fixed-column or list options in LTR", () => {
    render(
      <ViewProvider>
        <MemoDisplaySettingMenu />
      </ViewProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "View options" }));
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("exposes no fixed-column or list options in RTL", () => {
    render(
      <DirectionProvider direction="rtl">
        <ViewProvider>
          <MemoDisplaySettingMenu />
        </ViewProvider>
      </DirectionProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "View options" }));
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
