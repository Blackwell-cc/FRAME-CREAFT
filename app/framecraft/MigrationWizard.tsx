"use client";

import { useEffect, useState } from "react";
import type { MigrationReport } from "./cloud/migration-service";

interface MigrationServiceBoundary {
  inspectMigration(): Promise<MigrationReport>;
  runMigration(options: { backupConfirmed: boolean }): Promise<MigrationReport>;
  resumeMigration(): Promise<MigrationReport>;
}

export function MigrationWizard({
  isOwner,
  service,
}: {
  isOwner: boolean;
  service: MigrationServiceBoundary;
}) {
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    void service.inspectMigration().then((value) => {
      if (active) setReport(value);
    });
    return () => { active = false; };
  }, [isOwner, service]);

  if (!isOwner) {
    return <p className="migration-wizard__denied">เฉพาะเจ้าของเท่านั้นที่ย้ายข้อมูลได้</p>;
  }

  async function run(resume = false) {
    setBusy(true);
    try {
      setReport(
        resume
          ? await service.resumeMigration()
          : await service.runMigration({ backupConfirmed: true }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="migration-wizard" aria-labelledby="migration-title">
      <p className="migration-wizard__eyebrow">VERIFIED CLOUD MIGRATION</p>
      <h2 id="migration-title">ย้ายข้อมูลขึ้น Cloud</h2>
      {report ? (
        <div className="migration-wizard__counts">
          <span>{report.counts.techniques} เทคนิค</span>
          <span>{report.counts.media} รูปภาพ</span>
          <span>{report.counts.prompts} Prompt</span>
          <span>{report.counts.settings} การตั้งค่า</span>
        </div>
      ) : <p>กำลังตรวจข้อมูลในเครื่อง…</p>}

      {report?.phase === "complete" ? <p role="status">ย้ายข้อมูลสำเร็จ</p> : null}
      {report?.phase === "failed" ? (
        <>
          <p role="alert">
            {report.errorCode === "READ_BACK_MISMATCH"
              ? "ตรวจข้อมูล Cloud ไม่ตรง กรุณาลองใหม่"
              : "ย้ายข้อมูลไม่สำเร็จ ข้อมูลในเครื่องยังปลอดภัย"}
          </p>
          <button type="button" disabled={busy} onClick={() => run(true)}>ลองใหม่</button>
        </>
      ) : null}
      {report && report.phase !== "complete" && report.phase !== "failed" ? (
        <button type="button" disabled={busy} onClick={() => run(false)}>
          {busy ? "กำลังสำรองและย้ายข้อมูล…" : "ดาวน์โหลด Backup และเริ่มย้ายข้อมูล"}
        </button>
      ) : null}
      <p className="migration-wizard__note">ระบบจะไม่ลบข้อมูล IndexedDB หลังการย้าย</p>
    </section>
  );
}
