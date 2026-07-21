import { describe, expect, it } from "vitest";
import {
  isCloudConfigured,
  readCloudConfig,
} from "../app/framecraft/cloud/config";

describe("cloud config", () => {
  it("accepts a valid Supabase URL and publishable key", () => {
    const config = readCloudConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc123.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    });

    expect(config.url).toBe("https://abc123.supabase.co");
    expect(config.publishableKey).toBe("sb_publishable_example");
    expect(isCloudConfigured(config)).toBe(true);
  });

  it("keeps the app in local mode when either value is missing", () => {
    expect(isCloudConfigured(readCloudConfig({}))).toBe(false);
    expect(
      isCloudConfigured(
        readCloudConfig({
          NEXT_PUBLIC_SUPABASE_URL: "https://abc123.supabase.co",
        }),
      ),
    ).toBe(false);
    expect(
      isCloudConfigured(
        readCloudConfig({
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
        }),
      ),
    ).toBe(false);
  });
});
