export interface CloudConfig {
  url: string;
  publishableKey: string;
}

export function readCloudConfig(
  env: Record<string, string | undefined>,
): CloudConfig {
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    publishableKey:
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
  };
}

export function isCloudConfigured(config: CloudConfig): boolean {
  return (
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url) &&
    config.publishableKey.startsWith("sb_publishable_")
  );
}
