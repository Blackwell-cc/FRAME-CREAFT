import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MigrationWizard } from "../app/framecraft/MigrationWizard";

const preflight = {
  phase: "backup-required" as const,
  counts: { techniques: 60, prompts: 2, media: 1, settings: 1 },
};

describe("migration wizard", () => {
  it("requires an owner session", () => {
    render(
      <MigrationWizard
        isOwner={false}
        service={{
          inspectMigration: vi.fn().mockResolvedValue(preflight),
          runMigration: vi.fn(),
          resumeMigration: vi.fn(),
        }}
      />,
    );
    expect(screen.getByText("เฉพาะเจ้าของเท่านั้นที่ย้ายข้อมูลได้")).toBeInTheDocument();
  });

  it("shows counts and does not claim success before verified completion", async () => {
    const user = userEvent.setup();
    const runMigration = vi.fn().mockResolvedValue({
      ...preflight,
      phase: "failed",
      errorCode: "READ_BACK_MISMATCH",
    });
    render(
      <MigrationWizard
        isOwner
        service={{
          inspectMigration: vi.fn().mockResolvedValue(preflight),
          runMigration,
          resumeMigration: vi.fn(),
        }}
      />,
    );

    expect(await screen.findByText("60 เทคนิค")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "ดาวน์โหลด Backup และเริ่มย้ายข้อมูล" }),
    );

    expect(runMigration).toHaveBeenCalledWith({ backupConfirmed: true });
    expect(screen.queryByText("ย้ายข้อมูลสำเร็จ")).not.toBeInTheDocument();
    expect(await screen.findByText("ตรวจข้อมูล Cloud ไม่ตรง กรุณาลองใหม่")).toBeInTheDocument();
  });
});
