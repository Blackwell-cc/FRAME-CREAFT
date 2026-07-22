import Dexie from "dexie";
import { Blob as NodeBlob } from "node:buffer";
import { describe, expect, it } from "vitest";
import { starterTechniques } from "../app/framecraft/seed-data";
import {
  createFrameCraftDb,
  createOwnerMutationRepository,
  createSyncQueueRepository,
} from "../app/framecraft/storage";
import type {
  MediaRecord,
  SyncQueueRecord,
  Technique,
} from "../app/framecraft/types";

function queueRecord(
  operationId: string,
  createdAt: string,
): SyncQueueRecord {
  return {
    operationId,
    userId: "11111111-1111-4111-8111-111111111111",
    entity: "technique",
    entityId: "shot-close-up",
    action: "upsert",
    baseVersion: 1,
    payload: { title_en: "Close-Up" },
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("offline sync storage", () => {
  it("upgrades a v1 database without losing an edited technique or image Blob", async () => {
    const name = `framecraft-upgrade-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      techniques: "id, slug, category, sourceType, isFavorite, isHidden, updatedAt, *tags, *moods",
      prompts: "id, mode, platform, isFavorite, updatedAt",
      media: "id, techniqueId, updatedAt",
      settings: "id",
      meta: "key",
    });
    await legacy.open();
    const edited: Technique = {
      ...starterTechniques.find((item) => item.id === "shot-close-up")!,
      titleTh: "แก้ไขในเครื่อง",
    };
    const media: MediaRecord = {
      id: "media-close-up",
      techniqueId: "shot-close-up",
      blob: new NodeBlob(["image"], { type: "image/webp" }) as unknown as Blob,
      mimeType: "image/webp",
      width: 1200,
      height: 800,
      byteSize: 5,
      altTh: "ภาพตัวอย่าง",
      altEn: "Reference",
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T00:00:00.000Z",
    };
    await legacy.table<Technique>("techniques").put(edited);
    await legacy.table<MediaRecord>("media").put(media);
    legacy.close();

    const upgraded = createFrameCraftDb(name);
    await upgraded.open();

    expect((await upgraded.techniques.get("shot-close-up"))?.titleTh).toBe(
      "แก้ไขในเครื่อง",
    );
    const upgradedMedia = await upgraded.media.get("media-close-up");
    expect(upgradedMedia?.blob.size).toBe(5);
    expect(upgradedMedia?.blob.type).toBe("image/webp");
    expect(upgraded.tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        "syncQueue",
        "syncConflicts",
        "syncMetadata",
        "favorites",
      ]),
    );
    upgraded.close();
    await Dexie.delete(name);
  });

  it("writes a local technique and queue entry atomically and lists FIFO", async () => {
    const db = createFrameCraftDb(`framecraft-queue-${crypto.randomUUID()}`);
    const repository = createSyncQueueRepository(db);
    const latest = queueRecord(
      "22222222-2222-4222-8222-222222222222",
      "2026-07-21T02:00:00.000Z",
    );
    const earliest = queueRecord(
      "33333333-3333-4333-8333-333333333333",
      "2026-07-21T01:00:00.000Z",
    );
    const edited = {
      ...starterTechniques.find((item) => item.id === "shot-close-up")!,
      titleTh: "บันทึกแบบ Offline",
    };

    await repository.enqueue(latest);
    await repository.saveTechniqueAndEnqueue(edited, earliest);

    expect((await db.techniques.get("shot-close-up"))?.titleTh).toBe(
      "บันทึกแบบ Offline",
    );
    expect((await repository.list()).map((item) => item.operationId)).toEqual([
      earliest.operationId,
      latest.operationId,
    ]);
    db.close();
    await Dexie.delete(db.name);
  });

  it("stores private owner changes together with their cloud operations", async () => {
    const db = createFrameCraftDb(`framecraft-owner-${crypto.randomUUID()}`);
    const mutations = createOwnerMutationRepository(db);
    const queue = queueRecord(
      "44444444-4444-4444-8444-444444444444",
      "2026-07-21T03:00:00.000Z",
    );
    const favorite = {
      id: `${queue.userId}:technique:shot-close-up`,
      userId: queue.userId,
      entityType: "technique" as const,
      entityId: "shot-close-up",
      createdAt: queue.createdAt,
    };

    await mutations.saveFavorite(favorite, { ...queue, entity: "favorite", payload: favorite });

    await expect(db.favorites.get(favorite.id)).resolves.toEqual(favorite);
    await expect(db.syncQueue.get(queue.operationId)).resolves.toMatchObject({
      entity: "favorite",
      entityId: "shot-close-up",
    });
    db.close();
    await Dexie.delete(db.name);
  });
});
