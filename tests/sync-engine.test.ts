import { describe, expect, it, vi } from "vitest";
import { createSyncEngine } from "../app/framecraft/cloud/sync-engine";
import type {
  OwnerSession,
  SyncApplyResult,
  SyncStatusSnapshot,
} from "../app/framecraft/cloud/contracts";
import type {
  SyncConflictRecord,
  SyncMetadataRecord,
  SyncQueueRecord,
} from "../app/framecraft/types";

function operation(id: string, createdAt: string): SyncQueueRecord {
  return {
    operationId: id,
    userId: "11111111-1111-4111-8111-111111111111",
    entity: "technique",
    entityId: `technique-${id}`,
    action: "upsert",
    baseVersion: 1,
    payload: { title_en: id },
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
  };
}

function createHarness(options: {
  online?: boolean;
  session?: OwnerSession;
  queue?: SyncQueueRecord[];
  apply?: (record: SyncQueueRecord) => Promise<SyncApplyResult>;
} = {}) {
  const queue = [...(options.queue ?? [])].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const conflicts: SyncConflictRecord[] = [];
  const metadata: SyncMetadataRecord[] = [];
  const refresh = vi.fn().mockResolvedValue(undefined);
  const apply = vi.fn(
    options.apply ??
      (async () => ({ status: "applied", version: 2 }) as SyncApplyResult),
  );
  const states: SyncStatusSnapshot[] = [];
  const engine = createSyncEngine({
    queue: {
      async peek() {
        return queue[0] ?? null;
      },
      async remove(operationId) {
        const index = queue.findIndex((item) => item.operationId === operationId);
        if (index >= 0) queue.splice(index, 1);
      },
      async enqueue(record) {
        const index = queue.findIndex(
          (item) => item.operationId === record.operationId,
        );
        if (index >= 0) queue[index] = record;
        else queue.push(record);
        queue.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },
      async count() {
        return queue.length;
      },
    },
    conflicts: {
      async save(record) {
        conflicts.push(record);
      },
      async count() {
        return conflicts.length;
      },
    },
    metadata: {
      async save(record) {
        metadata.push(record);
      },
    },
    refresh,
    apply,
    getSession: async () =>
      options.session ?? {
        state: "owner",
        userId: "11111111-1111-4111-8111-111111111111",
        email: "owner@example.com",
      },
    isOnline: () => options.online ?? true,
    now: () => "2026-07-22T00:00:00.000Z",
  });
  engine.subscribeStatus((state) => states.push(state));
  return { engine, queue, conflicts, metadata, refresh, apply, states };
}

describe("sync engine", () => {
  it("refreshes online and processes the oldest queued operation first", async () => {
    const later = operation("later", "2026-07-22T02:00:00.000Z");
    const earlier = operation("earlier", "2026-07-22T01:00:00.000Z");
    const harness = createHarness({ queue: [later, earlier] });

    await harness.engine.start();

    expect(harness.refresh).toHaveBeenCalledOnce();
    expect(harness.apply.mock.calls.map(([record]) => record.operationId)).toEqual([
      "earlier",
      "later",
    ]);
    expect(harness.queue).toHaveLength(0);
    expect(harness.states.at(-1)).toMatchObject({
      state: "connected",
      pendingCount: 0,
      lastSyncedAt: "2026-07-22T00:00:00.000Z",
    });
  });

  it("preserves queued data while offline", async () => {
    const record = operation("offline", "2026-07-22T01:00:00.000Z");
    const harness = createHarness({ online: false, queue: [record] });

    await harness.engine.syncNow();

    expect(harness.apply).not.toHaveBeenCalled();
    expect(harness.queue).toEqual([record]);
    expect(harness.states.at(-1)).toMatchObject({
      state: "offline",
      pendingCount: 1,
    });
  });

  it("keeps a failed operation and retries the same operation ID", async () => {
    const record = operation("retry", "2026-07-22T01:00:00.000Z");
    let attempt = 0;
    const harness = createHarness({
      queue: [record],
      apply: async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("network unavailable");
        return { status: "applied", version: 2 };
      },
    });

    await harness.engine.syncNow();
    await harness.engine.syncNow();

    expect(harness.apply.mock.calls.map(([item]) => item.operationId)).toEqual([
      "retry",
      "retry",
    ]);
    expect(harness.queue).toHaveLength(0);
  });

  it("moves version conflicts to review without overwriting cloud data", async () => {
    const record = operation("conflict", "2026-07-22T01:00:00.000Z");
    const harness = createHarness({
      queue: [record],
      apply: async () => ({
        status: "conflict",
        cloudVersion: 4,
        cloudPayload: { title_en: "Cloud version" },
      }),
    });

    await harness.engine.syncNow();

    expect(harness.queue).toHaveLength(0);
    expect(harness.conflicts).toHaveLength(1);
    expect(harness.conflicts[0]).toMatchObject({
      operationId: "conflict",
      cloudVersion: 4,
    });
    expect(harness.states.at(-1)?.state).toBe("needs-review");
  });

  it("pauses cloud work when there is no owner session", async () => {
    const record = operation("signed-out", "2026-07-22T01:00:00.000Z");
    const harness = createHarness({
      queue: [record],
      session: { state: "signed-out" },
    });

    await harness.engine.syncNow();

    expect(harness.apply).not.toHaveBeenCalled();
    expect(harness.queue).toEqual([record]);
  });
});
