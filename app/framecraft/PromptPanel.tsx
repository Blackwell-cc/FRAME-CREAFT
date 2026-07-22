import { Check, RotateCcw, Save, Sparkles, X } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { platformPresets } from "./prompt-composer";
import type { PromptSession } from "./prompt-session";
import type {
  OutputLanguage,
  PlatformPresetId,
  PromptComposition,
  PromptInput,
  PromptMode,
  Technique,
} from "./types";

interface PromptPanelProps {
  input: PromptInput;
  selected: Technique[];
  composition: PromptComposition;
  session: PromptSession;
  outputLanguage: OutputLanguage;
  selectionWarning: string;
  onFieldChange: (changes: Partial<PromptInput>, reason: string) => void;
  onModeChange: (mode: PromptMode) => void;
  onLanguageChange: (language: OutputLanguage) => void;
  onOutputEdit: (value: string) => void;
  onRegenerate: () => void;
  onRemove: (id: string) => void;
  onReset: () => void;
  onSave: () => void;
  canUseAi: boolean;
  aiStatus: "idle" | "loading" | "preview" | "error";
  aiError: string;
  onAnalyze: () => void;
  compact?: boolean;
}

const warningLabels: Record<string, string> = {
  "missing-subject": "ยังไม่ได้ระบุตัวแบบ",
  "missing-action": "ยังไม่ได้ระบุการกระทำ",
  "missing-environment": "ยังไม่ได้ระบุสถานที่",
};

export function PromptPanel({
  input,
  selected,
  composition,
  session,
  outputLanguage,
  selectionWarning,
  onFieldChange,
  onModeChange,
  onLanguageChange,
  onOutputEdit,
  onRegenerate,
  onRemove,
  onReset,
  onSave,
  canUseAi,
  aiStatus,
  aiError,
  onAnalyze,
  compact,
}: PromptPanelProps) {
  const presets = platformPresets.filter((preset) => preset.mode === input.mode);
  const durationInvalid = composition.warnings.includes("invalid-duration");
  const completenessWarnings = composition.warnings
    .map((warning) => warningLabels[warning])
    .filter((warning): warning is string => Boolean(warning));

  function selectGeneratedPrompt() {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      "#generated-prompt",
    );
    textarea?.focus();
    textarea?.select();
  }

  return (
    <aside
      className={`prompt-panel ${compact ? "prompt-panel--compact" : ""}`}
      aria-label="Prompt Lab"
    >
      <div className="prompt-panel__head">
        <div>
          <span className="kicker">LIVE PROMPT STACK</span>
          <h2>Prompt Lab</h2>
        </div>
        <div className="mode-toggle" aria-label="ประเภท Prompt">
          <button
            type="button"
            className={input.mode === "image" ? "is-active" : ""}
            onClick={() => onModeChange("image")}
          >
            Image
          </button>
          <button
            type="button"
            className={input.mode === "video" ? "is-active" : ""}
            onClick={() => onModeChange("video")}
          >
            Video
          </button>
        </div>
      </div>

      <label className="field">
        <span>ตัวแบบ</span>
        <input
          aria-label="ตัวแบบ"
          value={input.subject}
          onChange={(event) => onFieldChange(
            { subject: event.target.value },
            "subject",
          )}
          placeholder="เช่น a Thai film director"
        />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>การกระทำ</span>
          <input
            aria-label="การกระทำ"
            value={input.action}
            onChange={(event) => onFieldChange(
              { action: event.target.value },
              "action",
            )}
            placeholder="reviewing a monitor"
          />
        </label>
        <label className="field">
          <span>สถานที่</span>
          <input
            aria-label="สถานที่"
            value={input.environment}
            onChange={(event) => onFieldChange(
              { environment: event.target.value },
              "environment",
            )}
            placeholder="on a production set"
          />
        </label>
      </div>

      <div className="selected-stack">
        <div className="section-label">
          <span>SELECTED / {String(selected.length).padStart(2, "0")}</span>
          <button type="button" onClick={onReset}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>
        {selected.length ? selected.map((technique) => (
          <div className="stack-item" key={technique.id}>
            <span>
              <small>{technique.category.replaceAll("-", " ")}</small>
              {technique.titleEn}
            </span>
            <button
              type="button"
              aria-label={`นำ ${technique.titleEn} ออกจาก Prompt`}
              onClick={() => onRemove(technique.id)}
            >
              <X size={14} />
            </button>
          </div>
        )) : (
          <p className="stack-empty">
            เลือกการ์ดจาก Library เพื่อเริ่มประกอบ Prompt
          </p>
        )}
      </div>

      {selectionWarning ? (
        <div className="prompt-warning" role="alert">
          {selectionWarning}
        </div>
      ) : null}

      <div className="field-grid output-language">
        <label className="field">
          <span>แพลตฟอร์ม</span>
          <select
            aria-label="แพลตฟอร์ม"
            value={input.platform}
            onChange={(event) => onFieldChange(
              { platform: event.target.value as PlatformPresetId },
              "platform",
            )}
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>{preset.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>ภาษาผลลัพธ์</span>
          <select
            aria-label="ภาษาผลลัพธ์"
            value={outputLanguage}
            onChange={(event) => onLanguageChange(
              event.target.value as OutputLanguage,
            )}
          >
            <option value="en">English</option>
            <option value="th">ภาษาไทย</option>
          </select>
        </label>
      </div>

      {input.mode === "video" ? (
        <div className="field-grid">
          <label className="field">
            <span>Duration</span>
            <input
              aria-label="Duration"
              inputMode="numeric"
              pattern="[0-9]*"
              value={input.duration}
              onChange={(event) => onFieldChange(
                { duration: event.target.value },
                "duration",
              )}
              placeholder="8"
            />
          </label>
          <label className="field">
            <span>Pacing</span>
            <input
              aria-label="Pacing"
              value={input.pacing}
              onChange={(event) => onFieldChange(
                { pacing: event.target.value },
                "pacing",
              )}
              placeholder="slow, controlled"
            />
          </label>
        </div>
      ) : null}

      {durationInvalid ? (
        <p className="field-error" role="alert">
          กรอก Duration เป็นตัวเลข 1–600 วินาที
        </p>
      ) : null}

      {completenessWarnings.length ? (
        <p className="prompt-completeness">
          {completenessWarnings.join(" · ")}
        </p>
      ) : null}

      {input.mode === "video" && composition.shots.length ? (
        <div className="shot-breakdown" aria-label="ลำดับช็อต">
          {composition.shots.map((shot) => (
            <article key={shot.index}>
              <small>SHOT {String(shot.index).padStart(2, "0")}</small>
              <strong>{shot.shotSize?.titleEn ?? "ยังไม่เลือกระยะภาพ"}</strong>
            </article>
          ))}
        </div>
      ) : null}

      <label className="field output-field">
        <span>GENERATED PROMPT</span>
        <textarea
          id="generated-prompt"
          aria-label="Generated prompt"
          value={session.value}
          onChange={(event) => onOutputEdit(event.target.value)}
          rows={7}
        />
      </label>

      {session.state === "stale" ? (
        <div className="prompt-state prompt-state--stale">
          <span>ข้อมูลมีการเปลี่ยนแปลง</span>
          <button type="button" onClick={onRegenerate}>สร้าง Prompt ใหม่</button>
        </div>
      ) : null}
      {session.state === "manual" || session.state === "ai-applied" ? (
        <div className="prompt-state prompt-state--manual">
          <span>{session.state === "manual" ? "แก้ไขเอง" : "AI Applied"}</span>
          <button type="button" onClick={onRegenerate}>
            คืนค่าผลลัพธ์อัตโนมัติ
          </button>
        </div>
      ) : null}

      {canUseAi ? (
        <div className="ai-analyze">
          <button
            type="button"
            className="ai-analyze__button"
            disabled={aiStatus === "loading"}
            onClick={onAnalyze}
          >
            <Sparkles size={15} />
            {aiStatus === "loading" ? "กำลังวิเคราะห์..." : "วิเคราะห์ด้วย AI"}
          </button>
          <small>AI จะสร้าง Preview ก่อน และยังไม่แก้ Prompt จนกว่าคุณจะยืนยัน</small>
        </div>
      ) : null}
      {aiError ? <p className="ai-error" role="alert">{aiError}</p> : null}

      <div className="prompt-actions">
        <CopyButton
          value={session.value}
          idleLabel="Copy Prompt"
          copiedLabel="Copied"
          onError={selectGeneratedPrompt}
        />
        <button type="button" className="primary-button" onClick={onSave}>
          <Save size={15} /> Save
        </button>
      </div>
      <div className="privacy-note">
        <Check size={13} /> ข้อมูลและ Prompt อยู่ในอุปกรณ์นี้
      </div>
    </aside>
  );
}
