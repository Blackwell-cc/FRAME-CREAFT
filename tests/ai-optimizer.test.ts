import { describe, expect, it, vi } from "vitest";
import {
  AiOptimizerError,
  createAiOptimizer,
  type AiOptimizeRequest,
  type AiOptimizeResult,
} from "../app/framecraft/ai-optimizer";

const request: AiOptimizeRequest = {
  input: {
    mode: "image",
    platform: "generic-image",
    subject: "a director",
    action: "reviewing a monitor",
    environment: "a clean production studio",
    shotSize: "",
    angle: "",
    lens: "",
    movement: "",
    lighting: "",
    composition: "",
    mood: "",
    aspectRatio: "16:9",
    duration: "",
    pacing: "",
  },
  selected: [],
  composition: {
    prompt: "Close-up of a director.",
    warnings: [],
    shots: [],
    completeness: { subject: true, action: true, environment: true },
  },
  platform: "generic-image",
  outputLanguage: "en",
};

const validResult: AiOptimizeResult = {
  optimizedPrompt: "A cinematic close-up of a director reviewing a monitor.",
  improvements: ["Clarified the subject and action."],
  warnings: [],
  shotBreakdown: [],
  model: "gemini-test",
  optimizedAt: "2026-07-22T00:00:00.000Z",
};

describe("AI optimizer browser service", () => {
  it("invokes only the analyze-prompt function with the structured request", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: validResult, error: null });
    const optimizer = createAiOptimizer({ functions: { invoke } } as never);

    await expect(optimizer.analyze(request)).resolves.toEqual(validResult);
    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith("analyze-prompt", { body: request });
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [429, "rate-limit"],
    [408, "timeout"],
    [504, "timeout"],
    [503, "unavailable"],
  ] as const)("maps status %s to %s", async (status, code) => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { context: { status } },
    });

    await expect(createAiOptimizer({ functions: { invoke } } as never).analyze(request))
      .rejects.toMatchObject({ code });
  });

  it("rejects an invalid response without returning model output", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { ...validResult, optimizedPrompt: "x".repeat(8_001) },
      error: null,
    });

    await expect(createAiOptimizer({ functions: { invoke } } as never).analyze(request))
      .rejects.toEqual(expect.objectContaining<Partial<AiOptimizerError>>({
        code: "invalid-response",
      }));
  });
});
