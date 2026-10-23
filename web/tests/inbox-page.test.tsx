import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Inboxes from "@/pages/Inboxes";
import { UserNotification_Status, UserNotification_Type } from "@/types/proto/api/v1/user_service_pb";

const mocks = vi.hoisted(() => ({
  filter: "all" as "all" | "unread" | "archived",
  setFilter: vi.fn(),
  refetch: vi.fn(),
  notifications: [] as Array<{ name: string; type: number; status: number }>,
  isPending: false,
  isError: false,
  isFetching: false,
}));

vi.mock("@/contexts/AppSidebarContext", () => ({
  useAppSidebar: () => ({ inboxFilter: mocks.filter, setInboxFilter: mocks.setFilter }),
}));
vi.mock("@/hooks/useUserQueries", () => ({
  useNotifications: () => ({
    data: mocks.notifications,
    isPending: mocks.isPending,
    isError: mocks.isError,
    isFetching: mocks.isFetching,
    refetch: mocks.refetch,
  }),
}));
vi.mock("@/utils/i18n", async (original) => ({
  ...(await original<typeof import("@/utils/i18n")>()),
  useTranslate: () => (key: string) => key,
}));
vi.mock("@/components/Inbox/MemoCommentMessage", () => ({
  default: ({ notification }: { notification: { name: string } }) => <div data-testid="comment">{notification.name}</div>,
}));
vi.mock("@/components/Inbox/MemoMentionMessage", () => ({
  default: ({ notification }: { notification: { name: string } }) => <div data-testid="mention">{notification.name}</div>,
}));
vi.mock("@/components/Inbox/SpaceInvitationMessage", () => ({
  default: ({ notification }: { notification: { name: string } }) => <div data-testid="invitation">{notification.name}</div>,
}));

describe("Revamped inbox page", () => {
  beforeEach(() => {
    mocks.filter = "all";
    mocks.setFilter.mockReset();
    mocks.refetch.mockReset();
    mocks.notifications = [];
    mocks.isPending = false;
    mocks.isError = false;
    mocks.isFetching = false;
  });

  it("shows a meaningful all-empty state, counts and accessible filter controls", () => {
    render(<Inboxes />);
    expect(screen.getByRole("heading", { name: "common.inbox" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "inbox.empty-all" })).toBeInTheDocument();
    expect(screen.getByText("inbox.empty-description")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "inbox.filter-label" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /common.all/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /inbox.unread/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /common.archived/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "inbox.refresh" })).toBeEnabled();
  });

  it("supports unread and archived views without modifying notifications", () => {
    mocks.notifications = [
      { name: "notifications/comment", type: UserNotification_Type.MEMO_COMMENT, status: UserNotification_Status.UNREAD },
      { name: "notifications/mention", type: UserNotification_Type.MEMO_MENTION, status: UserNotification_Status.ARCHIVED },
      { name: "notifications/invite", type: UserNotification_Type.SPACE_INVITATION, status: UserNotification_Status.UNREAD },
    ];
    const { rerender } = render(<Inboxes />);
    expect(screen.getByTestId("comment")).toBeInTheDocument();
    expect(screen.getByTestId("mention")).toBeInTheDocument();
    expect(screen.getByTestId("invitation")).toBeInTheDocument();
    expect(screen.getByText("3", { selector: '[data-inbox-count="all"]' })).toBeInTheDocument();
    expect(screen.getByText("2", { selector: '[data-inbox-count="unread"]' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /inbox.unread/ }));
    expect(mocks.setFilter).toHaveBeenCalledWith("unread");
    mocks.filter = "unread";
    rerender(<Inboxes />);
    expect(screen.getByTestId("comment")).toBeInTheDocument();
    expect(screen.queryByTestId("mention")).not.toBeInTheDocument();
    mocks.filter = "archived";
    rerender(<Inboxes />);
    expect(screen.getByTestId("mention")).toBeInTheDocument();
    expect(screen.queryByTestId("comment")).not.toBeInTheDocument();
  });

  it("reverses a zero-result filter without losing access to all notifications", () => {
    mocks.filter = "unread";
    render(<Inboxes />);
    expect(screen.getByRole("heading", { name: "inbox.no-unread" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "inbox.view-all" }));
    expect(mocks.setFilter).toHaveBeenCalledWith("all");
  });

  it("shows retry on an error and disables repeat refresh while fetching", () => {
    mocks.isError = true;
    const { rerender } = render(<Inboxes />);
    expect(screen.getByRole("alert")).toHaveTextContent("inbox.load-error");
    fireEvent.click(screen.getByRole("button", { name: "inbox.try-again" }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    mocks.isError = false;
    mocks.isFetching = true;
    rerender(<Inboxes />);
    expect(screen.getByRole("button", { name: "inbox.refresh" })).toBeDisabled();
  });

  it("keeps the loading state distinct from a genuinely empty inbox", () => {
    mocks.isPending = true;
    render(<Inboxes />);
    expect(screen.getByRole("status", { name: "inbox.loading" })).toBeInTheDocument();
    expect(screen.queryByText("inbox.empty-all")).not.toBeInTheDocument();
  });
});
