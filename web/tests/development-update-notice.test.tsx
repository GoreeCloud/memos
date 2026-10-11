import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DevelopmentUpdateNotice from "@/components/DevelopmentUpdateNotice";

describe("Development update notice", () => {
  it("is absent unless the Development build flag is explicitly enabled", () => {
    render(<DevelopmentUpdateNotice enabled={false} revision={"a".repeat(40)} />);
    expect(screen.queryByRole("complementary", { name: "GoreeCloud Memos Development preview" })).not.toBeInTheDocument();
  });

  it("identifies a Development build and explains real search features", () => {
    render(<DevelopmentUpdateNotice enabled revision={"a".repeat(40)} />);
    const notice = screen.getByRole("complementary", { name: "GoreeCloud Memos Development preview" });
    expect(notice).toHaveAttribute("data-development-update");
    expect(screen.getByText("Search improvements are live")).toBeVisible();
    expect(screen.getByText(/Open Quick Find with Ctrl\+K/)).toBeVisible();
    expect(screen.getByText("Build aaaaaaaa · Development only")).toBeVisible();
  });

  it("collapses without blocking access to the update notice", () => {
    render(<DevelopmentUpdateNotice enabled revision={"b".repeat(40)} />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse Development updates" }));
    expect(screen.getByText("Development preview")).toBeVisible();
    expect(screen.getByText("Search improvements are live")).not.toBeVisible();
    const expand = screen.getByRole("button", { name: "Show Development updates" });
    expect(expand).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(expand);
    expect(screen.getByText("Search improvements are live")).toBeVisible();
    expect(screen.getByRole("button", { name: "Collapse Development updates" })).toHaveAttribute("aria-expanded", "true");
  });
});
