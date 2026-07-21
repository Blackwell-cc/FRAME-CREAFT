"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AuthRepository, OwnerSession } from "./cloud/contracts";

interface OwnerAuthPanelProps {
  repository: AuthRepository;
  initialSession?: OwnerSession;
  origin: string;
}

export function OwnerAuthPanel({ repository, initialSession = { state: "signed-out" }, origin }: OwnerAuthPanelProps) {
  const [session, setSession] = useState<OwnerSession>(initialSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => repository.subscribe(setSession), [repository]);

  async function handleSignIn(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setMessage("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      setSession(await repository.signIn(email.trim(), password));
    } catch {
      setMessage("เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setMessage("กรุณากรอกอีเมลก่อนขอลิงก์ตั้งรหัสผ่านใหม่");
      return;
    }
    setBusy(true);
    try {
      await repository.sendPasswordReset(email.trim(), origin);
      setMessage("ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว กรุณาตรวจสอบอีเมล");
    } catch {
      setMessage("ไม่สามารถส่งลิงก์ได้ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await repository.signOut();
    setSession({ state: "signed-out" });
  }

  if (session.state === "owner") {
    return (
      <section className="owner-auth" aria-label="บัญชีเจ้าของ">
        <p className="owner-auth__eyebrow">OWNER ACCESS</p>
        <h2>เชื่อมต่อในฐานะเจ้าของ</h2>
        <p>{session.email}</p>
        <div className="owner-auth__actions">
          <button type="button" onClick={() => repository.linkGoogle(origin)}>เชื่อม Google</button>
          <button type="button" onClick={handleSignOut}>ออกจากระบบ</button>
        </div>
      </section>
    );
  }

  if (session.state === "viewer") {
    return (
      <section className="owner-auth" aria-label="บัญชีผู้ชม">
        <p className="owner-auth__eyebrow">VIEWER ACCESS</p>
        <h2>บัญชีนี้ไม่มีสิทธิ์จัดการ Library</h2>
        <p>คุณยังเปิดดูและคัดลอก Prompt ได้ตามปกติ</p>
        <button type="button" onClick={handleSignOut}>ออกจากระบบ</button>
      </section>
    );
  }

  return (
    <section className="owner-auth" aria-label="เข้าสู่ระบบเจ้าของ">
      <p className="owner-auth__eyebrow">PRIVATE OWNER ACCESS</p>
      <h2>เข้าสู่ระบบเจ้าของ</h2>
      <form onSubmit={handleSignIn}>
        <label>อีเมล<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>รหัสผ่าน<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {message ? <p role="status">{message}</p> : null}
        <div className="owner-auth__actions">
          <button type="submit" disabled={busy}>เข้าสู่ระบบ</button>
          <button type="button" disabled={busy} onClick={handlePasswordReset}>ลืมรหัสผ่าน</button>
        </div>
      </form>
    </section>
  );
}
