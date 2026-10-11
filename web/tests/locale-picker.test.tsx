import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleSearchList } from "@/components/LocalePicker";

describe("<LocaleSearchList>", () => {
  it("moves from search into a filtered native option and allows selection", () => {
    const onChange = vi.fn();
    render(<LocaleSearchList value="en" onChange={onChange} />);

    const search = screen.getByRole("textbox", { name: "Language" });
    fireEvent.change(search, { target: { value: "Arabic" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });

    const option = screen.getByRole("option");
    expect(option.tagName).toBe("BUTTON");
    expect(option).toHaveFocus();
    expect(option).toHaveAttribute("tabindex", "0");

    // The option is a native button, supporting Enter and Space activation.
    fireEvent.click(option);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("ar");
  });

  it("supports roving Arrow, Home and End focus without changing the selected language", () => {
    const onChange = vi.fn();
    render(<LocaleSearchList value="en" onChange={onChange} />);
    const options = screen.getAllByRole("option");
    const selected = options.find((option) => option.getAttribute("aria-selected") === "true");
    expect(selected).toBeDefined();

    selected?.focus();
    fireEvent.keyDown(selected as HTMLElement, { key: "End" });
    expect(options.at(-1)).toHaveFocus();
    fireEvent.keyDown(options.at(-1) as HTMLElement, { key: "ArrowDown" });
    expect(options[0]).toHaveFocus();
    fireEvent.keyDown(options[0], { key: "ArrowUp" });
    expect(options.at(-1)).toHaveFocus();
    fireEvent.keyDown(options.at(-1) as HTMLElement, { key: "Home" });
    expect(options[0]).toHaveFocus();

    expect(options.filter((option) => option.tabIndex === 0)).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("links to GitHub feedback when no locale matches the search", async () => {
    render(<LocaleSearchList value="en" onChange={() => {}} />);

    fireEvent.change(await screen.findByRole("textbox", { name: "Language" }), { target: { value: "klingon" } });

    const feedbackLink = screen.getByRole("link", { name: "Language not found? Submit feedback" });
    expect(feedbackLink).toHaveAttribute("href", expect.stringContaining("https://github.com/GoreeCloud/memos/issues/new"));
  });
});
