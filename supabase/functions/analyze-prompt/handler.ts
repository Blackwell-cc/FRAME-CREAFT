import {
  edgeAiModelResultSchema,
  edgeAiOptimizeRequestSchema,
  edgeAiOptimizeResultSchema,
  type EdgeAiModelResult,
  type EdgeAiOptimizeRequest,
} from "./contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_REQUEST_BYTES = 32_768;

export interface AnalyzePromptDependencies {
  verifyOwner: (authorization: string) => Promise<boolean>;
  callGemini: (
    request: EdgeAiOptimizeRequest,
    signal: AbortSignal,
  ) => Promise<EdgeAiModelResult>;
  model: string;
  now: () => string;
  allowedOrigins: string[];
  allowLocalhost?: boolean;
  timeoutMs?: number;
}

export interface GeminiEnvironment {
  apiKey: string;
  model: string;
}

type Fetcher = typeof fetch;

function corsHeaders(origin: string | null, allowedOrigins: string[]) {
  const trusted = origin && allowedOrigins.includes(origin) ? origin : null;
  return {
    ...(trusted ? { "Access-Control-Allow-Origin": trusted } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function isLocalOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string | null, deps: AnalyzePromptDependencies) {
  if (!origin) return true;
  return deps.allowedOrigins.includes(origin)
    || Boolean(deps.allowLocalhost && isLocalOrigin(origin));
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  allowedOrigins: string[],
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin, allowedOrigins),
    },
  });
}

function codeFromError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { status: 504, code: "timeout" };
  }
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "rate-limit") return { status: 429, code: "rate-limit" };
    if (error.code === "timeout") return { status: 504, code: "timeout" };
    if (error.code === "unavailable") return { status: 503, code: "unavailable" };
  }
  return { status: 502, code: "invalid-response" };
}

export function createAnalyzePromptHandler(deps: AnalyzePromptDependencies) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    if (!isAllowedOrigin(origin, deps)) {
      return jsonResponse({ code: "forbidden-origin" }, 403, origin, []);
    }
    const responseOrigins = origin
      ? [...new Set([...deps.allowedOrigins, origin])]
      : deps.allowedOrigins;
    const headers = corsHeaders(origin, responseOrigins);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") {
      return jsonResponse({ code: "method-not-allowed" }, 405, origin, responseOrigins);
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ code: "unauthorized" }, 401, origin, responseOrigins);
    }

    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ code: "request-too-large" }, 413, origin, responseOrigins);
    }

    let owner = false;
    try {
      owner = await deps.verifyOwner(authorization);
    } catch {
      return jsonResponse({ code: "unavailable" }, 503, origin, responseOrigins);
    }
    if (!owner) return jsonResponse({ code: "forbidden" }, 403, origin, responseOrigins);

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return jsonResponse({ code: "invalid-request" }, 400, origin, responseOrigins);
    }
    const parsed = edgeAiOptimizeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse({ code: "invalid-request" }, 400, origin, responseOrigins);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), deps.timeoutMs ?? 20_000);
    try {
      const modelResult = edgeAiModelResultSchema.parse(
        await deps.callGemini(parsed.data, controller.signal),
      );
      const result = edgeAiOptimizeResultSchema.parse({
        ...modelResult,
        model: deps.model,
        optimizedAt: deps.now(),
      });
      return jsonResponse(result, 200, origin, responseOrigins);
    } catch (error) {
      const mapped = codeFromError(error);
      return jsonResponse({ code: mapped.code }, mapped.status, origin, responseOrigins);
    } finally {
      clearTimeout(timeout);
    }
  };
}

interface ProductionEnvironment {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  allowedOrigins: string[];
  environment?: string;
}

type SupabaseFactory = (
  url: string,
  key: string,
  options: { global: { headers: { Authorization: string } } },
) => SupabaseClient;

export function createProductionDependencies(options: {
  environment: ProductionEnvironment;
  createClient: SupabaseFactory;
  fetcher: Fetcher;
}): AnalyzePromptDependencies {
  const { environment, createClient, fetcher } = options;
  return {
    model: environment.geminiModel || "not-configured",
    allowedOrigins: environment.allowedOrigins,
    allowLocalhost: environment.environment === "development",
    now: () => new Date().toISOString(),
    async verifyOwner(authorization) {
      if (!environment.supabaseUrl || !environment.supabaseAnonKey) return false;
      const client = createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey,
        { global: { headers: { Authorization: authorization } } },
      );
      const { data, error } = await client.rpc("is_framecraft_owner");
      if (error) throw { code: "unavailable" };
      return data === true;
    },
    async callGemini(request, signal) {
      if (!environment.geminiApiKey || !environment.geminiModel) {
        throw { code: "unavailable" };
      }
      return callGemini(request, {
        apiKey: environment.geminiApiKey,
        model: environment.geminiModel,
      }, fetcher, signal);
    },
  };
}

export function buildGeminiInstruction(request: EdgeAiOptimizeRequest) {
  const language = request.outputLanguage === "th" ? "Thai" : "English";
  return [
    "You are a professional film-production prompt editor.",
    `Return ONLY valid JSON in ${language}.`,
    "Preserve the selected techniques and shot order.",
    "Do not invent a subject, action, location, lens, camera setting, or lighting detail that the user did not provide.",
    "Identify practical conflicts and express them in warnings instead of silently changing the user's choices.",
    "Use natural transitions for multi-shot video prompts.",
    "Return this shape: {optimizedPrompt:string, improvements:string[], warnings:string[], shotBreakdown:[{index:number,summary:string,transition:string}]}",
    "Structured input:",
    JSON.stringify(request),
  ].join("\n");
}

export async function callGemini(
  request: EdgeAiOptimizeRequest,
  environment: GeminiEnvironment,
  fetcher: Fetcher,
  signal: AbortSignal,
): Promise<EdgeAiModelResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(environment.model)}:generateContent`;
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": environment.apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildGeminiInstruction(request) }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal,
  });
  if (response.status === 429) throw { code: "rate-limit" };
  if (!response.ok) throw { code: "unavailable" };

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw { code: "invalid-response" };
  try {
    return edgeAiModelResultSchema.parse(JSON.parse(text));
  } catch {
    throw { code: "invalid-response" };
  }
}
