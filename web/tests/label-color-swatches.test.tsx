import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LabelColorSwatches from "@/components/LabelColorSwatches";
import { LABEL_PRESET_COLORS } from "@/lib/label-palette";

describe("LabelColorSwatches", () => {
  it("provides seven distinct pastel colors alongside the default option", () => {
    expect(new Set(LABEL_PRESET_COLORS.map((option) => option.hex)).size).toBe(7);
    const onChange = vi.fn();
    render(<LabelColorSwatches label="Label color" onChange={onChange} />);
    expect(screen.getByRole("group", { name: "Label color" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lavender" }));
    expect(onChange).toHaveBeenCalledWith("#EEE5FF");
  });
  it("exposes accessible color names, pressed states, and clearing", () => {
    const onChange = vi.fn();
    render(<LabelColorSwatches label="Label color" value="#DCEEFE" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Sky" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Rose" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Default color" }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
