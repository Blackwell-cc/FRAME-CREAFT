import type { SupabaseClient } from "@supabase/supabase-js";
import { createAiOptimizer } from "../ai-optimizer";
import { createBackupArchive } from "../backup-service";
import { readImageDimensions } from "../media-service";
import {
  mediaRepository,
  promptRepository,
  settingsRepository,
  syncMetadataRepository,
  techniqueRepository,
} from "../storage";
import type { AppSettings, MediaRecord, SavedPrompt, SyncQueueRecord, Technique } from "../types";
import { createAuthRepository } from "./auth";
import { createCloudClient } from "./client";
import { readCloudConfig } from "./config";
import { toCloudMedia, toCloudSavedPrompt, toCloudSettings, toCloudTechnique } from "./mappers";
import { createMigrationService } from "./migration-service";
import { createCloudRepositories } from "./repositories";
import { ensureStarterCloudMedia } from "./starter-cloud-media";

function throwFailure(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "Supabase operation failed");
}

function download(bytes: Uint8Array) {
  const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `framecraft-before-cloud-${new Date().toISOString().slice(0, 10)}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function rememberVersions(entity: string, rows: Array<{ id: string; version: number }>) {
  const updatedAt = new Date().toISOString();
  await Promise.all(rows.map((row) => syncMetadataRepository.save({
    key: `cloud-version:${entity}:${row.id}`,
    value: row.version,
    updatedAt,
  })));
}

export function createAppCloudRuntime(env: Record<string, string | undefined>) {
  const client = createCloudClient(readCloudConfig(env));
  const repositories = createCloudRepositories(client);
  if (!client || !repositories) return null;

  return {
    client,
    auth: createAuthRepository(client),
    ai: createAiOptimizer(client),
    repositories,
    async loadPublic() {
      const [techniques, media, techniqueVersions, mediaVersions] = await Promise.all([
        repositories.techniques.listPublished(),
        repositories.media.listPublished(),
        client.from("techniques").select("id,version").eq("published", true).is("deleted_at", null),
        client.from("media").select("id,version").is("deleted_at", null),
      ]);
      throwFailure(techniqueVersions.error);
      throwFailure(mediaVersions.error);
      await Promise.all([
        rememberVersions("technique", techniqueVersions.data ?? []),
        rememberVersions("media", mediaVersions.data ?? []),
      ]);
      const mediaUrls = Object.fromEntries(media.map((record) => [
        record.technique_id,
        client.storage.from("technique-images").getPublicUrl(record.storage_path).data.publicUrl,
      ]));
      return { techniques, mediaUrls };
    },
    async loadOwner() {
      const [prompts, favorites, settings, promptVersions, settingsVersion] = await Promise.all([
        repositories.prompts.listMine(),
        repositories.favorites.listMine(),
        repositories.settings.getMine(),
        client.from("saved_prompts").select("id,version").is("deleted_at", null),
        client.from("user_settings").select("version").maybeSingle(),
      ]);
      throwFailure(promptVersions.error);
      throwFailure(settingsVersion.error);
      await rememberVersions("saved_prompt", promptVersions.data ?? []);
      if (settingsVersion.data) {
        await syncMetadataRepository.save({
          key: "cloud-version:user_settings:app",
          value: settingsVersion.data.version,
          updatedAt: new Date().toISOString(),
        });
      }
      return { prompts, favorites, settings };
    },
    async apply(record: SyncQueueRecord) {
      const entity = record.entity;
      let result;
      if (entity === "technique") {
        result = record.action === "delete"
          ? await repositories.techniques.remove(record.entityId, record.baseVersion ?? 0, record.operationId)
          : await repositories.techniques.upsert(record.payload as Technique, record.baseVersion, record.operationId);
      } else if (entity === "media") {
        const mediaRecord = record.payload as MediaRecord;
        const normalizedMedia = mediaRecord.width > 0 && mediaRecord.height > 0
          ? mediaRecord
          : { ...mediaRecord, ...await readImageDimensions(mediaRecord.blob) };
        result = record.action === "delete"
          ? await repositories.media.remove(normalizedMedia, record.userId, record.baseVersion ?? 0, record.operationId)
          : (await repositories.media.upload(normalizedMedia, record.userId, record.baseVersion, record.operationId)).sync;
      } else if (entity === "saved_prompt") {
        result = record.action === "delete"
          ? await repositories.prompts.removeMine(record.entityId, record.baseVersion ?? 0, record.operationId)
          : await repositories.prompts.upsertMine(record.payload as SavedPrompt, record.baseVersion, record.operationId);
      } else if (entity === "favorite") {
        const payload = record.payload as { entity_type: "technique" | "prompt"; entity_id: string; created_at: string; user_id: string };
        result = record.action === "delete"
          ? await repositories.favorites.removeMine(payload.entity_type, record.entityId, record.operationId)
          : await repositories.favorites.saveMine(payload, record.operationId);
      } else {
        result = await repositories.settings.saveMine(record.payload as AppSettings, record.baseVersion, record.operationId);
      }
      if (result.status === "applied") {
        await syncMetadataRepository.save({
          key: `cloud-version:${entity}:${record.entityId}`,
          value: result.version,
          updatedAt: new Date().toISOString(),
        });
      }
      return result;
    },
    migration(ownerUserId: string) {
      return createMigrationBoundary(client, ownerUserId);
    },
  };
}

function createMigrationBoundary(client: SupabaseClient, ownerUserId: string) {
  return createMigrationService({
    ownerUserId,
    async loadLocal() {
      const [techniques, prompts, media, settings] = await Promise.all([
        techniqueRepository.list(), promptRepository.list(), mediaRepository.list(), settingsRepository.get(),
      ]);
      const cloudMedia = await ensureStarterCloudMedia(
        media,
        async (path) => {
          const response = await fetch(path);
          if (!response.ok) throw new Error("ไม่สามารถเตรียมภาพ Close-Up สำหรับ Cloud ได้");
          return response.blob();
        },
        readImageDimensions,
      );
      return { techniques, prompts, media: cloudMedia, settings: settings ?? null };
    },
    createBackup: ({ techniques, prompts, media, settings }) => createBackupArchive({ techniques, prompts, media, settings }),
    deliverBackup: async (bytes) => download(bytes),
    async uploadMedia(record, storagePath) {
      const { error } = await client.storage.from("technique-images").upload(storagePath, record.blob, {
        contentType: record.mimeType,
        upsert: true,
      });
      throwFailure(error);
    },
    async upsertTechnique(record) {
      const { error } = await client.from("techniques").upsert(toCloudTechnique(record));
      throwFailure(error);
    },
    async upsertMedia(record, storagePath) {
      const dimensions = record.width > 0 && record.height > 0
        ? { width: record.width, height: record.height }
        : await readImageDimensions(record.blob);
      const normalized = { ...record, ...dimensions };
      const { error } = await client.from("media").upsert(toCloudMedia(normalized, storagePath));
      throwFailure(error);
    },
    async upsertPrompt(record: SavedPrompt, userId: string) {
      const { error } = await client.from("saved_prompts").upsert(toCloudSavedPrompt(record, userId));
      throwFailure(error);
    },
    async saveSettings(record: AppSettings, userId: string) {
      const { error } = await client.from("user_settings").upsert(toCloudSettings(record, userId));
      throwFailure(error);
    },
    async readBack() {
      const [techniques, prompts, media, settings] = await Promise.all([
        client.from("techniques").select("id,version").is("deleted_at", null),
        client.from("saved_prompts").select("id,version").is("deleted_at", null),
        client.from("media").select("id,version").is("deleted_at", null),
        client.from("user_settings").select("user_id,version").maybeSingle(),
      ]);
      [techniques, prompts, media, settings].forEach(({ error }) => throwFailure(error));
      await Promise.all([
        rememberVersions("technique", techniques.data ?? []),
        rememberVersions("saved_prompt", prompts.data ?? []),
        rememberVersions("media", media.data ?? []),
        settings.data ? syncMetadataRepository.save({
          key: "cloud-version:user_settings:app",
          value: settings.data.version,
          updatedAt: new Date().toISOString(),
        }) : Promise.resolve(),
      ]);
      return {
        techniqueIds: (techniques.data ?? []).map(({ id }) => id),
        promptIds: (prompts.data ?? []).map(({ id }) => id),
        mediaIds: (media.data ?? []).map(({ id }) => id),
        hasSettings: Boolean(settings.data),
      };
    },
    metadata: {
      async get(key) { return (await syncMetadataRepository.get(key))?.value; },
      async save(key, value) {
        await syncMetadataRepository.save({ key, value, updatedAt: new Date().toISOString() });
      },
    },
    now: () => new Date().toISOString(),
  });
}

export type AppCloudRuntime = NonNullable<ReturnType<typeof createAppCloudRuntime>>;
