import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DevelopmentUpdateNotice from "@/components/DevelopmentUpdateNotice";

describe("Development update notice", () => {
  it("is absent unless the Development build flag is explicitly enabled", () => {
    render(<DevelopmentUpdateNotice enabled={false} revision={"a".repeat(40)} />);
    expect(screen.queryByRole("complementary", { name: "GoreeCloud Memos Development preview" })).not.toBeInTheDocument();
  });

  it("shows the verified Forge stage without implying release qualification", () => {
    render(<DevelopmentUpdateNotice enabled revision={"a".repeat(40)} />);
    const notice = screen.getByRole("complementary", { name: "GoreeCloud Memos Development preview" });
    expect(notice).toHaveAttribute("data-development-update");
    fireEvent.click(screen.getByRole("button", { name: "Show Development updates" }));
    expect(screen.getByText("Development feature preview")).toBeVisible();
    expect(screen.getByRole("status", { name: "Release stage: Forge" })).toBeVisible();
    expect(screen.getByText("Forge stage · Not qualified for Seal or Anchor")).toBeVisible();
    expect(screen.getByText(/Open Quick Find with Ctrl\+K/)).toBeVisible();
    expect(screen.getByText("Build aaaaaaaa · Development only")).toBeVisible();
  });

  it("collapses without blocking access to the update notice", () => {
    render(<DevelopmentUpdateNotice enabled revision={"b".repeat(40)} />);
    fireEvent.click(screen.getByRole("button", { name: "Show Development updates" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse Development updates" }));
    expect(screen.getByText("Development preview")).toBeVisible();
    expect(screen.getByRole("status", { name: "Release stage: Forge" })).toBeVisible();
    expect(screen.getByText("Development feature preview")).not.toBeVisible();
    const expand = screen.getByRole("button", { name: "Show Development updates" });
    expect(expand).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(expand);
    expect(screen.getByText("Development feature preview")).toBeVisible();
    expect(screen.getByRole("button", { name: "Collapse Development updates" })).toHaveAttribute("aria-expanded", "true");
  });
});
