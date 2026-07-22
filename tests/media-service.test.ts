import { afterEach, describe, expect, it, vi } from "vitest";
import { readImageDimensions, validateMediaFile, validateVideoReferenceUrl } from "../app/framecraft/media-service";

afterEach(() => vi.unstubAllGlobals());

describe("media validation", () => {
  it("accepts supported image formats under 10 MB", () => {
    const file = new File([new Uint8Array(1024)], "frame.webp", { type: "image/webp" });
    expect(validateMediaFile(file)).toEqual({ valid: true });
  });

  it("rejects images larger than the Supabase 10 MB limit", () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.webp", { type: "image/webp" });
    expect(validateMediaFile(file)).toEqual({ valid: false, error: "รูปภาพต้องมีขนาดไม่เกิน 10 MB" });
  });

  it("reads real image dimensions before saving metadata", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 1200, height: 800, close }));
    const file = new File(["image"], "frame.webp", { type: "image/webp" });

    await expect(readImageDimensions(file)).resolves.toEqual({ width: 1200, height: 800 });
    expect(close).toHaveBeenCalledOnce();
  });

  it("explains unsupported formats in Thai", () => {
    const file = new File(["text"], "notes.txt", { type: "text/plain" });
    expect(validateMediaFile(file)).toEqual({
      valid: false,
      error: "รองรับเฉพาะไฟล์ JPG, PNG และ WebP",
    });
  });

  it("accepts http video references and rejects unsafe protocols", () => {
    expect(validateVideoReferenceUrl("https://vimeo.com/123")).toEqual({ valid: true });
    expect(validateVideoReferenceUrl("javascript:alert(1)")).toEqual({
      valid: false,
      error: "ลิงก์วิดีโอต้องขึ้นต้นด้วย http:// หรือ https://",
    });
  });
});
