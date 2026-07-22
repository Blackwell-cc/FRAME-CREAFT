import type { MediaRecord } from "../types";

const closeUpAsset = "/images/techniques/close-up-korean-actor-clean-studio-v3.webp";

export async function ensureStarterCloudMedia(
  records: MediaRecord[],
  fetchAsset: (path: string) => Promise<Blob>,
  readDimensions: (blob: Blob) => Promise<{ width: number; height: number }>,
): Promise<MediaRecord[]> {
  if (records.some((record) => record.techniqueId === "shot-close-up")) return records;

  const blob = await fetchAsset(closeUpAsset);
  const dimensions = await readDimensions(blob);
  const timestamp = "2026-07-21T00:00:00.000Z";
  return [
    ...records,
    {
      id: "media-shot-close-up-approved-v3",
      techniqueId: "shot-close-up",
      blob,
      mimeType: "image/webp",
      width: dimensions.width,
      height: dimensions.height,
      byteSize: blob.size,
      altTh: "ภาพอ้างอิง Close-Up นายแบบในสตูดิโอ",
      altEn: "Close-Up studio portrait reference",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}
