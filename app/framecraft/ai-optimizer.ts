import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  OutputLanguage,
  PlatformPresetId,
  PromptComposition,
  PromptInput,
  Technique,
} from "./types";

export interface AiOptimizeRequest {
  input: PromptInput;
  selected: Array<Pick<
    Technique,
    "id" | "category" | "titleEn" | "titleTh" | "imageKeywords" | "videoKeywords"
  >>;
  composition: PromptComposition;
  platform: PlatformPresetId;
  outputLanguage: OutputLanguage;
}

export interface AiOptimizeResult {
  optimizedPrompt: string;
  improvements: string[];
  warnings: string[];
  shotBreakdown: Array<{
    index: number;
    summary: string;
    transition: string;
  }>;
  model: string;
  optimizedAt: string;
}

export type AiOptimizerErrorCode =
  | "unauthorized"
  | "forbidden"
  | "rate-limit"
  | "timeout"
  | "invalid-response"
  | "unavailable";

export class AiOptimizerError extends Error {
  constructor(public readonly code: AiOptimizerErrorCode) {
    super(code);
    this.name = "AiOptimizerError";
  }
}

const boundedText = z.string().max(500);

export const aiOptimizeResultSchema = z.object({
  optimizedPrompt: z.string().max(8_000),
  improvements: z.array(boundedText).max(20),
  warnings: z.array(boundedText).max(20),
  shotBreakdown: z.array(z.object({
    index: z.number().int().positive(),
    summary: boundedText,
    transition: boundedText,
  })).max(20),
  model: z.string().min(1).max(200),
  optimizedAt: z.string().min(1).max(100),
});

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const direct = "status" in error ? error.status : undefined;
  if (typeof direct === "number") return direct;
  const context = "context" in error ? error.context : undefined;
  if (context && typeof context === "object" && "status" in context
    && typeof context.status === "number") return context.status;
  return undefined;
}

function mapAiOptimizerError(error: unknown): AiOptimizerError {
  const status = errorStatus(error);
  if (status === 401) return new AiOptimizerError("unauthorized");
  if (status === 403) return new AiOptimizerError("forbidden");
  if (status === 429) return new AiOptimizerError("rate-limit");
  if (status === 408 || status === 504) return new AiOptimizerError("timeout");
  return new AiOptimizerError("unavailable");
}

export function createAiOptimizer(client: SupabaseClient) {
  return {
    async analyze(request: AiOptimizeRequest): Promise<AiOptimizeResult> {
      const { data, error } = await client.functions.invoke("analyze-prompt", {
        body: request,
      });
      if (error) throw mapAiOptimizerError(error);
      const result = aiOptimizeResultSchema.safeParse(data);
      if (!result.success) throw new AiOptimizerError("invalid-response");
      return result.data;
    },
  };
}
