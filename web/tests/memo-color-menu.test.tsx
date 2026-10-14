import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MemoColorMenu from "@/components/MemoActionMenu/MemoColorMenu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const mocks = vi.hoisted(() => ({
  user: { name: "users/test" } as { name: string } | undefined,
  colors: {} as Record<string, string>,
  save: vi.fn(),
  refetchSettings: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentUser: mocks.user,
    userGeneralSetting: { memoColors: mocks.colors },
    refetchSettings: mocks.refetchSettings,
  }),
}));
vi.mock("@/hooks/useUserQueries", () => ({
  useUpdateUserGeneralSetting: () => ({ mutateAsync: mocks.save }),
}));
vi.mock("react-hot-toast", () => ({
  toast: { error: mocks.error },
}));

const openPalette = async () => {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Options</DropdownMenuTrigger>
      <DropdownMenuContent>
        <MemoColorMenu memoName="memos/target" />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Options" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Memo color" }));
};

describe("MemoColorMenu persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { name: "users/test" };
    mocks.colors = { "memos/other": "#EEE5FF" };
    mocks.save.mockResolvedValue(undefined);
    mocks.refetchSettings.mockResolvedValue(undefined);
  });

  it("saves a selected color while preserving other memo colors", async () => {
    await openPalette();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Sky" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save).toHaveBeenCalledWith({
      generalSetting: {
        memoColors: { "memos/other": "#EEE5FF", "memos/target": "#DCEEFE" },
      },
      updateMask: ["memo_colors"],
    });
    await waitFor(() => expect(mocks.refetchSettings).toHaveBeenCalledOnce());
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("restores Default without deleting other card colors", async () => {
    mocks.colors = { "memos/other": "#EEE5FF", "memos/target": "#DCEEFE" };
    await openPalette();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Default" }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save).toHaveBeenCalledWith({
      generalSetting: { memoColors: { "memos/other": "#EEE5FF" } },
      updateMask: ["memo_colors"],
    });
  });

  it("surfaces a failed save without refreshing settings", async () => {
    mocks.save.mockRejectedValue(new Error("connection lost"));
    await openPalette();
    fireEvent.click(await screen.findByRole("menuitem", { name: "Mint" }));

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Could not save memo color. Please try again."));
    expect(mocks.refetchSettings).not.toHaveBeenCalled();
  });

  it("disables color changes without a signed-in user", async () => {
    mocks.user = undefined;
    await openPalette();
    expect(screen.getByRole("menuitem", { name: "Memo color" })).toHaveAttribute("aria-disabled", "true");
    expect(mocks.save).not.toHaveBeenCalled();
  });
});