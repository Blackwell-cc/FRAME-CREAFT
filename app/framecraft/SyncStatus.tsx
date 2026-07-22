import type { SyncStatusSnapshot } from "./cloud/contracts";

const statusLabels: Record<SyncStatusSnapshot["state"], string> = {
  connected: "Cloud Connected",
  syncing: "Syncing",
  offline: "Offline — waiting to sync",
  "needs-review": "Needs review",
};

export function SyncStatus({ snapshot }: { snapshot: SyncStatusSnapshot }) {
  return (
    <aside className={`sync-status sync-status--${snapshot.state}`} aria-live="polite">
      <span className="sync-status__signal" aria-hidden="true" />
      <div>
        <strong>{statusLabels[snapshot.state]}</strong>
        <p>รอซิงก์ {snapshot.pendingCount} รายการ</p>
        {snapshot.conflictCount > 0 ? (
          <p>ต้องตรวจสอบ {snapshot.conflictCount} รายการ</p>
        ) : null}
        {snapshot.lastSyncedAt ? (
          <time dateTime={snapshot.lastSyncedAt}>
            ซิงก์ล่าสุด {new Date(snapshot.lastSyncedAt).toLocaleString("th-TH")}
          </time>
        ) : null}
      </div>
    </aside>
  );
}
