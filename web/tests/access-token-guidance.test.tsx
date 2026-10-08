import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccessTokenSection from "@/components/Settings/AccessTokenSection";
import { MEMOS_ACCESS_TOKEN_SECURITY_URL } from "@/lib/constants";

const listPersonalAccessTokens = vi.hoisted(() => vi.fn());

vi.mock("@/connect", () => ({
  userServiceClient: {
    listPersonalAccessTokens,
    deletePersonalAccessToken: vi.fn(),
  },
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  default: () => ({ name: "users/alice" }),
}));

vi.mock("@/hooks/useDialog", () => ({
  useDialog: () => ({
    isOpen: false,
    open: vi.fn(),
    setOpen: vi.fn(),
  }),
}));

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) => key,
}));

vi.mock("@/components/CreateAccessTokenDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/ConfirmDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/RelativeTime", () => ({
  default: () => <span>relative-time</span>,
}));

describe("AccessTokenSection GoreeCloud guidance", () => {
  beforeEach(() => {
    listPersonalAccessTokens.mockReset();
    listPersonalAccessTokens.mockResolvedValue({
      personalAccessTokens: [
        {
          name: "users/alice/personalAccessTokens/example",
          description: "CLI token",
        },
      ],
    });
  });

  it("links PAT security guidance to the GoreeCloud-controlled repository", async () => {
    render(<AccessTokenSection />);

    await waitFor(() => expect(screen.getByText("CLI token")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "setting.access-token.how-to-use" }));

    const learnMore = screen.getByRole("link", { name: /common.learn-more/ });
    expect(learnMore).toHaveAttribute("href", MEMOS_ACCESS_TOKEN_SECURITY_URL);
    expect(learnMore).not.toHaveAttribute("href", expect.stringContaining("usememos.com"));
  });
});
