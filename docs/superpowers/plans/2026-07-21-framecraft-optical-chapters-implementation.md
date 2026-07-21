# FRAME / CRAFT Optical Chapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade FRAME / CRAFT with Prompt typography, Optical Monochrome depth, responsive button/copy feedback, and a seven-chapter scrollable production guide with sticky navigation.

**Architecture:** Keep IndexedDB, prompt composition, and backup unchanged. Add focused presentation modules for category guide content, chapter navigation, category sections, and copy feedback, then integrate them into `FrameCraftApp` with derived grouped results and `IntersectionObserver` scroll-spy state. Apply typography and visual changes through CSS tokens and a final refinement layer.

**Tech Stack:** React 19, TypeScript, vinext/Next App Router, next/font/google, Vitest, Testing Library, Lucide React, CSS

## Global Constraints

- Use Prompt for every Thai glyph; Geist Mono may remain for English utility text only with Prompt as Thai fallback.
- Body text is 14–16px, card descriptions 13px desktop/14px mobile, form controls 14px, buttons 13px, and utility labels 11–12px.
- Palette remains Pitch Black through Pure White with no color accent.
- Motion must respect `prefers-reduced-motion: reduce`.
- The main library contains seven ordered chapters; search and favorites hide empty chapters.
- Do not change IndexedDB schema, prompt composition, seed technique count, or backup format.

---

### Task 1: Category Guide Content

**Files:**
- Create: `app/framecraft/category-guides.ts`
- Create: `tests/category-guides.test.ts`

**Interfaces:**
- Consumes: `TechniqueCategory` from `app/framecraft/types.ts`.
- Produces: `categoryOrder: TechniqueCategory[]`, `CategoryGuide`, and `categoryGuides: Record<TechniqueCategory, CategoryGuide>`.

- [ ] **Step 1: Write the failing content test**

```ts
import { describe, expect, it } from "vitest";
import { categoryGuides, categoryOrder } from "../app/framecraft/category-guides";

describe("category guides", () => {
  it("defines seven ordered bilingual production chapters", () => {
    expect(categoryOrder).toEqual([
      "shot-size", "camera-angle", "camera-movement", "lighting",
      "composition", "lens", "camera-settings",
    ]);
    expect(Object.keys(categoryGuides)).toHaveLength(7);
    for (const category of categoryOrder) {
      expect(categoryGuides[category].descriptionTh.length).toBeGreaterThan(30);
      expect(categoryGuides[category].tipTh.length).toBeGreaterThan(30);
      expect(categoryGuides[category].promptFormula).toContain("{");
    }
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test:unit -- tests/category-guides.test.ts`  
Expected: FAIL because `app/framecraft/category-guides.ts` does not exist.

- [ ] **Step 3: Implement the structured guide content**

```ts
import type { TechniqueCategory } from "./types";

export interface CategoryGuide {
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  tipTh: string;
  tipEn: string;
  promptFormula: string;
}

export const categoryOrder: TechniqueCategory[] = [
  "shot-size", "camera-angle", "camera-movement", "lighting",
  "composition", "lens", "camera-settings",
];

export const categoryGuides: Record<TechniqueCategory, CategoryGuide> = {
  "shot-size": {
    titleTh: "ระยะภาพ", titleEn: "Shot Sizes",
    descriptionTh: "กำหนดว่าผู้ชมอยู่ใกล้ตัวแบบแค่ไหน และเลือกว่าจะให้อารมณ์หรือสภาพแวดล้อมเป็นผู้เล่าเรื่อง",
    descriptionEn: "Control audience distance and decide whether emotion or environment carries the story.",
    tipTh: "วางลำดับภาพกว้างไปหาใกล้เพื่อสร้างบริบทก่อนพาผู้ชมเข้าสู่อารมณ์",
    tipEn: "Move from wide to close so context arrives before emotional detail.",
    promptFormula: "{shot size} of {subject}, {action}",
  },
  "camera-angle": {
    titleTh: "มุมกล้อง", titleEn: "Camera Angles",
    descriptionTh: "ตำแหน่งกล้องเทียบกับตัวแบบเปลี่ยนความรู้สึกเรื่องอำนาจ ความเปราะบาง และมุมมองของผู้ชม",
    descriptionEn: "Camera position changes power, vulnerability, and the viewer's emotional alignment.",
    tipTh: "เลือกมุมจากความรู้สึกที่ต้องการก่อนเลือกความสวย และตรวจเส้นฉากหลังทุกครั้ง",
    tipEn: "Choose the emotional effect before visual novelty and always check background lines.",
    promptFormula: "{shot size} of {subject}, {camera angle}, {action}",
  },
  "camera-movement": {
    titleTh: "การเคลื่อนกล้อง", titleEn: "Camera Movement",
    descriptionTh: "การเคลื่อนกล้องควบคุมจังหวะการเปิดเผยข้อมูลและพลังงานที่ผู้ชมรู้สึกในช็อต",
    descriptionEn: "Camera motion controls reveal timing and the energy carried through a shot.",
    tipTh: "ทุกการเคลื่อนควรมีเหตุผล เริ่มจากตัวแบบ การเปิดเผยข้อมูล หรือการเปลี่ยนอารมณ์",
    tipEn: "Motivate every move with subject motion, information reveal, or an emotional shift.",
    promptFormula: "{camera movement}, following {subject}, {pacing}",
  },
  lighting: {
    titleTh: "แสง", titleEn: "Lighting",
    descriptionTh: "ทิศทาง คุณภาพ และอัตราส่วนของแสงสร้างเวลา มิติ และอารมณ์ก่อนการเกรดสี",
    descriptionEn: "Direction, quality, and contrast ratio establish time, depth, and mood before grading.",
    tipTh: "กำหนดแสงหลักหนึ่งทิศก่อน แล้วค่อยเพิ่ม Fill หรือ Practical เท่าที่เรื่องต้องการ",
    tipEn: "Commit to one key direction, then add fill or practicals only when the story needs them.",
    promptFormula: "{lighting style}, key light from {direction}, {contrast}",
  },
  composition: {
    titleTh: "องค์ประกอบ", titleEn: "Composition",
    descriptionTh: "การจัดตำแหน่ง เส้น และพื้นที่ว่างช่วยกำหนดลำดับการมองและความสัมพันธ์ภายในเฟรม",
    descriptionEn: "Placement, lines, and negative space determine visual priority and relationships in frame.",
    tipTh: "ตัดสิ่งที่ไม่ช่วยเล่าเรื่องออกจากขอบเฟรมก่อนเพิ่มองค์ประกอบใหม่เสมอ",
    tipEn: "Remove distractions at the frame edge before adding another compositional device.",
    promptFormula: "{composition}, {subject placement}, {foreground/background relationship}",
  },
  lens: {
    titleTh: "เลนส์", titleEn: "Lens Language",
    descriptionTh: "ทางยาวโฟกัสและระยะกล้องเปลี่ยนสัดส่วน ระยะห่าง และความรู้สึกใกล้ชิดของภาพ",
    descriptionEn: "Focal length and camera distance change proportion, space, and perceived intimacy.",
    tipTh: "เลือกตำแหน่งกล้องจาก Perspective ที่ต้องการก่อน แล้วจึงเลือกเลนส์ให้ได้ขนาดเฟรม",
    tipEn: "Choose camera position for perspective first, then select focal length for framing.",
    promptFormula: "shot on {focal length}, {depth of field}, {lens character}",
  },
  "camera-settings": {
    titleTh: "ค่ากล้อง", titleEn: "Camera Settings",
    descriptionTh: "Shutter รูรับแสง ISO และเฟรมเรตควบคุม Motion Blur ระยะชัด และพื้นผิวของภาพ",
    descriptionEn: "Shutter, aperture, ISO, and frame rate control motion blur, depth, and image texture.",
    tipTh: "ล็อกเฟรมเรตและ Shutter ก่อน แล้วคุม Exposure ด้วยรูรับแสง แสง และ ND",
    tipEn: "Lock frame rate and shutter first, then control exposure with aperture, lighting, and ND.",
    promptFormula: "{frame rate}, {shutter character}, {aperture}, {image texture}",
  },
};
```

- [ ] **Step 4: Run the content test and verify GREEN**

Run: `npm run test:unit -- tests/category-guides.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/framecraft/category-guides.ts tests/category-guides.test.ts
git commit -m "feat: add guided production chapter content"
```

### Task 2: Reusable Copy Feedback

**Files:**
- Create: `app/framecraft/CopyButton.tsx`
- Create: `tests/copy-button.test.tsx`
- Modify: `app/framecraft/TechniqueCard.tsx`
- Modify: `app/framecraft/PromptPanel.tsx`

**Interfaces:**
- Produces: `CopyButton({ value, idleLabel, copiedLabel, className, onError })`.
- Consumes: browser Clipboard API and Lucide `Copy`/`Check` icons.

- [ ] **Step 1: Write failing success and failure tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "../app/framecraft/CopyButton";

describe("CopyButton", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows copied feedback after a successful clipboard write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<CopyButton value="camera prompt" idleLabel="Copy" copiedLabel="Copied" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("camera prompt");
    expect(screen.getByRole("button", { name: "Copied" })).toHaveClass("is-copied");
  });

  it("reports failure without showing copied feedback", async () => {
    const onError = vi.fn();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<CopyButton value="camera prompt" idleLabel="Copy" copiedLabel="Copied" onError={onError} />);
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onError).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test:unit -- tests/copy-button.test.tsx`  
Expected: FAIL because `CopyButton.tsx` does not exist.

- [ ] **Step 3: Implement `CopyButton` with a cleared timer**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  value: string;
  idleLabel: string;
  copiedLabel: string;
  className?: string;
  onError?: () => void;
}

export function CopyButton({ value, idleLabel, copiedLabel, className = "", onError }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      onError?.();
    }
  }

  return <button className={`${className} ${copied ? "is-copied" : ""}`.trim()} onClick={() => void copy()} aria-label={copied ? copiedLabel : idleLabel}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? copiedLabel : idleLabel}</button>;
}
```

- [ ] **Step 4: Replace both direct clipboard implementations**

Use `<CopyButton value={technique.genericImagePrompt} idleLabel="Copy" copiedLabel="Copied" />` in `TechniqueCard`. Use `<CopyButton value={output} idleLabel="Copy Prompt" copiedLabel="Copied" onError={selectGeneratedPrompt} />` in `PromptPanel`, where `selectGeneratedPrompt` focuses and selects `#generated-prompt`.

- [ ] **Step 5: Run component and app tests**

Run: `npm run test:unit -- tests/copy-button.test.tsx tests/app-flow.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/framecraft/CopyButton.tsx app/framecraft/TechniqueCard.tsx app/framecraft/PromptPanel.tsx tests/copy-button.test.tsx
git commit -m "feat: add visible copy feedback"
```

### Task 3: Chapter Navigation and Sections

**Files:**
- Create: `app/framecraft/ChapterNav.tsx`
- Create: `app/framecraft/CategorySection.tsx`
- Create: `tests/chapter-components.test.tsx`

**Interfaces:**
- `ChapterNav` consumes `{ active, counts, language }` and scrolls to `chapter-${category}`.
- `CategorySection` consumes `{ category, index, techniques, language, mediaUrls, onAdd, onFavorite, onOpen }`.

- [ ] **Step 1: Write the failing chapter component test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChapterNav } from "../app/framecraft/ChapterNav";

describe("ChapterNav", () => {
  it("marks the active chapter and scrolls to a selected chapter", async () => {
    const scrollIntoView = vi.fn();
    const target = document.createElement("section");
    target.id = "chapter-camera-angle";
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);
    render(<ChapterNav active="shot-size" language="th" counts={{ "shot-size": 10, "camera-angle": 9, "camera-movement": 10, lighting: 10, composition: 9, lens: 7, "camera-settings": 5 }} />);
    expect(screen.getByRole("button", { name: "01 ระยะภาพ" })).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByRole("button", { name: "02 มุมกล้อง" }));
    expect(scrollIntoView).toHaveBeenCalledOnce();
    target.remove();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test:unit -- tests/chapter-components.test.tsx`  
Expected: FAIL because `ChapterNav.tsx` does not exist.

- [ ] **Step 3: Implement `ChapterNav`**

Render all categories from `categoryOrder`. Disable buttons whose count is zero, set `aria-current` only on `active`, and call:

```ts
const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
document.getElementById(`chapter-${category}`)?.scrollIntoView({
  behavior: reduced ? "auto" : "smooth",
  block: "start",
});
```

- [ ] **Step 4: Implement `CategorySection`**

Render a `<section id={`chapter-${category}`} className="category-section">` with a numbered heading, bilingual title, guide description, `Production Tip`, `Prompt Formula`, and a `technique-grid` of `TechniqueCard` children. Return `null` when `techniques.length === 0`.

- [ ] **Step 5: Run chapter tests and verify GREEN**

Run: `npm run test:unit -- tests/chapter-components.test.tsx`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/framecraft/ChapterNav.tsx app/framecraft/CategorySection.tsx tests/chapter-components.test.tsx
git commit -m "feat: add production chapter components"
```

### Task 4: Integrate Continuous Chapters and Scroll Spy

**Files:**
- Modify: `app/framecraft/FrameCraftApp.tsx`
- Modify: `tests/app-flow.test.tsx`

**Interfaces:**
- Consumes: `categoryOrder`, `ChapterNav`, and `CategorySection`.
- Produces: grouped search/favorite rendering and active chapter state.

- [ ] **Step 1: Add failing application assertions**

Add a test that renders the memory app and asserts seven `region` landmarks named `01 Shot Sizes` through `07 Camera Settings`, then searches `low angle` and verifies only `02 Camera Angles` remains. Assert the chapter nav button for `Shot Sizes` is disabled after the search and `Camera Angles` remains enabled.

- [ ] **Step 2: Run the application test and verify RED**

Run: `npm run test:unit -- tests/app-flow.test.tsx`  
Expected: FAIL because category sections and chapter nav do not render.

- [ ] **Step 3: Replace category filter state with grouped derived data**

Remove `category` state. Keep the search/favorite predicate, then derive:

```ts
const grouped = useMemo(() => Object.fromEntries(
  categoryOrder.map((id) => [id, filtered.filter((item) => item.category === id)]),
) as Record<TechniqueCategory, Technique[]>, [filtered]);

const counts = useMemo(() => Object.fromEntries(
  categoryOrder.map((id) => [id, grouped[id].length]),
) as Record<TechniqueCategory, number>, [grouped]);
```

- [ ] **Step 4: Add active chapter observation**

Initialize `activeChapter` with `"shot-size"`. Observe visible `.category-section` elements with `rootMargin: "-20% 0px -65% 0px"`; on an intersecting entry, strip `chapter-` from its id and update state. Disconnect on cleanup. Skip observer creation when `IntersectionObserver` is unavailable.

- [ ] **Step 5: Render chapter navigation and ordered sections**

Place `<ChapterNav>` after search controls and Saved Prompts. Map `categoryOrder` to `<CategorySection>`. Retain the empty state when `filtered.length === 0`. Remove `.category-tabs` markup and reset buttons that mutate `category`.

- [ ] **Step 6: Run app tests and verify GREEN**

Run: `npm run test:unit -- tests/app-flow.test.tsx`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/framecraft/FrameCraftApp.tsx tests/app-flow.test.tsx
git commit -m "feat: organize library into scrollable chapters"
```

### Task 5: Prompt Typography and Optical Monochrome Design System

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/framecraft/framecraft.css`
- Create: `tests/design-system.test.ts`

**Interfaces:**
- Produces CSS variables `--font-prompt`, `--text-body`, `--text-description`, `--text-control`, `--text-button`, and `--text-utility`.

- [ ] **Step 1: Write a failing source-contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("optical monochrome design system", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const css = readFileSync("app/framecraft/framecraft.css", "utf8");

  it("loads Prompt and defines readable type tokens", () => {
    expect(layout).toContain("Prompt");
    expect(layout).toContain("--font-prompt");
    expect(css).toContain("--text-description:13px");
    expect(css).toContain("--text-control:14px");
    expect(css).toContain("--text-button:13px");
  });

  it("defines optical and interactive states", () => {
    expect(css).toContain(".chapter-nav");
    expect(css).toContain(":hover");
    expect(css).toContain(".is-copied");
    expect(css).toContain("prefers-reduced-motion:reduce");
  });
});
```

- [ ] **Step 2: Run the design-system test and verify RED**

Run: `npm run test:unit -- tests/design-system.test.ts`  
Expected: FAIL because Prompt and new tokens are absent.

- [ ] **Step 3: Load Prompt in the root layout**

Import `Prompt` from `next/font/google`, configure `weight: ["300", "400", "500", "600", "700"]`, `subsets: ["thai", "latin"]`, `display: "swap"`, and `variable: "--font-prompt"`; add `prompt.variable` to the body class.

- [ ] **Step 4: Add typography and optical tokens**

Set `--ui: var(--font-prompt), Tahoma, sans-serif` and `--mono: var(--font-geist-mono), var(--font-prompt), monospace`. Add the exact type tokens from the test. Override card descriptions, detail copy, settings text, form controls, placeholders, buttons, labels, privacy note, and mobile description size with those tokens.

- [ ] **Step 5: Add the Optical Monochrome refinement layer**

Add layered radial/linear gradients to `.framecraft-app`, `.app-main`, `.prompt-panel`, `.technique-card`, and fields. Use white edge highlights and grayscale shadows only. Add `ChapterNav`, category header, guide panel, chapter grid spacing, sticky offsets, mobile horizontal scrolling, and `scroll-margin-top` styles.

- [ ] **Step 6: Add consistent interaction states**

Buttons receive a 160ms transform/border/box-shadow transition, `translateY(-1px)` and rim light on hover, `translateY(0) scale(.985)` on active, and a diagonal `::after` reflective sweep. `.is-copied` receives a short white pulse. The reduced-motion query disables transforms, animations, smooth scrolling, and sweep movement while keeping contrast changes.

- [ ] **Step 7: Run design, unit, type, and lint checks**

Run:

```bash
npm run test:unit -- tests/design-system.test.ts
npm run test:unit
npx tsc --noEmit
npm run lint
```

Expected: all commands exit 0 with no warnings from project code.

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/framecraft/framecraft.css tests/design-system.test.ts
git commit -m "feat: refine optical monochrome typography and motion"
```

### Task 6: Final Verification and Private Deployment

**Files:**
- Modify only if verification exposes a defect in files from Tasks 1–5.

**Interfaces:**
- Consumes the complete source tree and existing Sites project metadata.
- Produces a tested build and a new private Sites version.

- [ ] **Step 1: Run the complete verification suite**

Run:

```bash
npm run test:unit
npx tsc --noEmit
npm run lint
npm test
```

Expected: 0 failures; production build and rendered HTML tests pass.

- [ ] **Step 2: Verify the local HTTP response**

Run `npm run dev`, request `http://localhost:3000`, and verify status 200 plus `FRAME / CRAFT` in the HTML. Stop the development server after verification.

- [ ] **Step 3: Confirm source state and commit any verification fix**

Run `git status --short` and `git diff --check`. If a verification fix was required, stage only the affected source/test files and commit with `fix: resolve optical chapter verification issue`. Otherwise the worktree must be clean.

- [ ] **Step 4: Publish a new private Sites version**

Push the validated branch head using a short-lived Sites source credential, package the exact `dist` output with `scripts/package-site.sh`, save one version with the pushed commit SHA, deploy privately, and poll deployment status until `succeeded` or `failed`.

- [ ] **Step 5: Open and hand off the deployed URL**

Open the exact successful deployment URL in Codex. Report the URL and summarize the visible typography, chapter navigation, and interaction upgrades.
