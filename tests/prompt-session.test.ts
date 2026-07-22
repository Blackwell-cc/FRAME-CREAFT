import { describe, expect, it } from "vitest";
import {
  applyAiPrompt,
  createPromptSession,
  editPrompt,
  markPromptStale,
  replaceWithAutomaticPrompt,
  updateAutomaticCandidate,
} from "../app/framecraft/prompt-session";

describe("prompt session", () => {
  it("treats an empty edited value as a manual draft", () => {
    const session = editPrompt(createPromptSession("Auto prompt"), "");

    expect(session).toMatchObject({
      state: "manual",
      value: "",
      automaticPrompt: "Auto prompt",
      staleReasons: [],
    });
  });

  it("keeps a manual value and records unique stale reasons", () => {
    const manual = editPrompt(createPromptSession("Auto prompt"), "My draft");
    const stale = markPromptStale(
      markPromptStale(manual, "subject"),
      "subject",
    );

    expect(stale).toMatchObject({
      state: "stale",
      value: "My draft",
      staleReasons: ["subject"],
    });
  });

  it("updates automatic output without overwriting a manual candidate", () => {
    const automatic = updateAutomaticCandidate(
      createPromptSession("Old auto"),
      "New auto",
    );
    const manual = updateAutomaticCandidate(
      editPrompt(createPromptSession("Old auto"), "My draft"),
      "New auto",
    );

    expect(automatic).toMatchObject({
      state: "auto",
      value: "New auto",
      automaticPrompt: "New auto",
    });
    expect(manual).toMatchObject({
      state: "manual",
      value: "My draft",
      automaticPrompt: "New auto",
    });
  });

  it("restores the latest automatic output", () => {
    const manual = updateAutomaticCandidate(
      editPrompt(createPromptSession("Old auto"), "My draft"),
      "Latest auto",
    );

    expect(replaceWithAutomaticPrompt(manual, manual.automaticPrompt)).toEqual({
      state: "auto",
      value: "Latest auto",
      automaticPrompt: "Latest auto",
      staleReasons: [],
    });
  });

  it("stores applied AI output and metadata without changing the auto fallback", () => {
    const result = applyAiPrompt(createPromptSession("Auto prompt"), "AI prompt", {
      model: "gemini-test",
      optimizedAt: "2026-07-22T00:00:00.000Z",
    });

    expect(result).toMatchObject({
      state: "ai-applied",
      value: "AI prompt",
      automaticPrompt: "Auto prompt",
      aiMetadata: {
        model: "gemini-test",
        optimizedAt: "2026-07-22T00:00:00.000Z",
      },
    });
  });
});
