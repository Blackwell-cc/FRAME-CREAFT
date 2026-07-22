"use client";

import { useEffect, useRef } from "react";
import type { AiOptimizeResult } from "./ai-optimizer";

interface AiPromptPreviewProps {
  result: AiOptimizeResult;
  onApply: () => void;
  onCancel: () => void;
}

export function AiPromptPreview({ result, onApply, onCancel }: AiPromptPreviewProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <div
        ref={dialogRef}
        className="ai-preview"
        role="dialog"
        aria-modal="true"
        aria-label="AI Prompt Preview"
        tabIndex={-1}
      >
        <header className="ai-preview__header">
          <div>
            <span className="kicker">OWNER AI OPTIMIZER</span>
            <h2>AI Prompt Preview</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="ปิด AI Prompt Preview">×</button>
        </header>

        <section>
          <h3>Prompt ที่ปรับแล้ว</h3>
          <p className="ai-preview__prompt">{result.optimizedPrompt}</p>
        </section>

        <div className="ai-preview__grid">
          <section>
            <h3>สิ่งที่ AI ปรับปรุง</h3>
            {result.improvements.length
              ? <ul>{result.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
              : <p>ไม่มีข้อเสนอเพิ่มเติม</p>}
          </section>
          <section>
            <h3>ข้อควรระวัง</h3>
            {result.warnings.length
              ? <ul>{result.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
              : <p>ไม่พบความขัดแย้งสำคัญ</p>}
          </section>
        </div>

        {result.shotBreakdown.length ? (
          <section>
            <h3>ลำดับช็อต</h3>
            <ol className="ai-preview__shots">
              {result.shotBreakdown.map((shot) => (
                <li key={shot.index}>
                  <strong>SHOT {String(shot.index).padStart(2, "0")}</strong>
                  <span>{shot.summary}</span>
                  <small>{shot.transition}</small>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <p className="ai-preview__meta">Model: {result.model} · AI จะไม่แทน Prompt จนกว่าคุณกดยืนยัน</p>
        <div className="ai-preview__actions">
          <button type="button" onClick={onCancel}>ยกเลิก</button>
          <button type="button" className="primary-button" onClick={onApply}>ใช้ผลลัพธ์นี้</button>
        </div>
      </div>
    </div>
  );
}
