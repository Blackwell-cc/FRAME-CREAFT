import { Check, Copy, RotateCcw, Save, X } from "lucide-react";
import { composePrompt, platformPresets } from "./prompt-composer";
import type { PlatformPresetId, PromptInput, Technique } from "./types";

interface PromptPanelProps {
  input: PromptInput;
  selected: Technique[];
  outputOverride: string;
  onInput: (changes: Partial<PromptInput>) => void;
  onOutput: (value: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
  onSave: () => void;
  compact?: boolean;
}

export function PromptPanel({ input, selected, outputOverride, onInput, onOutput, onRemove, onReset, onSave, compact }: PromptPanelProps) {
  const generated = composePrompt(input);
  const output = outputOverride || generated.prompt;
  const presets = platformPresets.filter((preset) => preset.mode === input.mode);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const textarea = document.querySelector<HTMLTextAreaElement>("#generated-prompt");
      textarea?.focus();
      textarea?.select();
    }
  }

  return (
    <aside className={`prompt-panel ${compact ? "prompt-panel--compact" : ""}`} aria-label="Prompt Lab">
      <div className="prompt-panel__head">
        <div><span className="kicker">LIVE PROMPT STACK</span><h2>Prompt Lab</h2></div>
        <div className="mode-toggle" aria-label="ประเภท Prompt">
          <button className={input.mode === "image" ? "is-active" : ""} onClick={() => onInput({ mode: "image", platform: "generic-image" })}>Image</button>
          <button className={input.mode === "video" ? "is-active" : ""} onClick={() => onInput({ mode: "video", platform: "generic-video" })}>Video</button>
        </div>
      </div>

      <label className="field"><span>ตัวแบบ</span><input aria-label="ตัวแบบ" value={input.subject} onChange={(event) => onInput({ subject: event.target.value })} placeholder="เช่น a Thai film director" /></label>
      <div className="field-grid">
        <label className="field"><span>การกระทำ</span><input value={input.action} onChange={(event) => onInput({ action: event.target.value })} placeholder="reviewing a monitor" /></label>
        <label className="field"><span>สถานที่</span><input value={input.environment} onChange={(event) => onInput({ environment: event.target.value })} placeholder="on a production set" /></label>
      </div>

      <div className="selected-stack">
        <div className="section-label"><span>SELECTED / {String(selected.length).padStart(2, "0")}</span><button onClick={onReset}><RotateCcw size={13} /> Reset</button></div>
        {selected.length ? selected.map((technique) => (
          <div className="stack-item" key={technique.id}>
            <span><small>{technique.category.replaceAll("-", " ")}</small>{technique.titleEn}</span>
            <button aria-label={`นำ ${technique.titleEn} ออกจาก Prompt`} onClick={() => onRemove(technique.id)}><X size={14} /></button>
          </div>
        )) : <p className="stack-empty">เลือกการ์ดจาก Library เพื่อเริ่มประกอบ Prompt</p>}
      </div>

      <label className="field">
        <span>แพลตฟอร์ม</span>
        <select aria-label="แพลตฟอร์ม" value={input.platform} onChange={(event) => onInput({ platform: event.target.value as PlatformPresetId })}>
          {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
        </select>
      </label>
      {input.mode === "video" && <div className="field-grid"><label className="field"><span>Duration</span><input value={input.duration} onChange={(event) => onInput({ duration: event.target.value })} placeholder="8 seconds" /></label><label className="field"><span>Pacing</span><input value={input.pacing} onChange={(event) => onInput({ pacing: event.target.value })} placeholder="slow, controlled" /></label></div>}

      <label className="field output-field"><span>GENERATED PROMPT</span><textarea id="generated-prompt" aria-label="Generated prompt" value={output} onChange={(event) => onOutput(event.target.value)} rows={7} /></label>
      <div className="prompt-actions">
        <button onClick={copyPrompt}><Copy size={15} /> Copy Prompt</button>
        <button className="primary-button" onClick={onSave}><Save size={15} /> Save</button>
      </div>
      <div className="privacy-note"><Check size={13} /> ข้อมูลและ Prompt อยู่ในอุปกรณ์นี้</div>
    </aside>
  );
}
