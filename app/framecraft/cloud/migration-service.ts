import type { AppSettings, MediaRecord, SavedPrompt, Technique } from "../types";

export type MigrationPhase =
  | "idle"
  | "backup-required"
  | "preflight"
  | "uploading-media"
  | "uploading-records"
  | "verifying"
  | "complete"
  | "failed";

interface MigrationSource {
  techniques: Technique[];
  prompts: SavedPrompt[];
  media: MediaRecord[];
  settings: AppSettings | null;
}

interface MigrationCounts {
  techniques: number;
  prompts: number;
  media: number;
  settings: number;
}

interface ReadBackResult {
  techniqueIds: string[];
  promptIds: string[];
  mediaIds: string[];
  hasSettings: boolean;
}

interface MigrationMetadata {
  get(key: string): Promise<unknown>;
  save(key: string, value: unknown): Promise<void>;
}

interface MigrationDependencies {
  ownerUserId: string;
  loadLocal(): Promise<MigrationSource>;
  createBackup(source: MigrationSource): Promise<Uint8Array>;
  deliverBackup(bytes: Uint8Array): Promise<void>;
  uploadMedia(record: MediaRecord, storagePath: string): Promise<void>;
  upsertTechnique(record: Technique): Promise<void>;
  upsertMedia(record: MediaRecord, storagePath: string): Promise<void>;
  upsertPrompt(record: SavedPrompt, userId: string): Promise<void>;
  saveSettings(record: AppSettings, userId: string): Promise<void>;
  readBack(): Promise<ReadBackResult>;
  metadata: MigrationMetadata;
  now(): string;
}

export interface MigrationReport {
  phase: MigrationPhase;
  counts: MigrationCounts;
  errorCode?: "READ_BACK_MISMATCH" | "MIGRATION_FAILED";
}

const currentMigrationVersion = 2;

function countsFor(source: MigrationSource): MigrationCounts {
  return {
    techniques: source.techniques.length,
    prompts: source.prompts.length,
    media: source.media.length,
    settings: source.settings ? 1 : 0,
  };
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/avif") return "avif";
  return "webp";
}

function sameIds(localIds: string[], cloudIds: string[]) {
  return (
    localIds.length === cloudIds.length &&
    [...localIds].sort().every((id, index) => id === [...cloudIds].sort()[index])
  );
}

class ReadBackMismatchError extends Error {}

export function createMigrationService(dependencies: MigrationDependencies) {
  async function inspectMigration(): Promise<MigrationReport> {
    const source = await dependencies.loadLocal();
    const complete = await dependencies.metadata.get("migration-version");
    return {
      phase: complete === currentMigrationVersion ? "complete" : "backup-required",
      counts: countsFor(source),
    };
  }

  async function verifyMigration(source: MigrationSource) {
    const cloud = await dependencies.readBack();
    const matches =
      sameIds(source.techniques.map((item) => item.id), cloud.techniqueIds) &&
      sameIds(source.prompts.map((item) => item.id), cloud.promptIds) &&
      sameIds(source.media.map((item) => item.id), cloud.mediaIds) &&
      Boolean(source.settings) === cloud.hasSettings;
    if (!matches) throw new ReadBackMismatchError("READ_BACK_MISMATCH");
    return true;
  }

  async function runMigration(options: { backupConfirmed: boolean }): Promise<MigrationReport> {
    const source = await dependencies.loadLocal();
    const counts = countsFor(source);
    if ((await dependencies.metadata.get("migration-version")) === currentMigrationVersion) {
      return { phase: "complete", counts };
    }
    if (!options.backupConfirmed) return { phase: "backup-required", counts };

    try {
      const backup = await dependencies.createBackup(source);
      await dependencies.deliverBackup(backup);
      await dependencies.metadata.save("migration-phase", "preflight");

      await dependencies.metadata.save("migration-phase", "uploading-media");
      for (const record of source.media) {
        const storagePath = `${dependencies.ownerUserId}/${record.techniqueId}/${record.id}.${extensionFor(record.mimeType)}`;
        await dependencies.uploadMedia(record, storagePath);
      }

      await dependencies.metadata.save("migration-phase", "uploading-records");
      for (const record of source.techniques) {
        await dependencies.upsertTechnique(record);
      }
      for (const record of source.media) {
        const storagePath = `${dependencies.ownerUserId}/${record.techniqueId}/${record.id}.${extensionFor(record.mimeType)}`;
        await dependencies.upsertMedia(record, storagePath);
      }
      for (const record of source.prompts) {
        await dependencies.upsertPrompt(record, dependencies.ownerUserId);
      }
      if (source.settings) {
        await dependencies.saveSettings(source.settings, dependencies.ownerUserId);
      }

      await dependencies.metadata.save("migration-phase", "verifying");
      await verifyMigration(source);
      await dependencies.metadata.save("migration-complete", true);
      await dependencies.metadata.save("migration-version", currentMigrationVersion);
      await dependencies.metadata.save("migration-completed-at", dependencies.now());
      await dependencies.metadata.save("migration-phase", "complete");
      return { phase: "complete", counts };
    } catch (error) {
      await dependencies.metadata.save("migration-phase", "failed");
      return {
        phase: "failed",
        counts,
        errorCode:
          error instanceof ReadBackMismatchError
            ? "READ_BACK_MISMATCH"
            : "MIGRATION_FAILED",
      };
    }
  }

  return {
    inspectMigration,
    runMigration,
    verifyMigration: async () => verifyMigration(await dependencies.loadLocal()),
    resumeMigration: () => runMigration({ backupConfirmed: true }),
  };
}
