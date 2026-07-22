import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OwnerAuthPanel } from "../app/framecraft/OwnerAuthPanel";
import { SyncStatus } from "../app/framecraft/SyncStatus";
import type { AuthRepository, OwnerSession } from "../app/framecraft/cloud/contracts";

function createRepository(session: OwnerSession): AuthRepository {
  return {
    getSession: vi.fn().mockResolvedValue(session),
    signIn: vi.fn().mockResolvedValue(session),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    linkGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue(() => undefined),
  };
}

describe("owner auth panel", () => {
  it("validates the Thai login form and has no public sign-up action", async () => {
    const user = userEvent.setup();
    render(
      <OwnerAuthPanel
        repository={createRepository({ state: "signed-out" })}
        initialSession={{ state: "signed-out" }}
        origin="https://frame.test"
      />,
    );

    await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));

    expect(screen.getByText("กรุณากรอกอีเมลและรหัสผ่าน")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /สมัคร/ })).not.toBeInTheDocument();
  });

  it("lets the owner link Google and sign out", async () => {
    const user = userEvent.setup();
    const session: OwnerSession = {
      state: "owner",
      userId: "owner-id",
      email: "owner@example.com",
    };
    const repository = createRepository(session);
    render(
      <OwnerAuthPanel
        repository={repository}
        initialSession={session}
        origin="https://frame.test"
      />,
    );

    await user.click(screen.getByRole("button", { name: "เชื่อม Google" }));
    await user.click(screen.getByRole("button", { name: "ออกจากระบบ" }));

    expect(repository.linkGoogle).toHaveBeenCalledWith("https://frame.test");
    expect(repository.signOut).toHaveBeenCalledOnce();
  });

  it("keeps a signed-in non-owner in viewer mode", () => {
    const session: OwnerSession = {
      state: "viewer",
      userId: "viewer-id",
      email: "viewer@example.com",
    };
    render(
      <OwnerAuthPanel
        repository={createRepository(session)}
        initialSession={session}
        origin="https://frame.test"
      />,
    );

    expect(screen.getByText("บัญชีนี้ไม่มีสิทธิ์จัดการ Library")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เชื่อม Google" })).not.toBeInTheDocument();
  });
});

describe("sync status", () => {
  it.each([
    ["connected", "Cloud Connected"],
    ["syncing", "Syncing"],
    ["offline", "Offline — waiting to sync"],
    ["needs-review", "Needs review"],
  ] as const)("renders %s state", (state, label) => {
    render(
      <SyncStatus
        snapshot={{
          state,
          pendingCount: 2,
          conflictCount: state === "needs-review" ? 1 : 0,
          lastSyncedAt: "2026-07-22T00:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText("รอซิงก์ 2 รายการ")).toBeInTheDocument();
  });
});
