import Dexie, { type EntityTable } from "dexie";
import type {
  AppSettings,
  LocalFavoriteRecord,
  MediaRecord,
  SavedPrompt,
  SyncConflictRecord,
  SyncMetadataRecord,
  SyncQueueRecord,
  Technique,
} from "./types";
import { upgradeSavedPrompt } from "./saved-prompt-schema";

interface MetaRecord {
  key: string;
  value: string;
}

export class FrameCraftDb extends Dexie {
  techniques!: EntityTable<Technique, "id">;
  prompts!: EntityTable<SavedPrompt, "id">;
  media!: EntityTable<MediaRecord, "id">;
  settings!: EntityTable<AppSettings, "id">;
  meta!: EntityTable<MetaRecord, "key">;
  favorites!: EntityTable<LocalFavoriteRecord, "id">;
  syncQueue!: EntityTable<SyncQueueRecord, "operationId">;
  syncConflicts!: EntityTable<SyncConflictRecord, "operationId">;
  syncMetadata!: EntityTable<SyncMetadataRecord, "key">;

  constructor(name = "framecraft") {
    super(name);
    this.version(1).stores({
      techniques: "id, slug, category, sourceType, isFavorite, isHidden, updatedAt, *tags, *moods",
      prompts: "id, mode, platform, isFavorite, updatedAt",
      media: "id, techniqueId, updatedAt",
      settings: "id",
      meta: "key",
    });
    this.version(2).stores({
      techniques: "id, slug, category, sourceType, isHidden, updatedAt, *tags, *moods",
      prompts: "id, mode, platform, updatedAt",
      media: "id, techniqueId, updatedAt",
      settings: "id",
      meta: "key",
      favorites: "id, userId, entityType, entityId, createdAt",
      syncQueue: "operationId, userId, entity, entityId, createdAt",
      syncConflicts: "operationId, userId, entity, entityId, detectedAt",
      syncMetadata: "key, updatedAt",
    });
  }
}

export function createFrameCraftDb(name?: string) {
  return new FrameCraftDb(name);
}

export function createTechniqueRepository(db: FrameCraftDb) {
  return {
    async ensureSeeded(records: Technique[]) {
      await db.transaction("rw", db.techniques, db.meta, async () => {
        if (await db.meta.get("seed-version")) return;
        await db.techniques.bulkPut(records);
        await db.meta.put({ key: "seed-version", value: "1" });
      });
    },
    list() {
      return db.techniques.toArray();
    },
    count() {
      return db.techniques.count();
    },
    getById(id: string) {
      return db.techniques.get(id);
    },
    async update(id: string, changes: Partial<Technique>) {
      await db.techniques.update(id, { ...changes, updatedAt: new Date().toISOString() });
    },
    async create(record: Technique) {
      await db.techniques.add(record);
      return record;
    },
    delete(id: string) {
      return db.techniques.delete(id);
    },
    async search(query: string) {
      const normalized = query.trim().toLocaleLowerCase("th");
      const records = await db.techniques.toArray();
      if (!normalized) return records.filter((item) => !item.isHidden);
      return records.filter((item) => {
        const haystack = [
          item.titleEn,
          item.titleTh,
          item.abbreviation,
          item.descriptionEn,
          item.descriptionTh,
          item.useCasesTh,
          item.effectTh,
          item.warningsTh,
          ...item.tags,
          ...item.moods,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("th");
        return !item.isHidden && haystack.includes(normalized);
      });
    },
  };
}

export function createPromptRepository(db: FrameCraftDb) {
  return {
    async list() {
      const records = await db.prompts.orderBy("updatedAt").reverse().toArray();
      return records.map(upgradeSavedPrompt);
    },
    async getById(id: string) {
      const record = await db.prompts.get(id);
      return record ? upgradeSavedPrompt(record) : undefined;
    },
    async save(record: SavedPrompt) {
      await db.prompts.put(record);
      return record;
    },
    async update(id: string, changes: Partial<SavedPrompt>) {
      await db.prompts.update(id, { ...changes, updatedAt: new Date().toISOString() });
    },
    delete(id: string) {
      return db.prompts.delete(id);
    },
  };
}

export function createMediaRepository(db: FrameCraftDb) {
  return {
    list() {
      return db.media.toArray();
    },
    getByTechnique(techniqueId: string) {
      return db.media.where("techniqueId").equals(techniqueId).first();
    },
    async save(record: MediaRecord) {
      const existing = await db.media.where("techniqueId").equals(record.techniqueId).first();
      if (existing && existing.id !== record.id) await db.media.delete(existing.id);
      await db.media.put(record);
      return record;
    },
    delete(id: string) {
      return db.media.delete(id);
    },
  };
}

export function createSettingsRepository(db: FrameCraftDb) {
  return {
    get() {
      return db.settings.get("app");
    },
    async save(settings: AppSettings) {
      await db.settings.put(settings);
      return settings;
    },
  };
}

export function createSyncQueueRepository(db: FrameCraftDb) {
  return {
    enqueue(record: SyncQueueRecord) {
      return db.syncQueue.put(record);
    },
    list() {
      return db.syncQueue.orderBy("createdAt").toArray();
    },
    async peek() {
      return (await db.syncQueue.orderBy("createdAt").first()) ?? null;
    },
    remove(operationId: string) {
      return db.syncQueue.delete(operationId);
    },
    count() {
      return db.syncQueue.count();
    },
    async saveTechniqueAndEnqueue(
      technique: Technique,
      record: SyncQueueRecord,
    ) {
      await db.transaction("rw", db.techniques, db.syncQueue, async () => {
        await db.techniques.put(technique);
        await db.syncQueue.put(record);
      });
    },
  };
}

export function createSyncConflictRepository(db: FrameCraftDb) {
  return {
    save(record: SyncConflictRecord) {
      return db.syncConflicts.put(record);
    },
    list() {
      return db.syncConflicts.orderBy("detectedAt").toArray();
    },
    remove(operationId: string) {
      return db.syncConflicts.delete(operationId);
    },
    count() {
      return db.syncConflicts.count();
    },
  };
}

export function createSyncMetadataRepository(db: FrameCraftDb) {
  return {
    get(key: string) {
      return db.syncMetadata.get(key);
    },
    save(record: SyncMetadataRecord) {
      return db.syncMetadata.put(record);
    },
  };
}

export function createFavoriteRepository(db: FrameCraftDb) {
  return {
    listByUser(userId: string) {
      return db.favorites.where("userId").equals(userId).toArray();
    },
    save(record: LocalFavoriteRecord) {
      return db.favorites.put(record);
    },
    delete(id: string) {
      return db.favorites.delete(id);
    },
  };
}

export function createOwnerMutationRepository(db: FrameCraftDb) {
  return {
    async saveTechnique(record: Technique, queue: SyncQueueRecord) {
      await db.transaction("rw", db.techniques, db.syncQueue, async () => {
        await db.techniques.put(record);
        await db.syncQueue.put(queue);
      });
    },
    async deleteTechnique(id: string, queue: SyncQueueRecord, media?: MediaRecord, mediaQueue?: SyncQueueRecord) {
      await db.transaction("rw", db.techniques, db.media, db.syncQueue, async () => {
        await db.techniques.delete(id);
        if (media) await db.media.delete(media.id);
        await db.syncQueue.put(queue);
        if (mediaQueue) await db.syncQueue.put(mediaQueue);
      });
    },
    async saveMedia(record: MediaRecord, queue: SyncQueueRecord) {
      await db.transaction("rw", db.media, db.syncQueue, async () => {
        const existing = await db.media.where("techniqueId").equals(record.techniqueId).first();
        if (existing && existing.id !== record.id) await db.media.delete(existing.id);
        await db.media.put(record);
        await db.syncQueue.put(queue);
      });
    },
    async savePrompt(record: SavedPrompt, queue: SyncQueueRecord) {
      await db.transaction("rw", db.prompts, db.syncQueue, async () => {
        await db.prompts.put(record);
        await db.syncQueue.put(queue);
      });
    },
    async deletePrompt(id: string, queue: SyncQueueRecord) {
      await db.transaction("rw", db.prompts, db.syncQueue, async () => {
        await db.prompts.delete(id);
        await db.syncQueue.put(queue);
      });
    },
    async saveFavorite(record: LocalFavoriteRecord, queue: SyncQueueRecord) {
      await db.transaction("rw", db.favorites, db.syncQueue, async () => {
        await db.favorites.put(record);
        await db.syncQueue.put(queue);
      });
    },
    async deleteFavorite(id: string, queue: SyncQueueRecord) {
      await db.transaction("rw", db.favorites, db.syncQueue, async () => {
        await db.favorites.delete(id);
        await db.syncQueue.put(queue);
      });
    },
    async saveSettings(record: AppSettings, queue: SyncQueueRecord) {
      await db.transaction("rw", db.settings, db.syncQueue, async () => {
        await db.settings.put(record);
        await db.syncQueue.put(queue);
      });
    },
  };
}

interface RestorePayload {
  techniques: Technique[];
  prompts: SavedPrompt[];
  media: MediaRecord[];
  settings: AppSettings | null;
}

export async function restoreBackup(db: FrameCraftDb, payload: RestorePayload, mode: "merge" | "replace") {
  await db.transaction("rw", db.techniques, db.prompts, db.media, db.settings, async () => {
    if (mode === "replace") {
      await Promise.all([db.techniques.clear(), db.prompts.clear(), db.media.clear(), db.settings.clear()]);
    }

    for (const record of payload.techniques) {
      const current = await db.techniques.get(record.id);
      if (!current || mode === "replace" || current.updatedAt < record.updatedAt) await db.techniques.put(record);
    }
    for (const record of payload.prompts) {
      const current = await db.prompts.get(record.id);
      if (!current || mode === "replace" || current.updatedAt < record.updatedAt) await db.prompts.put(record);
    }
    for (const record of payload.media) {
      const current = await db.media.get(record.id);
      if (!current || mode === "replace" || current.updatedAt < record.updatedAt) await db.media.put(record);
    }
    if (payload.settings) {
      const current = await db.settings.get("app");
      if (!current || mode === "replace" || current.updatedAt < payload.settings.updatedAt) {
        await db.settings.put(payload.settings);
      }
    }
  });
}

export const frameCraftDb = createFrameCraftDb();
export const techniqueRepository = createTechniqueRepository(frameCraftDb);
export const promptRepository = createPromptRepository(frameCraftDb);
export const mediaRepository = createMediaRepository(frameCraftDb);
export const settingsRepository = createSettingsRepository(frameCraftDb);
export const syncQueueRepository = createSyncQueueRepository(frameCraftDb);
export const syncConflictRepository = createSyncConflictRepository(frameCraftDb);
export const syncMetadataRepository = createSyncMetadataRepository(frameCraftDb);
export const favoriteRepository = createFavoriteRepository(frameCraftDb);
export const ownerMutationRepository = createOwnerMutationRepository(frameCraftDb);
