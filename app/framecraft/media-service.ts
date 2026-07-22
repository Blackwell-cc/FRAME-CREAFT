const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumBytes = 10 * 1024 * 1024;

export type MediaValidation = { valid: true } | { valid: false; error: string };

export function validateMediaFile(file: File): MediaValidation {
  if (!supportedTypes.has(file.type)) {
    return { valid: false, error: "รองรับเฉพาะไฟล์ JPG, PNG และ WebP" };
  }
  if (file.size > maximumBytes) {
    return { valid: false, error: "รูปภาพต้องมีขนาดไม่เกิน 10 MB" };
  }
  return { valid: true };
}

export async function readImageDimensions(blob: Blob) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("ไม่สามารถอ่านขนาดรูปภาพได้"));
    };
    image.src = url;
  });
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
