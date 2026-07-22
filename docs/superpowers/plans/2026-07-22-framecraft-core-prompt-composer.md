# FRAME / CRAFT Core Prompt Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้าง Prompt Composer ฟรีที่บังคับกฎการเลือกการ์ดตาม Image/Video, วิเคราะห์ Subject/Action/Environment, สร้าง Video Shot Sequence, รองรับภาษาไทย/อังกฤษ และรักษา Manual Draft อย่างปลอดภัย

**Architecture:** แยกกฎ Selection, การประกอบ Prompt และสถานะ Draft เป็น Pure TypeScript Modules ที่ทดสอบแยกได้ แล้วให้ `FrameCraftApp` ทำหน้าที่ประสาน State/Confirmation และ `PromptPanel` แสดงผลเท่านั้น ข้อมูล Saved Prompt ใช้ Schema v2 ฝั่งแอป แต่บรรจุ Metadata เพิ่มในคอลัมน์ `input` JSONB เดิมภายใต้ `_framecraftV2` จึงไม่ต้องแก้ฐานข้อมูลหรือ RPC และยังอ่านข้อมูลเก่าได้

**Tech Stack:** TypeScript 5.9, React 19, Vitest 4, Testing Library, Dexie 4, Supabase JS 2, Vinext

## Global Constraints

- Image Mode เลือก `shot-size`, `camera-angle`, `camera-movement`, `lens`, `camera-settings` ได้หมวดละ 1 ใบ
- Image Mode เลือก `lighting` และ `composition` ได้หลายใบ
- Video Mode เลือกการ์ดหลายใบและรักษาลำดับการเพิ่ม โดย Shot Size แต่ละใบเริ่ม Shot ใหม่
- การ์ด ID เดิมซ้ำต้องถูกบล็อกทั้งสองโหมด
- Output Language มีเฉพาะ `th` และ `en`; ค่าเริ่มต้น `en`
- Duration รับจำนวนเต็ม 1–600 และแสดงหน่วย `seconds` หรือ `วินาที`
- Manual Prompt รวม Empty String เป็นค่าที่ถูกต้อง ห้ามเติมค่า Auto กลับเอง
- การเพิ่ม/ลบการ์ดหลัง Manual หรือ AI Applied ต้องยืนยันก่อน; การแก้ Field/Platform/Language เปลี่ยนเป็น Stale โดยไม่ถามทุกตัวอักษร
- Composer ต้องทำงานได้โดยไม่มี Network และไม่มี AI
- `emptyPrompt.mood` ต้องเป็น Empty String; ห้ามมี Default monochrome/film grain ตายตัว
- ห้ามเพิ่ม Dependency ใหม่ในแผน Core

---

## File Map

- Create `app/framecraft/prompt-selection.ts` — กฎเลือกการ์ดและการเปลี่ยนโหมด
- Create `app/framecraft/prompt-session.ts` — State machine ของ Auto/Manual/Stale/AI
- Modify `app/framecraft/types.ts` — Shared types และ Saved Prompt v2
- Rewrite `app/framecraft/prompt-composer.ts` — Structured Image/Video Composer
- Modify `app/framecraft/PromptPanel.tsx` — Controlled Prompt UI, ภาษา, Validation, Warning
- Modify `app/framecraft/FrameCraftApp.tsx` — Selection orchestration, Confirmation, Save/Open
- Modify `app/framecraft/cloud/contracts.ts` และ `app/framecraft/cloud/mappers.ts` — Cloud v1/v2 compatibility
- Modify `app/framecraft/storage.ts` และ `app/framecraft/backup-service.ts` — Upgrade ตอนอ่าน Local/Backup
- Modify `app/framecraft/framecraft.css` — State, Warning, Dialog และ Responsive UI
- Create `tests/prompt-selection.test.ts`, `tests/prompt-session.test.ts`, `tests/prompt-panel.test.tsx`
- Modify `tests/prompt-composer.test.ts`, `tests/app-flow.test.tsx`, `tests/prompt-repository.test.ts`, `tests/cloud-mappers.test.ts`, `tests/backup-service.test.ts`

### Task 1: Types และกฎ Selection

**Files:**
- Create: `app/framecraft/prompt-selection.ts`
- Modify: `app/framecraft/types.ts`
- Create: `tests/prompt-selection.test.ts`

**Interfaces:**
- Consumes: `PromptMode`, `Technique`, `TechniqueCategory`
- Produces: `OutputLanguage`, `PromptState`, `SelectionDecision`, `validateTechniqueSelection()`, `reconcileSelectionForMode()`

- [ ] **Step 1: เพิ่ม Failing Tests สำหรับกฎ Image, Video และ Duplicate**

```ts
import { describe, expect, it } from "vitest";
import { reconcileSelectionForMode, validateTechniqueSelection } from "../app/framecraft/prompt-selection";
import { starterTechniques } from "../app/framecraft/seed-data";

const technique = (id: string) => starterTechniques.find((item) => item.id === id)!;

describe("prompt selection", () => {
  it("blocks a second single-value image category", () => {
    const current = [technique("shot-close-up")];
    expect(validateTechniqueSelection("image", current, technique("shot-extreme-close-up"))).toMatchObject({
      allowed: false,
      reason: "single-category-limit",
      currentTechniqueId: "shot-close-up",
    });
  });

  it("allows multiple lighting and composition cards in image mode", () => {
    const lighting = starterTechniques.filter((item) => item.category === "lighting").slice(0, 2);
    expect(validateTechniqueSelection("image", [lighting[0]], lighting[1])).toEqual({ allowed: true });
  });

  it("allows distinct cards from the same category in video mode but blocks duplicate ids", () => {
    const current = [technique("shot-close-up")];
    expect(validateTechniqueSelection("video", current, technique("shot-extreme-close-up"))).toEqual({ allowed: true });
    expect(validateTechniqueSelection("video", current, technique("shot-close-up"))).toMatchObject({ allowed: false, reason: "duplicate" });
  });

  it("reports items removed when switching a video selection to image", () => {
    const selected = [technique("shot-close-up"), technique("shot-extreme-close-up")];
    expect(reconcileSelectionForMode("image", selected).removed.map((item) => item.id)).toEqual(["shot-extreme-close-up"]);
  });
});
```

- [ ] **Step 2: รัน Test และยืนยันว่า Fail เพราะ Module ยังไม่มี**

Run: `npm run test:unit -- tests/prompt-selection.test.ts`

Expected: FAIL ด้วยข้อความว่าไม่พบ `../app/framecraft/prompt-selection`

- [ ] **Step 3: เพิ่ม Types และ Pure Selection Rules**

```ts
// app/framecraft/types.ts
export type OutputLanguage = "th" | "en";
export type PromptState = "auto" | "manual" | "stale" | "ai-preview" | "ai-applied";

// app/framecraft/prompt-selection.ts
import type { PromptMode, Technique, TechniqueCategory } from "./types";

const imageSingleCategories = new Set<TechniqueCategory>([
  "shot-size", "camera-angle", "camera-movement", "lens", "camera-settings",
]);

export type SelectionDecision =
  | { allowed: true }
  | { allowed: false; reason: "duplicate" | "single-category-limit"; currentTechniqueId?: string };

export function validateTechniqueSelection(mode: PromptMode, current: Technique[], candidate: Technique): SelectionDecision {
  if (current.some((item) => item.id === candidate.id)) return { allowed: false, reason: "duplicate" };
  if (mode === "image" && imageSingleCategories.has(candidate.category)) {
    const existing = current.find((item) => item.category === candidate.category);
    if (existing) return { allowed: false, reason: "single-category-limit", currentTechniqueId: existing.id };
  }
  return { allowed: true };
}

export function reconcileSelectionForMode(mode: PromptMode, selected: Technique[]) {
  const kept: Technique[] = [];
  const removed: Technique[] = [];
  for (const item of selected) {
    const decision = validateTechniqueSelection(mode, kept, item);
    (decision.allowed ? kept : removed).push(item);
  }
  return { kept, removed };
}
```

- [ ] **Step 4: รัน Test ให้ผ่าน**

Run: `npm run test:unit -- tests/prompt-selection.test.ts`

Expected: PASS 4 tests

- [ ] **Step 5: Commit**

```powershell
git add app/framecraft/types.ts app/framecraft/prompt-selection.ts tests/prompt-selection.test.ts
git commit -m "feat: enforce prompt selection rules"
```

### Task 2: Structured Image/Video Composer

**Files:**
- Modify: `app/framecraft/types.ts`
- Rewrite: `app/framecraft/prompt-composer.ts`
- Modify: `app/framecraft/FrameCraftApp.tsx`
- Modify: `app/framecraft/PromptPanel.tsx`
- Modify: `tests/prompt-composer.test.ts`

**Interfaces:**
- Consumes: `PromptInput`, ordered `Technique[]`, `OutputLanguage`
- Produces: `PromptComposition`, `ShotBreakdown`, `composePrompt(request)`, `validateDuration(value)`

- [ ] **Step 1: เปลี่ยน Tests ให้ครอบคลุมภาษา, Label, Duration และ Shot Sequence**

```ts
const request = {
  input: { ...baseInput, subject: "a director", action: "reviews a monitor", environment: "in a studio" },
  selected: [closeUp, lowAngle, dollyIn, wideShot, eyeLevel],
  outputLanguage: "en" as const,
};

expect(composePrompt({ ...request, input: { ...request.input, mode: "image" }, selected: [closeUp, lowAngle] }).prompt)
  .toContain("Subject: a director; Action: reviews a monitor; Environment: in a studio");
expect(composePrompt({ ...request, input: { ...request.input, mode: "video", duration: "8" } }).prompt)
  .toContain("Duration: 8 seconds.");
expect(composePrompt(request).shots.map((shot) => shot.shotSize?.id)).toEqual(["shot-close-up", "shot-wide"]);
expect(composePrompt({ ...request, outputLanguage: "th" }).prompt).toContain("ระยะเวลา: 8 วินาที");
expect(validateDuration("0")).toEqual({ valid: false, messageTh: "กรอกระยะเวลา 1–600 วินาที" });
expect(composePrompt({ ...request, input: { ...request.input, subject: "" } }).warnings).toContain("missing-subject");
expect(composePrompt({ ...request, selected: [closeUp, lowAngle, eyeLevel] }).warnings).toContain("multiple-camera-angles-in-shot-1");
```

- [ ] **Step 2: รันเฉพาะ Composer Test ให้ Fail ด้วย Signature เดิม**

Run: `npm run test:unit -- tests/prompt-composer.test.ts`

Expected: FAIL เพราะ `composePrompt` ยังไม่รับ `selected`/`outputLanguage` และยังไม่มี `shots`

- [ ] **Step 3: เพิ่ม Structured Types ใน `types.ts` และ Composer API ใน `prompt-composer.ts`**

```ts
export interface ShotBreakdown {
  index: number;
  shotSize: Technique | null;
  techniques: Technique[];
  transition: "opening" | "then" | "meanwhile" | "finally";
  prompt: string;
}

export interface PromptComposition {
  prompt: string;
  negativePrompt: string;
  warnings: string[];
  shots: ShotBreakdown[];
}

export interface ComposePromptRequest {
  input: PromptInput;
  selected: Technique[];
  outputLanguage: OutputLanguage;
}
```

Implement `composePrompt(request)` โดยใช้ลำดับ:

```ts
const labels = outputLanguage === "th"
  ? { subject: "ตัวแบบ", action: "การกระทำ", environment: "สถานที่", duration: "ระยะเวลา", seconds: "วินาที" }
  : { subject: "Subject", action: "Action", environment: "Environment", duration: "Duration", seconds: "seconds" };

const semanticSubject = [
  input.subject && `${labels.subject}: ${clean(input.subject)}`,
  input.action && `${labels.action}: ${clean(input.action)}`,
  input.environment && `${labels.environment}: ${clean(input.environment)}`,
].filter(Boolean).join("; ");
```

`buildVideoShots(selected)` ต้องเริ่ม Shot แฝงเมื่อพบการ์ดที่ไม่ใช่ Shot Size ก่อน และเริ่ม Shot ใหม่ทุกครั้งเมื่อพบ Shot Size หลังจากนั้น ใช้ transition ตาม index: `opening`, `then`, `meanwhile`, `finally`; Shot สุดท้ายเมื่อมีมากกว่า 1 Shot ใช้ `finally`

`validateDuration()` ต้องใช้ Regex `^\d+$` และช่วง 1–600; Composer ไม่ใส่ Duration เมื่อ Invalid แต่เพิ่ม Warning

Composer ใช้ `selected` เป็นข้อมูลการ์ดหลัก; เมื่อ `selected` ว่างจึงใช้ค่า `shotSize`, `angle`, `lens`, `movement`, `lighting`, `composition`, `mood` เดิมเป็น Legacy Fallback สำหรับ Saved Prompt v1 เท่านั้น เพิ่ม Warning code ที่แน่นอนสำหรับ `missing-subject`, `missing-action`, `missing-environment`, `missing-shot-size` และหมวดค่าเดี่ยวที่ซ้ำภายใน Video Shot เช่น `multiple-camera-angles-in-shot-1`

ใน `FrameCraftApp.tsx` เปลี่ยนค่าเริ่มต้นจาก Mood ตายตัวเป็น:

```ts
const emptyPrompt: PromptInput = {
  mode: "image", platform: "generic-image", subject: "", action: "", environment: "",
  shotSize: "", angle: "", lens: "", movement: "", lighting: "", composition: "",
  mood: "", aspectRatio: "16:9", duration: "", pacing: "",
};
```

เพื่อให้แต่ละ Commit Build ได้ ให้เปลี่ยน Call site เดิมใน `PromptPanel` และ `savePrompt()` เป็น `composePrompt({ input, selected, outputLanguage: "en" })` ใน Task นี้ก่อน แล้ว Task 4 จึงเชื่อม Select ภาษาและ Prompt Session แบบเต็ม

- [ ] **Step 4: รัน Composer Tests ให้ผ่าน**

Run: `npm run test:unit -- tests/prompt-composer.test.ts`

Expected: PASS ทุกกรณี Image, Video, th/en, Duration และ Platform directives

- [ ] **Step 5: Commit**

```powershell
git add app/framecraft/types.ts app/framecraft/prompt-composer.ts tests/prompt-composer.test.ts
git commit -m "feat: compose structured image and video prompts"
```

### Task 3: Prompt Draft State Machine

**Files:**
- Create: `app/framecraft/prompt-session.ts`
- Create: `tests/prompt-session.test.ts`

**Interfaces:**
- Produces: `PromptSession`, `createPromptSession()`, `editPrompt()`, `markPromptStale()`, `replaceWithAutomaticPrompt()`, `applyAiPrompt()`

- [ ] **Step 1: เขียน Failing Tests สำหรับ Empty Manual และ Stale**

```ts
const automatic = createPromptSession("Auto prompt");
const emptyManual = editPrompt(automatic, "");
expect(emptyManual).toMatchObject({ state: "manual", value: "" });
expect(markPromptStale(emptyManual, "subject")).toMatchObject({ state: "stale", value: "", staleReasons: ["subject"] });
expect(replaceWithAutomaticPrompt(emptyManual, "New auto")).toMatchObject({ state: "auto", value: "New auto" });
expect(applyAiPrompt(automatic, "AI prompt", { model: "gemini", optimizedAt: "2026-07-22T00:00:00.000Z" }))
  .toMatchObject({ state: "ai-applied", value: "AI prompt" });
```

- [ ] **Step 2: รันและยืนยัน Fail**

Run: `npm run test:unit -- tests/prompt-session.test.ts`

Expected: FAIL เพราะ Module ยังไม่มี

- [ ] **Step 3: สร้าง State Machine แบบไม่ใช้ Falsy Fallback**

```ts
export interface PromptSession {
  state: PromptState;
  value: string;
  automaticPrompt: string;
  staleReasons: string[];
  aiMetadata?: { model: string; optimizedAt: string };
}

export const createPromptSession = (automaticPrompt: string): PromptSession => ({
  state: "auto", value: automaticPrompt, automaticPrompt, staleReasons: [],
});

export const editPrompt = (session: PromptSession, value: string): PromptSession => ({
  ...session, state: "manual", value, staleReasons: [], aiMetadata: undefined,
});

export function markPromptStale(session: PromptSession, reason: string): PromptSession {
  if (session.state === "auto") return session;
  return { ...session, state: "stale", staleReasons: [...new Set([...session.staleReasons, reason])] };
}
```

เพิ่ม `replaceWithAutomaticPrompt` ให้แทน `value` และ `automaticPrompt`; `applyAiPrompt` ต้องตั้ง `ai-applied` และไม่เปลี่ยนจนกว่าผู้ใช้กดใช้

- [ ] **Step 4: รัน Test ให้ผ่าน**

Run: `npm run test:unit -- tests/prompt-session.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add app/framecraft/prompt-session.ts tests/prompt-session.test.ts
git commit -m "feat: preserve manual prompt draft state"
```

### Task 4: เชื่อม State และ Selection เข้า FrameCraftApp

**Files:**
- Modify: `app/framecraft/FrameCraftApp.tsx`
- Modify: `app/framecraft/PromptPanel.tsx`
- Create: `tests/prompt-panel.test.tsx`
- Modify: `tests/app-flow.test.tsx`

**Interfaces:**
- Consumes: APIs จาก Tasks 1–3
- Produces: UI ที่บล็อก Selection, Confirmation, Manual/Stale, Restore Auto และ Output Language

- [ ] **Step 1: เพิ่ม Integration Tests**

```ts
it("keeps an empty manual prompt and marks it stale after field changes", async () => {
  const user = userEvent.setup();
  render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);
  const output = screen.getByLabelText("Generated prompt");
  await user.clear(output);
  expect(output).toHaveValue("");
  await user.type(screen.getByLabelText("ตัวแบบ"), "a director");
  expect(output).toHaveValue("");
  expect(screen.getByText("ข้อมูลมีการเปลี่ยนแปลง")).toBeInTheDocument();
});

it("blocks a second image shot size and explains why", async () => {
  // เพิ่ม Close-Up แล้วเพิ่ม Extreme Close-Up
  expect(screen.getByRole("alert")).toHaveTextContent("เลือกได้เพียง 1 รายการ");
  expect(screen.getByText("Close-Up")).toBeInTheDocument();
});

it("cancels a card mutation when a manual prompt would be replaced", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  // แก้ textarea แล้วกด Add
  expect(screen.queryByText(/SELECTED \/ 01/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: รัน Integration Tests และยืนยัน Fail**

Run: `npm run test:unit -- tests/prompt-panel.test.tsx tests/app-flow.test.tsx`

Expected: FAIL เพราะ UI ยังใช้ `outputOverride || generated.prompt`

- [ ] **Step 3: เปลี่ยน PromptPanel เป็น Controlled Session UI**

PromptPanel props ต้องเป็น:

```ts
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
  compact?: boolean;
}
```

Textarea ใช้ `value={session.value}` เท่านั้น เพิ่ม Select ภาษา, `role="alert"` สำหรับ Selection/Validation, Badge `แก้ไขเอง`/`ข้อมูลมีการเปลี่ยนแปลง`, ปุ่ม `สร้าง Prompt ใหม่` เมื่อ Stale และ `คืนค่าผลลัพธ์อัตโนมัติ` เมื่อ Manual/AI Applied

- [ ] **Step 4: เปลี่ยน FrameCraftApp ให้ Mutation เป็น Atomic**

แทน `outputOverride` ด้วย:

```ts
const composition = useMemo(
  () => composePrompt({ input: promptInput, selected, outputLanguage }),
  [promptInput, selected, outputLanguage],
);
const [promptSession, setPromptSession] = useState(() => createPromptSession(""));
```

`addToPrompt()` ต้องเรียก `validateTechniqueSelection`; ถ้าถูกบล็อกให้ตั้ง `selectionWarning` และไม่เปลี่ยน State ใด ๆ ถ้า Session เป็น Manual/Stale/AI Applied ให้ `window.confirm` ก่อน จากนั้นค่อยเปลี่ยน Selection และสร้าง Auto Prompt จากค่าถัดไปใน Action เดียว

`changeField()` ต้องเปลี่ยน Input แล้ว `markPromptStale`; ถ้า State เป็น Auto ให้ Effect อัปเดต Auto Prompt อัตโนมัติ ส่วน Manual/Stale คง `value` เดิม

`changeMode()` ต้องเรียก `reconcileSelectionForMode`; ถ้ามี removed หรือมี Manual Draft ให้ยืนยันครั้งเดียว ยกเลิกแล้ว State ทุกตัวต้องเหมือนเดิม

- [ ] **Step 5: รัน Component/Flow Tests ให้ผ่าน**

Run: `npm run test:unit -- tests/prompt-panel.test.tsx tests/app-flow.test.tsx`

Expected: PASS และไม่มี `act(...)` warning ใหม่

- [ ] **Step 6: Commit**

```powershell
git add app/framecraft/FrameCraftApp.tsx app/framecraft/PromptPanel.tsx tests/prompt-panel.test.tsx tests/app-flow.test.tsx
git commit -m "feat: integrate safe prompt editing workflow"
```

### Task 5: Saved Prompt v2 และ Backward Compatibility

**Files:**
- Modify: `app/framecraft/types.ts`
- Modify: `app/framecraft/FrameCraftApp.tsx`
- Modify: `app/framecraft/storage.ts`
- Modify: `app/framecraft/backup-service.ts`
- Modify: `app/framecraft/cloud/contracts.ts`
- Modify: `app/framecraft/cloud/mappers.ts`
- Create: `app/framecraft/saved-prompt-schema.ts`
- Modify: `tests/prompt-repository.test.ts`
- Modify: `tests/cloud-mappers.test.ts`
- Modify: `tests/backup-service.test.ts`

**Interfaces:**
- Produces: `SavedPromptV2`, `upgradeSavedPrompt(record)`, `_framecraftV2` Cloud JSON metadata

- [ ] **Step 1: เพิ่ม Compatibility Tests**

```ts
expect(upgradeSavedPrompt(legacyPrompt)).toMatchObject({
  schemaVersion: 2,
  selectedTechniqueIds: [],
  outputLanguage: "en",
  promptState: legacyPrompt.editedPrompt === legacyPrompt.generatedPrompt ? "auto" : "manual",
});

const row = toCloudSavedPrompt(v2Prompt, "owner-id");
expect(row.input._framecraftV2).toMatchObject({ schemaVersion: 2, outputLanguage: "th" });
expect(fromCloudSavedPrompt(row)).toEqual(v2Prompt);
```

- [ ] **Step 2: รัน Tests และยืนยัน Fail**

Run: `npm run test:unit -- tests/prompt-repository.test.ts tests/cloud-mappers.test.ts tests/backup-service.test.ts`

Expected: FAIL เพราะยังไม่มี v2 schema/upgrader

- [ ] **Step 3: เพิ่ม SavedPromptV2 และ Upgrader**

```ts
export interface SavedPromptV2 {
  schemaVersion: 2;
  id: string;
  name: string;
  mode: PromptMode;
  platform: PlatformPresetId;
  input: PromptInput;
  selectedTechniqueIds: string[];
  structuredDraft: PromptComposition;
  generatedPrompt: string;
  editedPrompt: string;
  outputLanguage: OutputLanguage;
  promptState: Exclude<PromptState, "ai-preview">;
  aiMetadata?: { model: string; optimizedAt: string };
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}
```

`upgradeSavedPrompt()` รับ `SavedPromptV1 | SavedPromptV2`; v1 ต้องสร้าง `structuredDraft` จากข้อความเดิมโดยใช้ `prompt`, `negativePrompt: ""`, `warnings: []`, `shots: []` และไม่เขียนกลับ DB ระหว่างอ่าน

- [ ] **Step 4: Pack v2 Metadata ใน JSONB เดิม**

```ts
input: {
  ...record.input,
  _framecraftV2: {
    schemaVersion: 2,
    selectedTechniqueIds: record.selectedTechniqueIds,
    structuredDraft: record.structuredDraft,
    outputLanguage: record.outputLanguage,
    promptState: record.promptState,
    aiMetadata: record.aiMetadata ?? null,
  },
}
```

`fromCloudSavedPrompt()` ต้องแยก `_framecraftV2` ออกจาก Input แล้วเรียก Upgrader; ไม่ต้องสร้าง Supabase Migration เพราะ RPC เดิมเก็บ `input` เป็น JSONB อยู่แล้ว

- [ ] **Step 5: Upgrade ตอนอ่าน Local และ Backup**

`createPromptRepository.list/getById` map ผ่าน `upgradeSavedPrompt`; `inspectBackupArchive` map prompts ผ่าน Upgrader ก่อนคืนค่า ส่วน Export เขียน v2 ตามปกติ

`FrameCraftApp.savePrompt()` ต้องสร้าง v2 จาก `selected.map(({ id }) => id)`, `composition`, `outputLanguage`, `promptSession.state/value/aiMetadata`; ตอนเปิด Saved Prompt ให้ resolve IDs จาก `techniques` ตามลำดับและใช้ `createPromptSession` จากค่า Saved โดยไม่สร้าง Prompt ทับ

- [ ] **Step 6: รัน Compatibility Tests ให้ผ่าน**

Run: `npm run test:unit -- tests/prompt-repository.test.ts tests/cloud-mappers.test.ts tests/backup-service.test.ts`

Expected: PASS ทั้ง v1 Local, v1 Backup, v1 Cloud และ v2 round trip

- [ ] **Step 7: Commit**

```powershell
git add app/framecraft/types.ts app/framecraft/FrameCraftApp.tsx app/framecraft/saved-prompt-schema.ts app/framecraft/storage.ts app/framecraft/backup-service.ts app/framecraft/cloud/contracts.ts app/framecraft/cloud/mappers.ts tests/prompt-repository.test.ts tests/cloud-mappers.test.ts tests/backup-service.test.ts
git commit -m "feat: persist versioned prompt sessions"
```

### Task 6: UI Styling, Regression และ Browser QA

**Files:**
- Modify: `app/framecraft/framecraft.css`
- Modify: `tests/design-system.test.ts`
- Modify: `tests/app-flow.test.tsx`

**Interfaces:**
- Produces: Desktop/Mobile UI ที่อ่าน Warning, State และ Shot Breakdown ได้ชัด

- [ ] **Step 1: เพิ่ม Design Assertions**

```ts
expect(css).toContain(".prompt-state--stale");
expect(css).toContain(".prompt-warning");
expect(css).toContain(".shot-breakdown");
expect(css).toContain("@media(max-width:760px)");
```

- [ ] **Step 2: รัน Design Test ให้ Fail**

Run: `npm run test:unit -- tests/design-system.test.ts`

Expected: FAIL เพราะ Class ใหม่ยังไม่มี

- [ ] **Step 3: เพิ่ม Style ที่เข้ากับ Monochrome Theme**

```css
.prompt-warning{border:1px solid #777;background:linear-gradient(135deg,#1a1a1a,#090909);color:#e6e6e2;padding:12px;font-size:13px;line-height:1.55}
.prompt-state--stale{color:#fff;border-left:2px solid #fff;padding-left:9px}
.shot-breakdown{display:grid;gap:8px;margin:12px 0}
.shot-breakdown article{border:1px solid #373737;background:#0d0d0d;padding:10px}
.output-language{display:grid;grid-template-columns:1fr 1fr;gap:7px}
@media(max-width:760px){.output-language{grid-template-columns:1fr}.prompt-warning{font-size:14px}}
```

- [ ] **Step 4: รัน Full Automated Verification**

Run: `npm run test:unit`

Expected: PASS ทุก Vitest test

Run: `npm run lint`

Expected: exit 0 ไม่มี ESLint error

Run: `npm run build`

Expected: exit 0 และ Vinext build สำเร็จ

- [ ] **Step 5: Browser QA ด้วย Local Site**

Run: `npm run dev`

ตรวจ Desktop และ Mobile:

1. Image เลือก Shot Size ใบที่สองแล้วถูกบล็อกพร้อมเหตุผล
2. Lighting และ Composition เลือกหลายใบได้
3. Video เพิ่ม 2 Shot Size แล้ว Shot Breakdown เรียงตาม Add order
4. Duration `8` ออกเป็น `Duration: 8 seconds` และภาษาไทยเป็น `ระยะเวลา: 8 วินาที`
5. ลบ Generated Prompt จนว่างแล้วไม่เด้งกลับ
6. แก้ Field หลัง Manual แล้วขึ้น Stale โดย Draft ไม่หาย
7. กด Add/Remove หลัง Manual แล้ว Cancel ไม่มี State ใดเปลี่ยน
8. Save/Open Prompt v2 แล้ว Selection, ภาษา และ Draft กลับมาครบ

Expected: Console ไม่มี Error และ UI ไม่ล้นกรอบ Prompt Panel

- [ ] **Step 6: Commit**

```powershell
git add app/framecraft/framecraft.css tests/design-system.test.ts tests/app-flow.test.tsx
git commit -m "style: refine prompt composer states"
```

## Core Completion Gate

- `npm run test:unit`, `npm run lint`, `npm run build` ผ่าน
- Composer ทำงาน Offline โดยไม่เรียก API
- Saved Prompt v1 เปิดได้และ v2 Round-trip ผ่าน Local/Cloud/Backup
- Browser QA ทั้ง Desktop/Mobile ผ่านครบ 8 ข้อ
- ยังไม่ Deploy Public จนกว่า AI Plan จะเสร็จหรือผู้ใช้อนุมัติให้ปล่อย Core แยก
