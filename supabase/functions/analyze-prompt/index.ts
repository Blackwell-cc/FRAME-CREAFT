import { createClient } from "@supabase/supabase-js";
import {
  createAnalyzePromptHandler,
  createProductionDependencies,
} from "./handler.ts";

interface DenoRuntime {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
}

const deno = (globalThis as unknown as { Deno: DenoRuntime }).Deno;
const allowedOrigins = (deno.env.get("FRAMECRAFT_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const dependencies = createProductionDependencies({
  environment: {
    supabaseUrl: deno.env.get("SUPABASE_URL"),
    supabaseAnonKey: deno.env.get("SUPABASE_ANON_KEY"),
    geminiApiKey: deno.env.get("GEMINI_API_KEY"),
    geminiModel: deno.env.get("GEMINI_MODEL"),
    allowedOrigins,
    environment: deno.env.get("FRAMECRAFT_ENV"),
  },
  createClient,
  fetcher: fetch,
});

deno.serve(createAnalyzePromptHandler(dependencies));
