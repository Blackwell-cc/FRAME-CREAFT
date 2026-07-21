import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "../app/framecraft/CopyButton";

describe("CopyButton", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows copied feedback after a successful clipboard write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CopyButton value="camera prompt" idleLabel="Copy" copiedLabel="Copied" />);

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(writeText).toHaveBeenCalledWith("camera prompt");
    expect(screen.getByRole("button", { name: "Copied" })).toHaveClass("is-copied");
  });

  it("reports failure without showing copied feedback", async () => {
    const onError = vi.fn();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(
      <CopyButton
        value="camera prompt"
        idleLabel="Copy"
        copiedLabel="Copied"
        onError={onError}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(onError).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
  });

  it("keeps a concise visible label with a descriptive accessible name", () => {
    render(
      <CopyButton
        value="camera prompt"
        idleLabel="Copy"
        copiedLabel="Copied"
        ariaLabel="คัดลอก Prompt ของ Low Angle"
      />,
    );

    expect(screen.getByRole("button", { name: "คัดลอก Prompt ของ Low Angle" })).toHaveTextContent("Copy");
  });
});
