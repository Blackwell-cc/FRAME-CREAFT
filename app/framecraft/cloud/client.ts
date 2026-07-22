import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isCloudConfigured, type CloudConfig } from "./config";

export function createCloudClient(config: CloudConfig): SupabaseClient | null {
  if (!isCloudConfigured(config)) return null;

  return createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
