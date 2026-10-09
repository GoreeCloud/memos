import { render, screen } from "@testing-library/react";
import { SearchIcon } from "lucide-react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("GoreeCloud shared icon button presentation", () => {
  it("exposes an accessible visual label source for icon buttons", () => {
    render(
      <Button size="icon" variant="ghost" aria-label="Search">
        <SearchIcon />
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Search" });
    expect(button).toHaveAttribute("data-goreecloud-icon-button");
    expect(button).toHaveAttribute("data-goreecloud-label", "Search");
    expect(button).toHaveTextContent("");
  });

  it("does not invent a visual label when no accessible label exists", () => {
    const { container } = render(
      <Button size="icon" variant="ghost">
        <SearchIcon />
      </Button>,
    );

    expect(container.querySelector("[data-goreecloud-icon-button]")).toBeNull();
    expect(container.querySelector("[data-goreecloud-label]")).toBeNull();
  });
});
