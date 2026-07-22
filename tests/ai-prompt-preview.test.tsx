import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AiPromptPreview } from "../app/framecraft/AiPromptPreview";
import type { AiOptimizeResult } from "../app/framecraft/ai-optimizer";

export const aiResultFixture: AiOptimizeResult = {
  optimizedPrompt: "A refined cinematic close-up of a director reviewing a monitor.",
  improvements: ["Clarified the relationship between subject and action."],
  warnings: ["Keep the shallow depth of field consistent."],
  shotBreakdown: [{ index: 1, summary: "Director at the monitor", transition: "Opening shot" }],
  model: "gemini-test",
  optimizedAt: "2026-07-22T00:00:00.000Z",
};

describe("AI prompt preview", () => {
  it("shows analysis details and applies only after the user chooses it", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<AiPromptPreview result={aiResultFixture} onApply={onApply} onCancel={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "AI Prompt Preview" }))
      .toHaveTextContent(aiResultFixture.optimizedPrompt);
    expect(screen.getByText(aiResultFixture.improvements[0])).toBeInTheDocument();
    expect(screen.getByText(aiResultFixture.warnings[0])).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ใช้ผลลัพธ์นี้" }));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it("cancels on Escape", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AiPromptPreview result={aiResultFixture} onApply={vi.fn()} onCancel={onCancel} />);

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
