import type {
  OwnerSession,
  SyncApplyResult,
  SyncStatusSnapshot,
} from "./contracts";
import type {
  SyncConflictRecord,
  SyncMetadataRecord,
  SyncQueueRecord,
} from "../types";

interface QueueBoundary {
  peek(): Promise<SyncQueueRecord | null>;
  remove(operationId: string): Promise<void>;
  enqueue(record: SyncQueueRecord): Promise<unknown>;
  count(): Promise<number>;
}

interface ConflictBoundary {
  save(record: SyncConflictRecord): Promise<unknown>;
  count(): Promise<number>;
}

interface MetadataBoundary {
  save(record: SyncMetadataRecord): Promise<unknown>;
}

export interface SyncEngineDependencies {
  queue: QueueBoundary;
  conflicts: ConflictBoundary;
  metadata: MetadataBoundary;
  refresh(): Promise<void>;
  apply(record: SyncQueueRecord): Promise<SyncApplyResult>;
  getSession(): Promise<OwnerSession>;
  isOnline(): boolean;
  now(): string;
}

export function createSyncEngine(dependencies: SyncEngineDependencies) {
  const listeners = new Set<(snapshot: SyncStatusSnapshot) => void>();
  let current: SyncStatusSnapshot = {
    state: "connected",
    pendingCount: 0,
    conflictCount: 0,
    lastSyncedAt: null,
  };
  let processing: Promise<void> | null = null;

  function publish(next: SyncStatusSnapshot) {
    current = next;
    for (const listener of listeners) listener(next);
  }

  async function counts() {
    return {
      pendingCount: await dependencies.queue.count(),
      conflictCount: await dependencies.conflicts.count(),
    };
  }

  async function runSync() {
    const currentCounts = await counts();
    if (!dependencies.isOnline()) {
      publish({ ...current, ...currentCounts, state: "offline" });
      return;
    }

    const session = await dependencies.getSession();
    if (session.state !== "owner") {
      publish({ ...current, ...currentCounts, state: "connected" });
      return;
    }

    publish({ ...current, ...currentCounts, state: "syncing" });
    while (true) {
      const record = await dependencies.queue.peek();
      if (!record) break;

      try {
        const result = await dependencies.apply(record);
        if (result.status === "conflict") {
          await dependencies.conflicts.save({
            ...record,
            cloudPayload: result.cloudPayload,
            cloudVersion: result.cloudVersion,
            detectedAt: dependencies.now(),
          });
        }
        await dependencies.queue.remove(record.operationId);
      } catch {
        await dependencies.queue.enqueue({
          ...record,
          attempts: record.attempts + 1,
          updatedAt: dependencies.now(),
        });
        const failedCounts = await counts();
        publish({ ...current, ...failedCounts, state: "connected" });
        return;
      }
    }

    const syncedAt = dependencies.now();
    await dependencies.metadata.save({
      key: "last-synced-at",
      value: syncedAt,
      updatedAt: syncedAt,
    });
    const completeCounts = await counts();
    publish({
      state: completeCounts.conflictCount > 0 ? "needs-review" : "connected",
      ...completeCounts,
      lastSyncedAt: syncedAt,
    });
  }

  function syncNow() {
    if (processing) return processing;
    processing = runSync().finally(() => {
      processing = null;
    });
    return processing;
  }

  return {
    async start() {
      const session = await dependencies.getSession();
      if (dependencies.isOnline() && session.state === "owner") {
        try {
          await dependencies.refresh();
        } catch {
          const currentCounts = await counts();
          publish({ ...current, ...currentCounts, state: "connected" });
          return;
        }
      }
      await syncNow();
    },
    syncNow,
    subscribeStatus(listener: (snapshot: SyncStatusSnapshot) => void) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
    getStatus() {
      return current;
    },
  };
}
