import { describe, expect, it } from "vitest";
import { createMigrationService } from "../app/framecraft/cloud/migration-service";
import { starterTechniques } from "../app/framecraft/seed-data";
import type { AppSettings, MediaRecord, SavedPrompt } from "../app/framecraft/types";

const now = "2026-07-22T00:00:00.000Z";
const technique = starterTechniques.find((item) => item.id === "shot-close-up")!;
const media: MediaRecord = {
  id: "media-close-up",
  techniqueId: technique.id,
  blob: new Blob(["image"], { type: "image/webp" }),
  mimeType: "image/webp",
  width: 1200,
  height: 800,
  byteSize: 5,
  altTh: "ภาพ Close-Up",
  altEn: "Close-Up",
  createdAt: now,
  updatedAt: now,
};
const prompt: SavedPrompt = {
  id: "prompt-1",
  name: "Prompt 1",
  mode: "image",
  platform: "generic-image",
  input: {
    mode: "image", platform: "generic-image", subject: "subject", action: "action",
    environment: "studio", shotSize: "close-up", angle: "eye-level", lens: "85mm",
    movement: "static", lighting: "soft", composition: "centered", mood: "calm",
    aspectRatio: "16:9", duration: "", pacing: "",
  },
  generatedPrompt: "generated",
  editedPrompt: "edited",
  isFavorite: false,
  createdAt: now,
  updatedAt: now,
};
const settings: AppSettings = {
  id: "app",
  language: "th",
  defaultMode: "image",
  defaultPlatform: "generic-image",
  updatedAt: now,
};

function createHarness(verifyMatches = true) {
  const events: string[] = [];
  const metadata = new Map<string, unknown>();
  const local = { techniques: [technique], prompts: [prompt], media: [media], settings };
  const service = createMigrationService({
    ownerUserId: "11111111-1111-4111-8111-111111111111",
    loadLocal: async () => local,
    createBackup: async () => {
      events.push("backup");
      return new Uint8Array([1, 2, 3]);
    },
    deliverBackup: async () => { events.push("deliver-backup"); },
    uploadMedia: async (record, storagePath) => {
      events.push(`media:${record.id}:${storagePath}`);
    },
    upsertMedia: async (record) => { events.push(`media-row:${record.id}`); },
    upsertTechnique: async (record) => { events.push(`technique:${record.id}`); },
    upsertPrompt: async (record, userId) => { events.push(`prompt:${record.id}:${userId}`); },
    saveSettings: async (_record, userId) => { events.push(`settings:${userId}`); },
    readBack: async () => ({
      techniqueIds: verifyMatches ? [technique.id] : [],
      promptIds: [prompt.id],
      mediaIds: [media.id],
      hasSettings: true,
    }),
    metadata: {
      async get(key) { return metadata.get(key); },
      async save(key, value) { metadata.set(key, value); },
    },
    now: () => now,
  });
  return { service, events, metadata };
}

describe("cloud migration service", () => {
  it("reports local counts and requires backup confirmation", async () => {
    const harness = createHarness();

    await expect(harness.service.inspectMigration()).resolves.toMatchObject({
      phase: "backup-required",
      counts: { techniques: 1, prompts: 1, media: 1, settings: 1 },
    });
    await expect(harness.service.runMigration({ backupConfirmed: false })).resolves.toMatchObject({
      phase: "backup-required",
    });
    expect(harness.events).toEqual([]);
  });

  it("backs up first, preserves stable IDs, and verifies before completion", async () => {
    const harness = createHarness();

    await expect(harness.service.runMigration({ backupConfirmed: true })).resolves.toMatchObject({
      phase: "complete",
      counts: { techniques: 1, prompts: 1, media: 1, settings: 1 },
    });

    expect(harness.events.slice(0, 2)).toEqual(["backup", "deliver-backup"]);
    expect(harness.events).toContain(`technique:${technique.id}`);
    expect(harness.events).toContain(
      "media:media-close-up:11111111-1111-4111-8111-111111111111/shot-close-up/media-close-up.webp",
    );
    expect(harness.events.indexOf(`technique:${technique.id}`)).toBeLessThan(
      harness.events.indexOf(`media-row:${media.id}`),
    );
    expect(harness.events).toContain(
      "prompt:prompt-1:11111111-1111-4111-8111-111111111111",
    );
    expect(harness.metadata.get("migration-complete")).toBe(true);
  });

  it("fails safely when cloud read-back does not match", async () => {
    const harness = createHarness(false);

    await expect(harness.service.runMigration({ backupConfirmed: true })).resolves.toMatchObject({
      phase: "failed",
      errorCode: "READ_BACK_MISMATCH",
    });
    expect(harness.metadata.get("migration-complete")).not.toBe(true);
  });

  it("can rerun idempotently after completion", async () => {
    const harness = createHarness();
    await harness.service.runMigration({ backupConfirmed: true });
    const callsAfterFirstRun = harness.events.length;

    await expect(harness.service.resumeMigration()).resolves.toMatchObject({ phase: "complete" });
    expect(harness.events).toHaveLength(callsAfterFirstRun);
  });
});
