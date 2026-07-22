import type { PromptState } from "./types";

export interface AiPromptMetadata {
  model: string;
  optimizedAt: string;
}

export interface PromptSession {
  state: PromptState;
  value: string;
  automaticPrompt: string;
  staleReasons: string[];
  aiMetadata?: AiPromptMetadata;
}

export function createPromptSession(automaticPrompt: string): PromptSession {
  return {
    state: "auto",
    value: automaticPrompt,
    automaticPrompt,
    staleReasons: [],
  };
}

export function editPrompt(
  session: PromptSession,
  value: string,
): PromptSession {
  return {
    state: "manual",
    value,
    automaticPrompt: session.automaticPrompt,
    staleReasons: [],
  };
}

export function markPromptStale(
  session: PromptSession,
  reason: string,
): PromptSession {
  if (session.state === "auto") return session;
  return {
    ...session,
    state: "stale",
    staleReasons: [...new Set([...session.staleReasons, reason])],
  };
}

export function replaceWithAutomaticPrompt(
  _session: PromptSession,
  automaticPrompt: string,
): PromptSession {
  return createPromptSession(automaticPrompt);
}

export function updateAutomaticCandidate(
  session: PromptSession,
  automaticPrompt: string,
): PromptSession {
  if (session.state === "auto") {
    return replaceWithAutomaticPrompt(session, automaticPrompt);
  }
  return { ...session, automaticPrompt };
}

export function applyAiPrompt(
  session: PromptSession,
  value: string,
  aiMetadata: AiPromptMetadata,
): PromptSession {
  return {
    state: "ai-applied",
    value,
    automaticPrompt: session.automaticPrompt,
    staleReasons: [],
    aiMetadata,
  };
}
