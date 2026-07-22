import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { AppSettings, LocalFavoriteRecord, MediaRecord, SavedPrompt, SyncMetadataRecord, Technique } from "./types";

interface BackupSource {
  techniques: Technique[];
  prompts: SavedPrompt[];
  settings: AppSettings | null;
  media: MediaRecord[];
  favorites?: LocalFavoriteRecord[];
  cloudMetadata?: SyncMetadataRecord[];
}

interface MediaMetadata extends Omit<MediaRecord, "blob"> { file: string }

interface BackupManifestV1 {
  app: "FRAME / CRAFT"; appVersion: string; schemaVersion: 1; exportedAt: string;
  counts: { techniques: number; prompts: number; media: number };
  mediaChecksums: Record<string, string>;
}

interface BackupManifestV2 {
  app: "FRAME / CRAFT"; appVersion: string; schemaVersion: 2; exportedAt: string;
  counts: { techniques: number; prompts: number; media: number; favorites: number; cloudMetadata: number };
  mediaChecksums: Record<string, string>;
}

export type BackupManifest = BackupManifestV1 | BackupManifestV2;
export interface InspectedBackup {
  manifest: BackupManifest; techniques: Technique[]; prompts: SavedPrompt[];
  settings: AppSettings | null; media: MediaRecord[];
  favorites: LocalFavoriteRecord[]; cloudMetadata: SyncMetadataRecord[];
}

function checksum(bytes: Uint8Array) {
  let hash = 0x811c9dc5;
  for (const value of bytes) { hash ^= value; hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/avif") return "avif";
  return "webp";
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(value);
}

function hasSafeReferenceUrl(record: Technique) {
  if (!record.videoReferenceUrl) return true;
  try { return new URL(record.videoReferenceUrl).protocol === "https:"; }
  catch { return false; }
}

export async function createBackupArchive(source: BackupSource) {
  const files: Record<string, Uint8Array> = {};
  const mediaChecksums: Record<string, string> = {};
  const metadata: MediaMetadata[] = [];
  const favorites = source.favorites ?? [];
  const cloudMetadata = source.cloudMetadata ?? [];

  for (const record of source.media) {
    const file = `media/${record.id}.${extensionFor(record.mimeType)}`;
    const bytes = new Uint8Array(await record.blob.arrayBuffer());
    files[file] = bytes;
    mediaChecksums[file] = checksum(bytes);
    metadata.push({ ...record, file, blob: undefined } as unknown as MediaMetadata);
  }

  const manifest: BackupManifestV2 = {
    app: "FRAME / CRAFT", appVersion: "0.2.0", schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    counts: {
      techniques: source.techniques.length, prompts: source.prompts.length,
      media: source.media.length, favorites: favorites.length,
      cloudMetadata: cloudMetadata.length,
    },
    mediaChecksums,
  };

  return zipSync({
    ...files,
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    "techniques.json": strToU8(JSON.stringify(source.techniques)),
    "prompts.json": strToU8(JSON.stringify(source.prompts)),
    "settings.json": strToU8(JSON.stringify(source.settings)),
    "media.json": strToU8(JSON.stringify(metadata)),
    "favorites.json": strToU8(JSON.stringify(favorites)),
    "cloud-metadata.json": strToU8(JSON.stringify(cloudMetadata)),
  }, { level: 6 });
}

export function inspectBackupArchive(bytes: Uint8Array): InspectedBackup {
  try {
    const files = unzipSync(bytes);
    const required = ["manifest.json", "techniques.json", "prompts.json", "settings.json", "media.json"];
    if (!required.every((name) => files[name])) throw new Error("missing file");
    const manifest = JSON.parse(strFromU8(files["manifest.json"])) as BackupManifest;
    if (manifest.app !== "FRAME / CRAFT" || ![1, 2].includes(manifest.schemaVersion)) throw new Error("invalid manifest");
    if (manifest.schemaVersion === 2 && (!files["favorites.json"] || !files["cloud-metadata.json"])) throw new Error("missing v2 file");

    const techniques = JSON.parse(strFromU8(files["techniques.json"])) as Technique[];
    const prompts = JSON.parse(strFromU8(files["prompts.json"])) as SavedPrompt[];
    const settings = JSON.parse(strFromU8(files["settings.json"])) as AppSettings | null;
    const mediaMetadata = JSON.parse(strFromU8(files["media.json"])) as MediaMetadata[];
    const favorites = files["favorites.json"] ? JSON.parse(strFromU8(files["favorites.json"])) as LocalFavoriteRecord[] : [];
    const cloudMetadata = files["cloud-metadata.json"] ? JSON.parse(strFromU8(files["cloud-metadata.json"])) as SyncMetadataRecord[] : [];

    if (!Array.isArray(techniques) || !Array.isArray(prompts) || !Array.isArray(mediaMetadata) || !Array.isArray(favorites) || !Array.isArray(cloudMetadata)) throw new Error("invalid array");
    if (manifest.counts.techniques !== techniques.length || manifest.counts.prompts !== prompts.length || manifest.counts.media !== mediaMetadata.length) throw new Error("count mismatch");
    if (manifest.schemaVersion === 2 && (manifest.counts.favorites !== favorites.length || manifest.counts.cloudMetadata !== cloudMetadata.length)) throw new Error("v2 count mismatch");

    if (techniques.some((item) => !isSafeId(item.id) || !hasSafeReferenceUrl(item)) || prompts.some((item) => !isSafeId(item.id)) || mediaMetadata.some((item) => !isSafeId(item.id) || !isSafeId(item.techniqueId) || item.file !== `media/${item.id}.${extensionFor(item.mimeType)}`) || favorites.some((item) => !isSafeId(item.id) || !isSafeId(item.userId) || !isSafeId(item.entityId))) throw new Error("unsafe record");

    const allowedFiles = new Set([...required, ...(manifest.schemaVersion === 2 ? ["favorites.json", "cloud-metadata.json"] : []), ...mediaMetadata.map((item) => item.file)]);
    if (Object.keys(files).some((name) => !allowedFiles.has(name))) throw new Error("unexpected file");

    const media = mediaMetadata.map(({ file, ...record }) => {
      const fileBytes = files[file];
      if (!fileBytes || checksum(fileBytes) !== manifest.mediaChecksums[file]) throw new Error("invalid media");
      return { ...record, blob: new Blob([fileBytes as BlobPart], { type: record.mimeType }) };
    });
    return { manifest, techniques, prompts, settings, media, favorites, cloudMetadata };
  } catch {
    throw new Error("ไฟล์ Backup ไม่ถูกต้อง");
  }
}
