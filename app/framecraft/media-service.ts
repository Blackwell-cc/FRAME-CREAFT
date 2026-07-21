const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumBytes = 12 * 1024 * 1024;

export type MediaValidation = { valid: true } | { valid: false; error: string };

export function validateMediaFile(file: File): MediaValidation {
  if (!supportedTypes.has(file.type)) {
    return { valid: false, error: "รองรับเฉพาะไฟล์ JPG, PNG และ WebP" };
  }
  if (file.size > maximumBytes) {
    return { valid: false, error: "รูปภาพต้องมีขนาดไม่เกิน 12 MB" };
  }
  return { valid: true };
}

export function validateVideoReferenceUrl(value: string): MediaValidation {
  if (!value.trim()) return { valid: true };
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return { valid: true };
  } catch {
    // Return the same actionable message for malformed and unsafe URLs.
  }
  return { valid: false, error: "ลิงก์วิดีโอต้องขึ้นต้นด้วย http:// หรือ https://" };
}
