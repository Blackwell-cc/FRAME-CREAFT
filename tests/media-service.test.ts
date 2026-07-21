import { describe, expect, it } from "vitest";
import { validateMediaFile, validateVideoReferenceUrl } from "../app/framecraft/media-service";

describe("media validation", () => {
  it("accepts supported image formats under 12 MB", () => {
    const file = new File([new Uint8Array(1024)], "frame.webp", { type: "image/webp" });
    expect(validateMediaFile(file)).toEqual({ valid: true });
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
