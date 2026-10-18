import { create } from "@bufbuild/protobuf";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AISection from "@/components/Settings/AISection";
import { InstanceSetting_AISettingSchema } from "@/types/proto/api/v1/instance_service_pb";

const mocks = vi.hoisted(() => ({
  instance: {
    aiSetting: { providers: [], transcription: undefined } as unknown,
    updateSetting: vi.fn(),
    fetchSetting: vi.fn(),
  },
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/contexts/InstanceContext", () => ({
  useInstance: () => mocks.instance,
}));
vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) => key,
}));
vi.mock("react-hot-toast", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

describe("AI Settings form accessibility and safe empty state", () => {
  beforeEach(() => {
    mocks.instance.aiSetting = create(InstanceSetting_AISettingSchema, { providers: [] });
    mocks.instance.updateSetting.mockReset().mockResolvedValue(undefined);
    mocks.instance.fetchSetting.mockReset().mockResolvedValue(undefined);
    mocks.toastError.mockReset();
    mocks.toastSuccess.mockReset();
  });

  it("associates all four transcription labels with disabled controls when no AI provider exists", () => {
    render(<AISection />);

    expect(screen.getByLabelText("setting.ai.transcription-provider")).toBeDisabled();
    expect(screen.getByLabelText("setting.ai.transcription-model")).toBeDisabled();
    expect(screen.getByLabelText("setting.ai.transcription-language")).toBeDisabled();
    expect(screen.getByLabelText("setting.ai.transcription-prompt")).toBeDisabled();
    expect(screen.getByText("setting.ai.no-providers")).toBeVisible();
  });

  it("associates all provider fields with labels and rejects a provider without an API key", async () => {
    render(<AISection />);
    fireEvent.click(screen.getByRole("button", { name: "setting.ai.add-provider" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("setting.ai.provider-title")).toBeVisible();
    expect(within(dialog).getByLabelText("setting.ai.provider-type")).toBeVisible();
    expect(within(dialog).getByLabelText("setting.ai.endpoint")).toBeVisible();
    const key = within(dialog).getByLabelText("setting.ai.api-key");
    expect(key).toHaveAttribute("type", "password");
    fireEvent.change(within(dialog).getByLabelText("setting.ai.provider-title"), { target: { value: "Synthetic test provider" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "common.save" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("setting.ai.api-key-required"));
    expect(mocks.instance.updateSetting).not.toHaveBeenCalled();
  });
});
