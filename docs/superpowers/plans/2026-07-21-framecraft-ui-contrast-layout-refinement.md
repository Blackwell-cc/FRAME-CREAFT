# FRAME / CRAFT UI Contrast & Layout Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แก้ Toolbar overlap, native dropdown contrast, inverse hover contrast, ฟอนต์หัวข้อไทย และเพิ่ม Camera Home button ที่กลับ Library พร้อมเลื่อนไปบนสุด

**Architecture:** รักษา component structure เดิมและแก้เฉพาะ `FrameCraftApp.tsx` กับ design contracts ใน `framecraft.css` โดยใช้ native select ต่อไปเพื่อคง accessibility เพิ่ม regression tests ก่อน implementation ทุกชุด และเผยแพร่ไปยัง Sites URL เดิมหลัง QA

**Tech Stack:** React 19, TypeScript, Lucide React, CSS, Vitest, Testing Library, vinext, OpenAI Sites

## Global Constraints

- รักษา Optical Monochrome palette: Pitch Black, Charcoal, Dark Gray, Pure White
- ข้อความและหัวข้อภาษาไทยที่ไม่ใช่ English Display Heading ใช้ Prompt
- Native dropdown ต้องอ่านได้บน Windows โดยไม่สร้าง Custom Dropdown
- ปุ่มพื้นขาวใช้ foreground สีดำ และปุ่มพื้นเข้มใช้ foreground สีขาวเมื่อ Hover
- Smooth Scroll ต้องเปลี่ยนเป็น Instant Scroll เมื่อ `prefers-reduced-motion: reduce`
- ไม่เปลี่ยน URL หรือสิทธิ์ Public ของเว็บไซต์

---

### Task 1: CSS Layout, Dropdown, Hover และ Thai Heading Contracts

**Files:**
- Modify: `tests/design-system.test.ts`
- Modify: `app/framecraft/framecraft.css`

**Interfaces:**
- Consumes: CSS classes เดิม `.library-toolbar`, `.library-summary`, `.field`, `.rail-links`, `.mode-toggle`, `.primary-button`, `.utility-head`, `.settings-grid`
- Produces: Design contracts สำหรับ spacing, native select contrast, inverse foreground และ Prompt heading

- [ ] **Step 1: เขียน failing design-contract tests**

เพิ่ม test ต่อไปนี้ใน `tests/design-system.test.ts`:

```ts
it("separates toolbar summary and styles every native dropdown", () => {
  expect(css).toContain(".library-toolbar{margin-bottom:12px}");
  expect(css).toContain(".library-summary{margin:0 0 18px}");
  expect(css).toContain("color-scheme:dark");
  expect(css).toContain(".framecraft-app select option");
  expect(css).toContain("background:#111214");
  expect(css).toContain("color:#f4f4f1");
});

it("keeps inverse buttons legible and Thai utility headings in Prompt", () => {
  expect(css).toContain(".rail-links button:hover{color:#050505!important}");
  expect(css).toContain(".mode-toggle button.is-active:hover{color:#050505!important}");
  expect(css).toContain(".primary-button:hover{color:#050505!important}");
  expect(css).toContain(".utility-head h1{font-family:var(--font-prompt)");
  expect(css).toContain(".settings-grid h2{font-family:var(--font-prompt)");
});
```

- [ ] **Step 2: รัน test เพื่อยืนยัน RED**

Run:

```bash
npm run test:unit -- tests/design-system.test.ts
```

Expected: FAIL เพราะ design contract strings ใหม่ยังไม่มีใน CSS

- [ ] **Step 3: เพิ่ม CSS implementation ที่ท้าย Optical refinement**

เพิ่มกฎต่อไปนี้ใน `app/framecraft/framecraft.css` หลัง interactive rules เดิม เพื่อให้ specificity ชัดเจน:

```css
.library-toolbar{margin-bottom:12px}
.library-summary{margin:0 0 18px;min-height:16px;position:relative;z-index:2}

.framecraft-app select{color-scheme:dark;background-color:#111214;color:#f4f4f1}
.framecraft-app select option{background:#111214;color:#f4f4f1}

.rail-links button:hover,
.rail-links button.is-active:hover,
.mode-toggle button.is-active:hover,
.new-technique:hover,
.primary-button:hover,
.technique-card__actions .add-button:hover,
.prompt-actions .primary-button:hover{color:#050505!important}

.utility-head h1{font-family:var(--font-prompt),Tahoma,"Noto Sans Thai",Arial,sans-serif;font-weight:600;line-height:1.08;text-transform:none}
.settings-grid h2,.detail-copy h3,.new-dialog h2{font-family:var(--font-prompt),Tahoma,"Noto Sans Thai",Arial,sans-serif}
```

ใน mobile media query ให้เพิ่ม:

```css
.library-toolbar{margin-bottom:10px}
.library-summary{margin-bottom:14px}
```

- [ ] **Step 4: รัน design-contract tests เพื่อยืนยัน GREEN**

Run:

```bash
npm run test:unit -- tests/design-system.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add tests/design-system.test.ts app/framecraft/framecraft.css
git commit -m "fix: improve layout and monochrome contrast"
```

---

### Task 2: Camera Home Button และ Scroll-to-Top Behavior

**Files:**
- Modify: `tests/app-flow.test.tsx`
- Modify: `app/framecraft/FrameCraftApp.tsx`

**Interfaces:**
- Consumes: `View`, `setView`, `setMobileMenu`, `window.matchMedia`, `window.scrollTo`
- Produces: `goHome(): void` และ Rail button ที่ render `<Video />`

- [ ] **Step 1: เขียน failing Home behavior tests**

แก้ import ใน `tests/app-flow.test.tsx`:

```ts
import { describe, expect, it, vi } from "vitest";
```

เพิ่ม tests:

```tsx
it("returns to the library and smoothly scrolls to the top from the camera mark", async () => {
  const user = userEvent.setup();
  const scrollTo = vi.fn();
  Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
  render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

  await user.click(screen.getByRole("button", { name: "จัดการคลัง" }));
  await user.click(screen.getByRole("button", { name: "FRAME / CRAFT Home" }));

  expect(screen.getByRole("searchbox", { name: "ค้นหาคลัง Production" })).toBeInTheDocument();
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
});

it("uses instant home scrolling when reduced motion is enabled", async () => {
  const user = userEvent.setup();
  const scrollTo = vi.fn();
  Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
  });
  render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

  await user.click(screen.getByRole("button", { name: "FRAME / CRAFT Home" }));

  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
});
```

- [ ] **Step 2: รัน test เพื่อยืนยัน RED**

Run:

```bash
npm run test:unit -- tests/app-flow.test.tsx
```

Expected: FAIL เพราะปุ่มเดิมไม่เรียก `window.scrollTo`

- [ ] **Step 3: เพิ่ม Camera icon และ Home handler**

เพิ่ม `Video` ใน Lucide import ของ `FrameCraftApp.tsx`:

```ts
import { Archive, BookOpen, Download, Heart, Languages, Menu, Plus, Search, Settings, Sparkles, Upload, Video, X } from "lucide-react";
```

เพิ่ม handler ใน component ก่อน `return`:

```ts
function goHome() {
  setView("library");
  setMobileMenu(false);
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
}
```

แทน Rail Mark เดิมด้วย:

```tsx
<button className="rail-mark" onClick={goHome} aria-label="FRAME / CRAFT Home">
  <Video size={22} strokeWidth={1.7} aria-hidden="true" />
</button>
```

- [ ] **Step 4: รัน app-flow tests เพื่อยืนยัน GREEN**

Run:

```bash
npm run test:unit -- tests/app-flow.test.tsx
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add tests/app-flow.test.tsx app/framecraft/FrameCraftApp.tsx
git commit -m "feat: add camera home control"
```

---

### Task 3: Full Verification, Browser QA และ Public Deployment

**Files:**
- Verify: `app/framecraft/framecraft.css`
- Verify: `app/framecraft/FrameCraftApp.tsx`
- Verify: `tests/design-system.test.ts`
- Verify: `tests/app-flow.test.tsx`
- Generated deployment archive outside repository, then remove after Sites saves the version

**Interfaces:**
- Consumes: production build at current branch HEAD และ `.openai/hosting.json`
- Produces: Sites version ใหม่ที่ Public URL เดิม

- [ ] **Step 1: รัน full automated verification**

Run:

```bash
npm run test:unit
npx tsc --noEmit
npm run lint
npm test
git status --short
```

Expected: 13 test files PASS, TypeScript exit 0, ESLint exit 0, build exit 0, rendered HTML 2 tests PASS และ worktree สะอาด

- [ ] **Step 2: ตรวจ Desktop ด้วย browser**

ตรวจ computed styles และ geometry:

```js
({
  toolbarBottom: Math.round(document.querySelector('.library-toolbar').getBoundingClientRect().bottom),
  summaryTop: Math.round(document.querySelector('.library-summary').getBoundingClientRect().top),
  utilityHeadingFont: getComputedStyle(document.querySelector('.utility-head h1')).fontFamily,
  optionColor: getComputedStyle(document.querySelector('.field select option')).color,
  optionBackground: getComputedStyle(document.querySelector('.field select option')).backgroundColor
})
```

Expected: `summaryTop > toolbarBottom`, utility heading contains `Prompt`, option contrast เป็นข้อความสว่างบนพื้นเข้ม

- [ ] **Step 3: ตรวจ interaction**

- Hover Rail active button และ Primary button; ยืนยัน SVG ใช้ foreground ดำบนพื้นขาว
- เปิด Dropdown ใน Prompt Panel; ยืนยัน option อ่านชัด
- ไป Manage แล้วกด Camera Home; ยืนยัน Library แสดงและ `scrollY` กลับ 0
- ตรวจ Chapter Nav ยัง Sticky ที่ `top: 0`

- [ ] **Step 4: Publish current HEAD to existing Sites project**

- Push exact HEAD ไป source repository ด้วย temporary write credential
- Package ด้วย `sites/0.1.30/scripts/package-site.sh`
- Save Site version ด้วย exact commit SHA และ archive
- Deploy ไปยัง Public project เดิมตาม approval ที่มีอยู่
- Poll deployment status จน `succeeded`

- [ ] **Step 5: ตรวจ Production URL และ cleanup**

ตรวจ URL:

```text
https://framecraft-production-guide.blackweii.chatgpt.site
```

Expected: computed styles และ interaction ตรงกับ Step 2–3 จาก Production จริง

ลบ deployment archive ชั่วคราว ปิด local servers และคง Production tab เป็น deliverable

- [ ] **Step 6: Commit เฉพาะกรณี QA พบ regression ที่ต้องแก้**

หากไม่มี regression ห้ามสร้าง empty commit หากมี ให้เริ่ม TDD cycle ใหม่สำหรับอาการนั้นก่อน commit
