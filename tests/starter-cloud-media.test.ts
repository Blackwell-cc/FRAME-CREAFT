import { describe, expect, it, vi } from "vitest";
import { ensureStarterCloudMedia } from "../app/framecraft/cloud/starter-cloud-media";

describe("starter cloud media", () => {
  it("adds the approved Close-Up asset with a stable ID when IndexedDB has no copy", async () => {
    const blob = new Blob(["approved-image"], { type: "image/webp" });
    const fetchAsset = vi.fn().mockResolvedValue(blob);

    const result = await ensureStarterCloudMedia([], fetchAsset, async () => ({ width: 1200, height: 800 }));

    expect(fetchAsset).toHaveBeenCalledWith("/images/techniques/close-up-korean-actor-clean-studio-v3.webp");
    expect(result).toEqual([
      expect.objectContaining({
        id: "media-shot-close-up-approved-v3",
        techniqueId: "shot-close-up",
        blob,
        mimeType: "image/webp",
        width: 1200,
        height: 800,
      }),
    ]);
  });

  it("does not duplicate a Close-Up image already stored by the owner", async () => {
    const existing = { id: "owner-media", techniqueId: "shot-close-up" } as never;
    const fetchAsset = vi.fn();

    await expect(ensureStarterCloudMedia([existing], fetchAsset, vi.fn())).resolves.toEqual([existing]);
    expect(fetchAsset).not.toHaveBeenCalled();
  });
});
