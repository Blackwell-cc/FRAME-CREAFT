# FRAME / CRAFT Owner AI Prompt Optimizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม AI Optimizer แบบกดใช้งานเองสำหรับ Owner เพื่อวิเคราะห์ Structured Prompt, ความสมเหตุสมผล และ Video Shot Sequence โดย Preview ก่อนใช้และไม่เปิดเผย Gemini Secret

**Architecture:** Browser เรียก Supabase Edge Function ผ่าน Session JWT เท่านั้น Edge Function ตรวจ `is_framecraft_owner()` ก่อนส่งข้อมูลที่จำเป็นไป Gemini และ Validate JSON Response ก่อนตอบกลับ UI ตัว Composer ฟรีจากแผน Core เป็น Source of Truth และ Fallback เสมอ

**Tech Stack:** TypeScript, React 19, Supabase Edge Functions/Deno, Supabase JS 2, Gemini REST API, Zod 4, Vitest 4

## Global Constraints

- ต้องทำ Core Plan `2026-07-22-framecraft-core-prompt-composer.md` ให้เสร็จก่อน
- ปุ่ม AI แสดงเฉพาะ `ownerSession.state === "owner"`
- AI ทำงานเฉพาะเมื่อกด `วิเคราะห์ด้วย AI`; ห้าม Auto-call
- `GEMINI_API_KEY` และ `GEMINI_MODEL` อยู่ใน Supabase Secrets เท่านั้น
- Anonymous และ Viewer ต้องได้ 401/403 และห้ามเรียก Gemini
- Browser ส่งเฉพาะ Structured Draft, Input, Selected Cards, Shot Breakdown, Platform และ Output Language
- ห้ามส่งรูปภาพ, Database password, Secret, Token ใน Body, Prompt อื่น หรือข้อมูล Owner ที่ไม่เกี่ยวข้อง
- Request Body ไม่เกิน 32 KB; AI output prompt ไม่เกิน 8,000 ตัวอักษร; Timeout 20 วินาที
- ห้าม Log Subject, Action, Environment, Prompt หรือ Gemini response body
- AI Response ต้องผ่าน Zod Schema; ข้อมูลดิบที่ Invalid ห้ามส่งถึง UI
- Preview ไม่เขียนทับ Generated Prompt จนผู้ใช้กด `ใช้ผลลัพธ์นี้`
- Error ทุกชนิดต้องเก็บ Core Structured Draft เดิม
- ห้ามเปิด Billing หรือ Paid Tier อัตโนมัติ

---

## File Map

- Create `app/framecraft/ai-optimizer.ts` — Browser contract และ Supabase invocation
- Create `app/framecraft/AiPromptPreview.tsx` — Preview/Apply/Cancel UI
- Modify `app/framecraft/cloud/app-runtime.ts` — expose owner optimizer boundary
- Modify `app/framecraft/PromptPanel.tsx` และ `FrameCraftApp.tsx` — owner-only workflow
- Create `supabase/functions/analyze-prompt/contracts.ts` — Edge request/response schemas
- Create `supabase/functions/analyze-prompt/handler.ts` — auth, validation, Gemini call
- Create `supabase/functions/analyze-prompt/index.ts` — Deno entrypoint/CORS
- Create `tests/ai-optimizer.test.ts`, `tests/ai-prompt-preview.test.tsx`, `tests/analyze-prompt-handler.test.ts`
- Modify `tests/app-flow.test.tsx`, `tests/owner-cloud-ui.test.tsx`, `app/framecraft/framecraft.css`
- Modify `docs/framecraft-supabase-owner-guide.md` — ตั้งค่า Secret, Deploy, ค่าใช้จ่าย, Privacy, Troubleshooting

### Task 1: Shared AI Contract และ Browser Service

**Files:**
- Create: `app/framecraft/ai-optimizer.ts`
- Create: `tests/ai-optimizer.test.ts`
- Modify: `app/framecraft/cloud/app-runtime.ts`

**Interfaces:**
- Consumes: `PromptComposition`, `PromptInput`, `Technique[]`, `OutputLanguage`
- Produces: `AiOptimizeRequest`, `AiOptimizeResult`, `createAiOptimizer(client)`

- [ ] **Step 1: เขียน Failing Tests สำหรับ Invoke และ Error Mapping**

```ts
it("invokes only the analyze-prompt function with the structured request", async () => {
  const invoke = vi.fn().mockResolvedValue({ data: validResult, error: null });
  const optimizer = createAiOptimizer({ functions: { invoke } } as never);
  await optimizer.analyze(request);
  expect(invoke).toHaveBeenCalledWith("analyze-prompt", { body: request });
});

it("maps rate limit without discarding the local draft", async () => {
  const invoke = vi.fn().mockResolvedValue({ data: null, error: { context: { status: 429 } } });
  await expect(createAiOptimizer({ functions: { invoke } } as never).analyze(request))
    .rejects.toMatchObject({ code: "rate-limit" });
});
```

- [ ] **Step 2: รัน Test และยืนยัน Fail**

Run: `npm run test:unit -- tests/ai-optimizer.test.ts`

Expected: FAIL เพราะ Module ยังไม่มี

- [ ] **Step 3: สร้าง Browser Contract และ Service**

```ts
export interface AiOptimizeRequest {
  input: PromptInput;
  selected: Array<Pick<Technique, "id" | "category" | "titleEn" | "titleTh" | "imageKeywords" | "videoKeywords">>;
  composition: PromptComposition;
  platform: PlatformPresetId;
  outputLanguage: OutputLanguage;
}

export interface AiOptimizeResult {
  optimizedPrompt: string;
  improvements: string[];
  warnings: string[];
  shotBreakdown: Array<{ index: number; summary: string; transition: string }>;
  model: string;
  optimizedAt: string;
}

export function createAiOptimizer(client: SupabaseClient) {
  return {
    async analyze(request: AiOptimizeRequest): Promise<AiOptimizeResult> {
      const { data, error } = await client.functions.invoke("analyze-prompt", { body: request });
      if (error) throw mapAiOptimizerError(error);
      return aiOptimizeResultSchema.parse(data);
    },
  };
}
```

ใช้ Zod จำกัด `optimizedPrompt.max(8000)`, arrays `.max(20)` และทุกข้อความ `.max(500)`; Error code มี `unauthorized`, `forbidden`, `rate-limit`, `timeout`, `invalid-response`, `unavailable`

- [ ] **Step 4: เพิ่ม Runtime Boundary**

ใน `createAppCloudRuntime()` เพิ่ม `ai: createAiOptimizer(client)` โดยไม่ expose Secret และไม่สร้าง Client ใหม่

- [ ] **Step 5: รัน Test ให้ผ่าน**

Run: `npm run test:unit -- tests/ai-optimizer.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```powershell
git add app/framecraft/ai-optimizer.ts app/framecraft/cloud/app-runtime.ts tests/ai-optimizer.test.ts
git commit -m "feat: add owner ai optimizer client"
```

### Task 2: Edge Function Contract, Owner Authorization และ Gemini Adapter

**Files:**
- Create: `supabase/functions/analyze-prompt/contracts.ts`
- Create: `supabase/functions/analyze-prompt/handler.ts`
- Create: `supabase/functions/analyze-prompt/index.ts`
- Create: `tests/analyze-prompt-handler.test.ts`

**Interfaces:**
- Produces: `createAnalyzePromptHandler(deps)`, `callGemini(request, env, fetcher)`
- Security boundary: JWT + `is_framecraft_owner()` ก่อน Gemini fetch

- [ ] **Step 1: เขียน Failing Handler Tests**

```ts
it("rejects missing authorization before calling Gemini", async () => {
  const callGemini = vi.fn();
  const response = await createAnalyzePromptHandler(deps({ callGemini }))(new Request(url, { method: "POST", body: "{}" }));
  expect(response.status).toBe(401);
  expect(callGemini).not.toHaveBeenCalled();
});

it("rejects a non-owner before calling Gemini", async () => {
  const callGemini = vi.fn();
  const response = await createAnalyzePromptHandler(deps({ owner: false, callGemini }))(authorizedRequest(validBody));
  expect(response.status).toBe(403);
  expect(callGemini).not.toHaveBeenCalled();
});

it("rejects a body larger than 32 KB", async () => {
  const response = await handler(authorizedRequest({ ...validBody, input: { ...validBody.input, subject: "x".repeat(33_000) } }));
  expect(response.status).toBe(413);
});

it("returns validated json and never raw invalid model output", async () => {
  const response = await createAnalyzePromptHandler(deps({ geminiResult: validResult }))(authorizedRequest(validBody));
  expect(await response.json()).toEqual(validResult);
});
```

- [ ] **Step 2: รัน Handler Test และยืนยัน Fail**

Run: `npm run test:unit -- tests/analyze-prompt-handler.test.ts`

Expected: FAIL เพราะ Edge modules ยังไม่มี

- [ ] **Step 3: สร้าง Pure Handler พร้อม Dependency Injection**

```ts
export interface AnalyzePromptDependencies {
  verifyOwner: (authorization: string) => Promise<boolean>;
  callGemini: (request: AiOptimizeRequest, signal: AbortSignal) => Promise<Omit<AiOptimizeResult, "model" | "optimizedAt">>;
  model: string;
  now: () => string;
}

export function createAnalyzePromptHandler(deps: AnalyzePromptDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return corsResponse();
    if (request.method !== "POST") return jsonError(405, "method-not-allowed");
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return jsonError(401, "unauthorized");
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > 32_768) return jsonError(413, "request-too-large");
    if (!await deps.verifyOwner(authorization)) return jsonError(403, "forbidden");
    const parsed = aiOptimizeRequestSchema.safeParse(JSON.parse(bodyText));
    if (!parsed.success) return jsonError(400, "invalid-request");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const modelResult = aiModelResultSchema.parse(await deps.callGemini(parsed.data, controller.signal));
      return jsonResponse(aiOptimizeResultSchema.parse({ ...modelResult, model: deps.model, optimizedAt: deps.now() }), 200);
    } finally {
      clearTimeout(timeout);
    }
  };
}
```

Handler ต้อง Catch JSON parse, abort, Gemini 429/5xx และ Schema error เป็นรหัสปลอดภัย โดยห้ามใส่ Prompt หรือ response body ใน Error

- [ ] **Step 4: สร้าง Gemini REST Adapter**

อ่าน `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` จาก `Deno.env`; ถ้าขาดให้ตอบ `503 optimizer-not-configured`

`verifyOwner` สร้าง Supabase Client ด้วย Publishable/Anon Key และส่ง Authorization header เดิม แล้วเรียก `rpc("is_framecraft_owner")`

Gemini endpoint:

```ts
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
  body: JSON.stringify({
    contents: [{ role: "user", parts: [{ text: buildGeminiInstruction(request) }] }],
    generationConfig: { responseMimeType: "application/json" },
  }),
  signal,
});
```

System instruction ต้องสั่งรักษาภาษา, ไม่เพิ่ม Subject/Action/Environment ที่ผู้ใช้ไม่ได้ให้, วิเคราะห์ความขัดแย้งของเลนส์/มุม/แสง และคืน JSON เท่านั้น

- [ ] **Step 5: สร้าง Deno Entrypoint และ CORS Allowlist**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAnalyzePromptHandler } from "./handler.ts";

Deno.serve(createAnalyzePromptHandler(createProductionDependencies({ createClient, fetch })));
```

CORS อนุญาต `authorization, x-client-info, apikey, content-type`; ไม่ใช้ `Access-Control-Allow-Origin: *` ใน Production ให้เทียบ Origin กับ `FRAMECRAFT_ALLOWED_ORIGINS` ที่คั่นด้วย comma และอนุญาต localhost เฉพาะเมื่อ `FRAMECRAFT_ENV=development`

- [ ] **Step 6: รัน Handler Tests ให้ผ่าน**

Run: `npm run test:unit -- tests/analyze-prompt-handler.test.ts`

Expected: PASS 401, 403, 413, 429, Timeout, Invalid Schema และ Success

- [ ] **Step 7: Commit**

```powershell
git add supabase/functions/analyze-prompt tests/analyze-prompt-handler.test.ts
git commit -m "feat: secure owner prompt analysis function"
```

### Task 3: AI Preview UI และ Manual Draft Safety

**Files:**
- Create: `app/framecraft/AiPromptPreview.tsx`
- Modify: `app/framecraft/PromptPanel.tsx`
- Modify: `app/framecraft/FrameCraftApp.tsx`
- Modify: `app/framecraft/framecraft.css`
- Create: `tests/ai-prompt-preview.test.tsx`
- Modify: `tests/app-flow.test.tsx`
- Modify: `tests/owner-cloud-ui.test.tsx`

**Interfaces:**
- Consumes: `AiOptimizeResult`, `PromptSession`, `runtime.ai`
- Produces: `Analyze`, Loading, Preview, Apply, Cancel และ Error UI

- [ ] **Step 1: เพิ่ม UI Tests**

```ts
it("hides AI controls from anonymous users", () => {
  render(<FrameCraftApp persistence="memory" />);
  expect(screen.queryByRole("button", { name: "วิเคราะห์ด้วย AI" })).not.toBeInTheDocument();
});

it("previews without overwriting and applies only after confirmation", async () => {
  const user = userEvent.setup();
  renderOwnerAppWithAi(validResult);
  const original = screen.getByLabelText("Generated prompt").getAttribute("value");
  await user.click(screen.getByRole("button", { name: "วิเคราะห์ด้วย AI" }));
  expect(screen.getByRole("dialog", { name: "AI Prompt Preview" })).toHaveTextContent(validResult.optimizedPrompt);
  expect(screen.getByLabelText("Generated prompt")).toHaveValue(original);
  await user.click(screen.getByRole("button", { name: "ใช้ผลลัพธ์นี้" }));
  expect(screen.getByLabelText("Generated prompt")).toHaveValue(validResult.optimizedPrompt);
});
```

- [ ] **Step 2: รัน UI Tests และยืนยัน Fail**

Run: `npm run test:unit -- tests/ai-prompt-preview.test.tsx tests/owner-cloud-ui.test.tsx tests/app-flow.test.tsx`

Expected: FAIL เพราะยังไม่มี AI controls/preview

- [ ] **Step 3: สร้าง Preview Component**

`AiPromptPreview` props:

```ts
interface AiPromptPreviewProps {
  result: AiOptimizeResult;
  onApply: () => void;
  onCancel: () => void;
}
```

Dialog แสดง Optimized Prompt, Improvements, Warnings, Shot Breakdown, Model และ Privacy note พร้อมปุ่ม `ใช้ผลลัพธ์นี้`/`ยกเลิก`; Focus เริ่มที่หัว Dialog และ Escape เรียก Cancel

- [ ] **Step 4: เชื่อม Owner-only Analyze Flow**

เพิ่ม State:

```ts
const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "preview" | "error">("idle");
const [aiPreview, setAiPreview] = useState<AiOptimizeResult | null>(null);
const [aiError, setAiError] = useState("");
```

`analyzeWithAi()` ต้องส่ง Composition ล่าสุด; ระหว่าง Loading disable ปุ่มเดียว, Cancel Preview ไม่เปลี่ยน Session, Apply ใช้ `applyAiPrompt`; เมื่อ AI Error แสดงข้อความตาม code และเก็บ `promptSession.value` เดิมแบบ byte-for-byte

- [ ] **Step 5: เพิ่ม Monochrome Preview Styles**

```css
.ai-preview{width:min(760px,100%);max-height:88vh;overflow:auto;background:#090909;border:1px solid #747474;padding:28px}
.ai-preview__prompt{white-space:pre-wrap;border:1px solid #353535;background:#050505;padding:16px;line-height:1.7}
.ai-preview__grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ai-error{color:#fff;border-left:2px solid #fff;padding:10px;background:#181818}
@media(max-width:760px){.ai-preview__grid{grid-template-columns:1fr}}
```

- [ ] **Step 6: รัน UI Tests ให้ผ่าน**

Run: `npm run test:unit -- tests/ai-prompt-preview.test.tsx tests/owner-cloud-ui.test.tsx tests/app-flow.test.tsx`

Expected: PASS รวม anonymous hidden, owner preview/apply/cancel/error

- [ ] **Step 7: Commit**

```powershell
git add app/framecraft/AiPromptPreview.tsx app/framecraft/PromptPanel.tsx app/framecraft/FrameCraftApp.tsx app/framecraft/framecraft.css tests/ai-prompt-preview.test.tsx tests/owner-cloud-ui.test.tsx tests/app-flow.test.tsx
git commit -m "feat: add owner ai prompt preview"
```

### Task 4: Owner Guide, Deployment และ Security Verification

**Files:**
- Modify: `docs/framecraft-supabase-owner-guide.md`
- Modify: `supabase/tests/framecraft_rls.test.sql`

**Interfaces:**
- Produces: ขั้นตอนตั้งค่าที่เจ้าของทำเองได้โดยไม่แชร์ Secret

- [ ] **Step 1: เพิ่มคู่มือภาษาไทยแบบทีละขั้น**

เพิ่มหัวข้อ:

1. สร้าง Gemini API Key ใน Google AI Studio ด้วยบัญชีของเจ้าของ
2. เปิด Supabase Dashboard → Edge Functions → Secrets
3. เพิ่ม `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`, `FRAMECRAFT_ALLOWED_ORIGINS=https://framecraft-production-guide.blackweii.chatgpt.site`, `FRAMECRAFT_ENV=production`
4. ย้ำว่าห้ามใส่ค่าเหล่านี้ใน `.env.local`, Git, Screenshot หรือ Chat
5. Deploy ด้วย `npx supabase functions deploy analyze-prompt`
6. ทดสอบ Anonymous ต้องถูกปฏิเสธ, Owner ต้องเห็น Preview
7. อธิบาย Free Tier, Rate Limit, Privacy และวิธีปิด AI โดยลบ/เปลี่ยน Secret
8. Troubleshooting สำหรับ 401, 403, 429, 503 และ Timeout

- [ ] **Step 2: เพิ่ม SQL Security Assertion**

```sql
select is(
  (select public.is_framecraft_owner()),
  false,
  'anonymous remains non-owner for edge function authorization'
);
```

ปรับ `plan(N)` ให้ตรงกับจำนวน assertion ใหม่

- [ ] **Step 3: รัน Full Verification ก่อน Deploy**

Run: `npm run test:unit`

Expected: PASS ทุก test

Run: `npm run lint`

Expected: exit 0

Run: `npm run build`

Expected: exit 0

Run เมื่อ Docker/Supabase local พร้อม: `npm run db:test`

Expected: pgTAP PASS ทุก assertion; หากเครื่องยังไม่มี Docker ให้รัน SQL ชุดเดียวกันใน Supabase SQL Editor และบันทึกผลก่อน Deploy

- [ ] **Step 4: Deploy Edge Function โดยเจ้าของเป็นผู้ตั้ง Secret**

Run: `npx supabase functions deploy analyze-prompt`

Expected: Function `analyze-prompt` status Active โดย Secret ไม่ปรากฏใน Terminal output

- [ ] **Step 5: Remote Security Smoke Test**

Anonymous Request ไม่มี Authorization:

```powershell
Invoke-WebRequest -Method Post -Uri "$env:FRAMECRAFT_SUPABASE_URL/functions/v1/analyze-prompt" -ContentType "application/json" -Body '{}'
```

Expected: HTTP 401; ห้ามนำ Owner JWT มาใส่ใน Command, Log หรือแชต ให้ทดสอบ Owner ผ่านหน้าเว็บไซต์ที่ Login อยู่เท่านั้น

- [ ] **Step 6: Browser QA Owner Flow**

1. Login Owner
2. สร้าง Image Prompt ภาษาไทยและกดวิเคราะห์
3. Preview แสดง Improvements/Warnings และ Prompt เดิมไม่เปลี่ยน
4. Cancel แล้ว Prompt เดิมคงอยู่
5. วิเคราะห์ใหม่และ Apply แล้ว State เป็น AI Applied
6. เพิ่มการ์ดหลัง Apply แล้ว Cancel Confirmation; AI Prompt ต้องไม่หาย
7. ทดสอบ Video 2 Shots และตรวจคำเชื่อม/Shot Breakdown
8. Logout แล้วปุ่ม AI หาย

Expected: ไม่มี Secret/Prompt body ใน Console หรือ Network error message และ Core Composer ยังทำงานเมื่อ AI ถูกปิด

- [ ] **Step 7: Commit เอกสารและ Security Test**

```powershell
git add docs/framecraft-supabase-owner-guide.md supabase/tests/framecraft_rls.test.sql
git commit -m "docs: add owner ai optimizer operations guide"
```

## AI Completion Gate

- Unauthorized/Viewer ถูกปฏิเสธก่อน Gemini call
- Owner ได้ Preview และต้อง Apply เอง
- Invalid/Timeout/Rate-limit ไม่เปลี่ยน Core Prompt
- Gemini Secret ไม่อยู่ใน Git, Build, Browser Bundle, Screenshot หรือ Log
- Full Unit, Lint, Build, DB Security Test และ Browser QA ผ่าน
- Public deploy ทำหลังผู้ใช้ตรวจ Preview และอนุมัติเท่านั้น

## เอกสารทางการที่ต้องตรวจในวันตั้งค่า

- Gemini Models: https://ai.google.dev/gemini-api/docs/models
- Gemini Pricing และ Free Tier: https://ai.google.dev/gemini-api/docs/pricing
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Edge Function Limits: https://supabase.com/docs/guides/functions/limits

ณ วันที่ 22 กรกฎาคม 2026 เอกสารทางการระบุ `gemini-3.5-flash-lite` เป็น GA และมี Free Tier สำหรับ Input/Output แต่ Rate Limit และรายชื่อโมเดลเปลี่ยนได้ จึงต้องตรวจ Pricing อีกครั้งก่อนตั้ง Secret จริง
