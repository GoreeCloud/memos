import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserProfile from "@/pages/UserProfile";

const fixtures = vi.hoisted(() => ({
  currentUser: { name: "users/owner", username: "SyntheticOwner" } as { name: string; username: string } | undefined,
  profile: {
    name: "users/owner",
    username: "SyntheticOwner",
    displayName: "Synthetic Owner",
    description: "Synthetic biography for testing",
  } as { name: string; username: string; displayName: string; description: string } | undefined,
}));
vi.mock("@/hooks/useCurrentUser", () => ({ default: () => fixtures.currentUser }));
vi.mock("@/hooks/useUserQueries", () => ({ useUser: () => ({ data: fixtures.profile, isLoading: false }) }));
vi.mock("@/hooks/useDelayedFlag", () => ({ useDelayedFlag: () => true }));
vi.mock("@/hooks", () => ({
  useMemoFilters: () => "creator == 'users/owner'",
  useMemoSorting: () => ({ orderBy: "create_time desc", listSort: (items: unknown[]) => items }),
}));
vi.mock("@/components/PagedMemoList", () => ({
  default: () => <div data-testid="profile-memos-feed">Memo cards</div>,
  getMemoKey: () => "memos/fixture",
}));
vi.mock("@/components/MemoView", () => ({ default: () => null }));
vi.mock("@/components/UserAvatar", () => ({ default: () => <div role="img" aria-label="Profile avatar" /> }));
vi.mock("@/components/UpdateAccountDialog", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Edit profile form" /> : null),
}));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));
const show = () =>
  render(
    <MemoryRouter initialEntries={["/u/SyntheticOwner"]}>
      <Routes>
        <Route path="/u/:username" element={<UserProfile />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Profile identity route", () => {
  beforeEach(() => {
    fixtures.currentUser = { name: "users/owner", username: "SyntheticOwner" };
    fixtures.profile = {
      name: "users/owner",
      username: "SyntheticOwner",
      displayName: "Synthetic Owner",
      description: "Synthetic biography for testing",
    };
  });
  it("shows compact profile identity without a memo feed", () => {
    show();
    expect(screen.getByRole("heading", { level: 1, name: "common.profile" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Synthetic Owner" })).toBeVisible();
    expect(screen.getByText("@SyntheticOwner")).toBeVisible();
    expect(screen.getByText("Synthetic biography for testing")).toBeVisible();
    expect(screen.queryByTestId("profile-memos-feed")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "common.memos" })).not.toBeInTheDocument();
  });
  it("allows owner to open edit dialog", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "common.edit" }));
    expect(screen.getByRole("dialog", { name: "Edit profile form" })).toBeVisible();
  });
  it("does not offer profile editing to visitors", () => {
    fixtures.currentUser = { name: "users/visitor", username: "Visitor" };
    show();
    expect(screen.queryByRole("button", { name: "common.edit" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "common.profile" })).toBeVisible();
  });
});
