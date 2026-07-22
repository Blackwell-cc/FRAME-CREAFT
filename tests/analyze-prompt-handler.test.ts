import { describe, expect, it, vi } from "vitest";
import {
  callGemini,
  createAnalyzePromptHandler,
  type AnalyzePromptDependencies,
} from "../supabase/functions/analyze-prompt/handler";
import type {
  EdgeAiOptimizeRequest,
  EdgeAiModelResult,
} from "../supabase/functions/analyze-prompt/contracts";

const url = "https://example.supabase.co/functions/v1/analyze-prompt";

const validBody: EdgeAiOptimizeRequest = {
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
    negativePrompt: "",
    warnings: [],
    shots: [],
  },
  platform: "generic-image",
  outputLanguage: "en",
};

const validModelResult: EdgeAiModelResult = {
  optimizedPrompt: "A cinematic close-up of a director reviewing a monitor.",
  improvements: ["Clarified the subject and action."],
  warnings: [],
  shotBreakdown: [],
};

function authorizedRequest(body: unknown = validBody) {
  return new Request(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer owner-token",
      "Content-Type": "application/json",
      Origin: "https://framecraft.example",
    },
    body: JSON.stringify(body),
  });
}

function dependencies(
  overrides: Partial<AnalyzePromptDependencies> = {},
): AnalyzePromptDependencies {
  return {
    verifyOwner: vi.fn().mockResolvedValue(true),
    callGemini: vi.fn().mockResolvedValue(validModelResult),
    model: "gemini-test",
    now: () => "2026-07-22T00:00:00.000Z",
    allowedOrigins: ["https://framecraft.example"],
    timeoutMs: 20_000,
    ...overrides,
  };
}

describe("analyze-prompt edge handler", () => {
  it("rejects missing authorization before calling Gemini", async () => {
    const callGemini = vi.fn();
    const handler = createAnalyzePromptHandler(dependencies({ callGemini }));
    const response = await handler(new Request(url, { method: "POST", body: "{}" }));

    expect(response.status).toBe(401);
    expect(callGemini).not.toHaveBeenCalled();
  });

  it("rejects a non-owner before calling Gemini", async () => {
    const callGemini = vi.fn();
    const handler = createAnalyzePromptHandler(dependencies({
      verifyOwner: vi.fn().mockResolvedValue(false),
      callGemini,
    }));
    const response = await handler(authorizedRequest());

    expect(response.status).toBe(403);
    expect(callGemini).not.toHaveBeenCalled();
  });

  it("rejects a body larger than 32 KB before owner and Gemini calls", async () => {
    const verifyOwner = vi.fn();
    const callGemini = vi.fn();
    const handler = createAnalyzePromptHandler(dependencies({ verifyOwner, callGemini }));
    const response = await handler(authorizedRequest({
      ...validBody,
      input: { ...validBody.input, subject: "x".repeat(33_000) },
    }));

    expect(response.status).toBe(413);
    expect(verifyOwner).not.toHaveBeenCalled();
    expect(callGemini).not.toHaveBeenCalled();
  });

  it("returns validated JSON and never raw invalid model output", async () => {
    const handler = createAnalyzePromptHandler(dependencies());
    const response = await handler(authorizedRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ...validModelResult,
      model: "gemini-test",
      optimizedAt: "2026-07-22T00:00:00.000Z",
    });

    const invalid = createAnalyzePromptHandler(dependencies({
      callGemini: vi.fn().mockResolvedValue({
        ...validModelResult,
        optimizedPrompt: "x".repeat(8_001),
      }),
    }));
    const invalidResponse = await invalid(authorizedRequest());
    expect(invalidResponse.status).toBe(502);
    expect(await invalidResponse.json()).toEqual({ code: "invalid-response" });
  });

  it.each([
    ["rate-limit", 429],
    ["unavailable", 503],
  ] as const)("maps Gemini %s safely", async (code, status) => {
    const handler = createAnalyzePromptHandler(dependencies({
      callGemini: vi.fn().mockRejectedValue({ code }),
    }));
    const response = await handler(authorizedRequest());

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ code });
  });

  it("aborts and returns timeout without exposing request data", async () => {
    const handler = createAnalyzePromptHandler(dependencies({
      timeoutMs: 5,
      callGemini: vi.fn((_request, signal) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })),
    }));
    const response = await handler(authorizedRequest());

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ code: "timeout" });
  });

  it("rejects untrusted origins", async () => {
    const handler = createAnalyzePromptHandler(dependencies());
    const request = authorizedRequest();
    request.headers.set("Origin", "https://attacker.example");
    const response = await handler(request);

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("calls Gemini with a secret header and validates its JSON response", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(validModelResult) }] } }],
    }), { status: 200 }));
    const result = await callGemini(
      validBody,
      { apiKey: "private-key", model: "gemini-test" },
      fetcher,
      new AbortController().signal,
    );

    expect(result).toEqual(validModelResult);
    expect(fetcher).toHaveBeenCalledOnce();
    const [endpoint, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toContain("gemini-test:generateContent");
    expect(init.headers).toMatchObject({ "x-goog-api-key": "private-key" });
    expect(init.body).not.toContain("private-key");
  });
});
