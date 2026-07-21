import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { AppSettings, MediaRecord, SavedPrompt, Technique } from "./types";

interface BackupSource {
  techniques: Technique[];
  prompts: SavedPrompt[];
  settings: AppSettings | null;
  media: MediaRecord[];
}

interface MediaMetadata extends Omit<MediaRecord, "blob"> {
  file: string;
}

export interface BackupManifest {
  app: "FRAME / CRAFT";
  appVersion: string;
  schemaVersion: 1;
  exportedAt: string;
  counts: { techniques: number; prompts: number; media: number };
  mediaChecksums: Record<string, string>;
}

export interface InspectedBackup extends Omit<BackupSource, "media"> {
  manifest: BackupManifest;
  media: MediaRecord[];
}

function checksum(bytes: Uint8Array) {
  let hash = 0x811c9dc5;
  for (const value of bytes) {
    hash ^= value;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  return "webp";
}

export async function createBackupArchive(source: BackupSource) {
  const files: Record<string, Uint8Array> = {};
  const mediaChecksums: Record<string, string> = {};
  const metadata: MediaMetadata[] = [];

  for (const record of source.media) {
    const file = `media/${record.id}.${extensionFor(record.mimeType)}`;
    const bytes = new Uint8Array(await record.blob.arrayBuffer());
    files[file] = bytes;
    mediaChecksums[file] = checksum(bytes);
    metadata.push({ ...record, file, blob: undefined } as unknown as MediaMetadata);
  }

  const manifest: BackupManifest = {
    app: "FRAME / CRAFT",
    appVersion: "0.1.0",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    counts: { techniques: source.techniques.length, prompts: source.prompts.length, media: source.media.length },
    mediaChecksums,
  };

  return zipSync({
    ...files,
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    "techniques.json": strToU8(JSON.stringify(source.techniques)),
    "prompts.json": strToU8(JSON.stringify(source.prompts)),
    "settings.json": strToU8(JSON.stringify(source.settings)),
    "media.json": strToU8(JSON.stringify(metadata)),
  }, { level: 6 });
}

export function inspectBackupArchive(bytes: Uint8Array): InspectedBackup {
  try {
    const files = unzipSync(bytes);
    const required = ["manifest.json", "techniques.json", "prompts.json", "settings.json", "media.json"];
    if (!required.every((name) => files[name])) throw new Error("missing file");
    const manifest = JSON.parse(strFromU8(files["manifest.json"])) as BackupManifest;
    const techniques = JSON.parse(strFromU8(files["techniques.json"])) as Technique[];
    const prompts = JSON.parse(strFromU8(files["prompts.json"])) as SavedPrompt[];
    const settings = JSON.parse(strFromU8(files["settings.json"])) as AppSettings | null;
    const mediaMetadata = JSON.parse(strFromU8(files["media.json"])) as MediaMetadata[];
    if (
      manifest.app !== "FRAME / CRAFT" || manifest.schemaVersion !== 1 ||
      !Array.isArray(techniques) || !Array.isArray(prompts) || !Array.isArray(mediaMetadata) ||
      manifest.counts.techniques !== techniques.length || manifest.counts.prompts !== prompts.length ||
      manifest.counts.media !== mediaMetadata.length
    ) throw new Error("invalid manifest");

    const media = mediaMetadata.map(({ file, ...record }) => {
      const fileBytes = files[file];
      if (!fileBytes || checksum(fileBytes) !== manifest.mediaChecksums[file]) throw new Error("invalid media");
      return { ...record, blob: new Blob([fileBytes as BlobPart], { type: record.mimeType }) };
    });
    return { manifest, techniques, prompts, settings, media };
  } catch {
    throw new Error("ไฟล์ Backup ไม่ถูกต้อง");
  }
}
