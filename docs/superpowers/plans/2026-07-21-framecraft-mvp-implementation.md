# FRAME / CRAFT MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready local-first Production Reference and deterministic AI Image/Video Prompt Builder that satisfies the approved Phase 1 design.

**Architecture:** React and TypeScript render feature-focused screens. Domain services depend on repository interfaces; Dexie provides the local adapters, while the interface boundary remains compatible with a future Supabase adapter. Prompt composition, validation, backup, and seed content remain independent modules with unit tests.

**Tech Stack:** React, TypeScript, Vite, React Router, Dexie, Zod, fflate, Lucide React, Vitest, Testing Library, fake-indexeddb, CSS custom properties.

## Global Constraints

- UI defaults to Thai; technique names remain English-first; generated prompts remain English.
- Design system uses Pitch Black, Charcoal, Dark Gray, Off-white, and Pure White only.
- Starter library contains exactly 60 techniques across all 7 approved categories.
- Primary functionality works offline after the first successful load.
- Local data and image blobs use IndexedDB; UI components never import Dexie directly.
- Prompt composition is deterministic and makes no AI API calls.
- Platform presets: Generic Image, Midjourney, Flux, Generic Video, Runway, Kling, and Veo.
- External video and platform links use `target="_blank"` with `rel="noopener noreferrer"`.
- All interactive targets are at least 44×44 px and support visible keyboard focus.

---

## Planned File Structure

```text
src/
  app/App.tsx
  app/routes.tsx
  app/AppProviders.tsx
  components/
    AppShell.tsx
    EmptyState.tsx
    Modal.tsx
    ToastRegion.tsx
  features/library/
    LibraryPage.tsx
    TechniqueCard.tsx
    TechniqueDetail.tsx
    TechniqueEditor.tsx
    library-search.ts
  features/prompt-builder/
    PromptPanel.tsx
    PromptLabPage.tsx
    prompt-composer.ts
    platform-presets.ts
    builder-state.tsx
  features/favorites/FavoritesPage.tsx
  features/settings/SettingsPage.tsx
  features/backup/backup-service.ts
  domain/models.ts
  domain/repositories.ts
  data/db.ts
  data/local-repositories.ts
  data/seed/techniques.ts
  styles/tokens.css
  styles/global.css
  styles/components.css
tests/
  setup.ts
  seed.test.ts
  prompt-composer.test.ts
  local-repositories.test.ts
  backup-service.test.ts
  app-flow.test.tsx
```

### Task 1: Scaffold the Tested Application Shell

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/AppProviders.tsx`
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `tests/setup.ts`
- Test: `tests/app-shell.test.tsx`

**Interfaces:**
- Produces: `App(): JSX.Element`, test scripts, Vite production build.

- [ ] **Step 1: Scaffold Vite React TypeScript and install runtime/test dependencies**

Run:

```powershell
pnpm create vite . --template react-ts
pnpm add react-router-dom dexie zod fflate lucide-react
pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb
```

Expected: `package.json` contains `react`, `vite`, `typescript`, `vitest`, and the listed packages.

- [ ] **Step 2: Write a failing shell test**

```tsx
import { render, screen } from '@testing-library/react';
import { App } from '../src/app/App';

it('renders the FRAME / CRAFT product shell', () => {
  render(<App />);
  expect(screen.getByText('FRAME / CRAFT')).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'เมนูหลัก' })).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the test and confirm the missing module failure**

Run: `pnpm vitest run tests/app-shell.test.tsx`
Expected: FAIL because `src/app/App.tsx` does not exist.

- [ ] **Step 4: Implement the provider and application shell**

```tsx
export function App() {
  return (
    <div className="app-shell">
      <nav aria-label="เมนูหลัก"><span>FRAME / CRAFT</span></nav>
      <main><h1>Production Reference</h1></main>
    </div>
  );
}
```

- [ ] **Step 5: Add monochrome tokens and global accessibility rules**

```css
:root {
  color-scheme: dark;
  --black: #050505;
  --panel: #0d0d0d;
  --raised: #171717;
  --line: #303030;
  --muted: #8a8a8a;
  --ink: #f4f4f0;
  --focus: #ffffff;
}
:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
button, a, input, select { min-height: 44px; }
```

- [ ] **Step 6: Run tests and build**

Run: `pnpm vitest run tests/app-shell.test.tsx && pnpm build`
Expected: test PASS and Vite build completes.

- [ ] **Step 7: Commit**

```powershell
git add package.json pnpm-lock.yaml vite.config.ts vitest.config.ts index.html src tests/app-shell.test.tsx
git commit -m "feat: scaffold FRAME CRAFT application shell"
```

### Task 2: Define Domain Models and the 60-item Starter Library

**Files:**
- Create: `src/domain/models.ts`
- Create: `src/domain/repositories.ts`
- Create: `src/data/seed/techniques.ts`
- Test: `tests/seed.test.ts`

**Interfaces:**
- Produces: `Technique`, `SavedPrompt`, `Settings`, `Repository<T>`, `starterTechniques`.

- [ ] **Step 1: Write failing seed invariants**

```ts
import { starterTechniques } from '../src/data/seed/techniques';

it('contains 60 unique bilingual techniques across seven categories', () => {
  expect(starterTechniques).toHaveLength(60);
  expect(new Set(starterTechniques.map((item) => item.id)).size).toBe(60);
  expect(new Set(starterTechniques.map((item) => item.category)).size).toBe(7);
  for (const item of starterTechniques) {
    expect(item.titleEn).toBeTruthy();
    expect(item.titleTh).toBeTruthy();
    expect(item.genericImagePrompt).toBeTruthy();
    expect(item.genericVideoPrompt).toBeTruthy();
  }
});
```

- [ ] **Step 2: Run and confirm missing seed module**

Run: `pnpm vitest run tests/seed.test.ts`
Expected: FAIL because the seed module does not exist.

- [ ] **Step 3: Define exact domain types**

```ts
export type TechniqueCategory =
  | 'shot-size' | 'camera-angle' | 'camera-movement'
  | 'lighting' | 'composition' | 'lens' | 'camera-settings';

export interface Technique {
  id: string; slug: string; schemaVersion: 1; sourceType: 'seed' | 'custom';
  category: TechniqueCategory; titleEn: string; titleTh: string;
  abbreviation?: string; descriptionEn: string; descriptionTh: string;
  useCasesTh: string; effectTh: string; warningsTh: string;
  tags: string[]; moods: string[]; recommendedLenses: string[];
  cameraSettings: string[]; imageKeywords: string[]; videoKeywords: string[];
  genericImagePrompt: string; genericVideoPrompt: string;
  mediaId?: string; videoReferenceUrl?: string; isFavorite: boolean;
  isHidden: boolean; createdAt: string; updatedAt: string;
}
```

- [ ] **Step 4: Implement all 60 original seed records**

Use seven typed arrays combined into `starterTechniques`; every record includes original Thai explanation, English prompt tokens, production use, warning, lens guidance, and deterministic ISO dates.

```ts
export const starterTechniques: Technique[] = [
  {
    id: 'seed-shot-ews', slug: 'extreme-wide-shot', schemaVersion: 1,
    sourceType: 'seed', category: 'shot-size', titleEn: 'Extreme Wide Shot',
    titleTh: 'ภาพกว้างมาก', abbreviation: 'EWS',
    descriptionEn: 'The environment dominates while the subject appears very small.',
    descriptionTh: 'พื้นที่และสเกลของฉากเป็นตัวเล่าเรื่อง โดยตัวแบบมีขนาดเล็กมากในเฟรม',
    useCasesTh: 'เปิดสถานที่ แสดงความยิ่งใหญ่ หรือความโดดเดี่ยว',
    effectTh: 'ให้ความรู้สึกถึงสเกล ระยะห่าง และสภาพแวดล้อม',
    warningsTh: 'ตัวแบบอาจเล็กเกินไปบนหน้าจอมือถือ ควรมีรูปทรงหรือสีที่แยกจากฉาก',
    tags: ['establishing', 'scale', 'environment'], moods: ['epic', 'isolated'],
    recommendedLenses: ['14–24mm'], cameraSettings: ['deep depth of field'],
    imageKeywords: ['extreme wide shot', 'tiny subject', 'vast environment'],
    videoKeywords: ['slow establishing movement'],
    genericImagePrompt: 'extreme wide shot, tiny subject in a vast environment',
    genericVideoPrompt: 'extreme wide establishing shot with slow controlled movement',
    isFavorite: false, isHidden: false,
    createdAt: '2026-07-21T00:00:00.000Z', updatedAt: '2026-07-21T00:00:00.000Z'
  }
];
```

- [ ] **Step 5: Run seed tests**

Run: `pnpm vitest run tests/seed.test.ts`
Expected: PASS with exactly 60 records.

- [ ] **Step 6: Commit**

```powershell
git add src/domain src/data/seed tests/seed.test.ts
git commit -m "feat: add production domain and starter library"
```

### Task 3: Implement and Test the Prompt Composer

**Files:**
- Create: `src/features/prompt-builder/prompt-composer.ts`
- Create: `src/features/prompt-builder/platform-presets.ts`
- Test: `tests/prompt-composer.test.ts`

**Interfaces:**
- Consumes: `Technique`.
- Produces: `composePrompt(input): PromptOutput`, `platformPresets`.

- [ ] **Step 1: Write failing image/video/preset tests**

```ts
expect(composePrompt({ mode: 'image', subject: 'a Thai director', techniques, platform: 'generic-image' }).prompt)
  .toContain('cinematic close-up of a Thai director');
expect(composePrompt({ mode: 'video', subject: 'a runner', movement: 'slow dolly in', techniques, platform: 'veo' }).prompt)
  .toContain('Camera movement: slow dolly in.');
```

- [ ] **Step 2: Run and confirm missing composer failure**

Run: `pnpm vitest run tests/prompt-composer.test.ts`
Expected: FAIL because `composePrompt` is not defined.

- [ ] **Step 3: Implement normalized token composition**

```ts
export function composePrompt(input: PromptInput): PromptOutput {
  const tokens = [input.shotSize, subjectPhrase(input), input.environment,
    input.angle, input.lens, input.movement, input.lighting,
    input.composition, input.mood].filter(Boolean);
  const generic = sentence(tokens);
  return applyPlatformPreset(input.platform, generic, input);
}
```

- [ ] **Step 4: Implement all seven preset transforms**

Each preset exports `{ id, label, mode, transform }`; unsupported parameters are omitted rather than invented. Midjourney appends an aspect-ratio argument, Flux keeps natural language, and video presets emit labeled camera/action timing clauses.

- [ ] **Step 5: Run composer tests**

Run: `pnpm vitest run tests/prompt-composer.test.ts`
Expected: PASS for generic image, generic video, Midjourney, Flux, Runway, Kling, and Veo.

- [ ] **Step 6: Commit**

```powershell
git add src/features/prompt-builder tests/prompt-composer.test.ts
git commit -m "feat: add deterministic prompt composer"
```

### Task 4: Add Local-first Dexie Repositories

**Files:**
- Create: `src/data/db.ts`
- Create: `src/data/local-repositories.ts`
- Create: `src/data/seed/seed-service.ts`
- Test: `tests/local-repositories.test.ts`

**Interfaces:**
- Consumes: domain repository interfaces and `starterTechniques`.
- Produces: `techniqueRepository`, `promptRepository`, `mediaRepository`, `ensureSeeded()`.

- [ ] **Step 1: Write failing CRUD, search, and one-time seed tests**

```ts
await ensureSeeded();
await ensureSeeded();
expect(await techniqueRepository.list()).toHaveLength(60);
await techniqueRepository.update('seed-shot-ews', { isFavorite: true });
expect((await techniqueRepository.getById('seed-shot-ews'))?.isFavorite).toBe(true);
expect(await techniqueRepository.search('โดดเดี่ยว', {})).toHaveLength(1);
```

- [ ] **Step 2: Run and confirm repository failures**

Run: `pnpm vitest run tests/local-repositories.test.ts`
Expected: FAIL because the Dexie database is not defined.

- [ ] **Step 3: Implement versioned Dexie schema**

```ts
class FrameCraftDb extends Dexie {
  techniques!: Table<Technique, string>;
  prompts!: Table<SavedPrompt, string>;
  media!: Table<MediaRecord, string>;
  settings!: Table<SettingsRecord, string>;
  constructor() {
    super('framecraft');
    this.version(1).stores({
      techniques: 'id, slug, category, sourceType, isFavorite, isHidden, updatedAt, *tags, *moods',
      prompts: 'id, mode, platformPresetId, isFavorite, updatedAt',
      media: 'id, techniqueId, updatedAt', settings: 'id'
    });
  }
}
```

- [ ] **Step 4: Implement repository adapters and atomic seeding**

`ensureSeeded()` checks the `settings` record `seed:version`; when absent it bulk-adds the 60 records and writes seed version `1` in the same transaction.

- [ ] **Step 5: Run repository tests**

Run: `pnpm vitest run tests/local-repositories.test.ts`
Expected: PASS for CRUD, indexed filters, bilingual search, media blobs, and one-time seed.

- [ ] **Step 6: Commit**

```powershell
git add src/data tests/local-repositories.test.ts
git commit -m "feat: add local-first data repositories"
```

### Task 5: Build the Monochrome Responsive App Shell and Library

**Files:**
- Create: `src/components/AppShell.tsx`, `src/components/Modal.tsx`, `src/components/EmptyState.tsx`
- Create: `src/features/library/LibraryPage.tsx`, `TechniqueCard.tsx`, `TechniqueDetail.tsx`, `library-search.ts`
- Create: `src/app/routes.tsx`
- Create: `src/styles/components.css`
- Test: `tests/library-flow.test.tsx`

**Interfaces:**
- Consumes: `techniqueRepository`, `Technique`.
- Produces: Library list/detail routes and `onAddToPrompt(technique)` interaction.

- [ ] **Step 1: Write failing library flow test**

```tsx
render(<TestApp initialEntries={['/library']} />);
expect(await screen.findByText('Extreme Wide Shot')).toBeInTheDocument();
await user.type(screen.getByRole('searchbox'), 'low angle');
expect(await screen.findByText('Low Angle')).toBeInTheDocument();
expect(screen.queryByText('Extreme Wide Shot')).not.toBeInTheDocument();
```

- [ ] **Step 2: Run and confirm missing screen failure**

Run: `pnpm vitest run tests/library-flow.test.tsx`
Expected: FAIL because routes and LibraryPage do not exist.

- [ ] **Step 3: Implement semantic three-pane shell and responsive navigation**

Desktop uses navigation rail, main content, and prompt aside. At widths below 760px the navigation becomes fixed bottom navigation and prompt aside becomes a route/drawer.

- [ ] **Step 4: Implement search, category filters, card grid, detail modal, favorite, and hidden states**

Use native buttons with accessible labels. Search debounces by 120 ms and uses repository search. Cards show category, bilingual title, mood tags, monochrome procedural diagram, and Add to Prompt.

- [ ] **Step 5: Run library test and build**

Run: `pnpm vitest run tests/library-flow.test.tsx && pnpm build`
Expected: PASS and build completes without TypeScript errors.

- [ ] **Step 6: Commit**

```powershell
git add src/app src/components src/features/library src/styles tests/library-flow.test.tsx
git commit -m "feat: build responsive production library"
```

### Task 6: Build Prompt Lab, Favorites, and Saved Prompts

**Files:**
- Create: `src/features/prompt-builder/builder-state.tsx`
- Create: `src/features/prompt-builder/PromptPanel.tsx`
- Create: `src/features/prompt-builder/PromptLabPage.tsx`
- Create: `src/features/favorites/FavoritesPage.tsx`
- Test: `tests/prompt-flow.test.tsx`

**Interfaces:**
- Consumes: `composePrompt`, repositories, `onAddToPrompt` events.
- Produces: `BuilderProvider`, saved prompt flow, clipboard copy status.

- [ ] **Step 1: Write failing end-user prompt flow**

```tsx
await user.click(screen.getByRole('button', { name: /เพิ่ม Low Angle เข้า Prompt/i }));
await user.type(screen.getByLabelText('ตัวแบบ'), 'a Thai film director');
await user.selectOptions(screen.getByLabelText('แพลตฟอร์ม'), 'veo');
expect(screen.getByLabelText('Generated prompt')).toHaveValue(expect.stringContaining('low angle'));
await user.click(screen.getByRole('button', { name: 'บันทึก Prompt' }));
expect(await screen.findByText('บันทึก Prompt แล้ว')).toBeInTheDocument();
```

- [ ] **Step 2: Run and confirm missing builder failure**

Run: `pnpm vitest run tests/prompt-flow.test.tsx`
Expected: FAIL because BuilderProvider and PromptPanel do not exist.

- [ ] **Step 3: Implement builder reducer and derived output**

```ts
type BuilderAction =
  | { type: 'set-field'; field: keyof PromptInput; value: string }
  | { type: 'add-technique'; technique: Technique }
  | { type: 'remove-technique'; id: string }
  | { type: 'reset' };
```

- [ ] **Step 4: Implement Image/Video fields, preset selector, editable output, copy fallback, save, reset, and Favorites route**

Clipboard failure selects the output textarea and displays Thai instructions. Saved prompts preserve both generated and edited output.

- [ ] **Step 5: Run prompt flow tests**

Run: `pnpm vitest run tests/prompt-flow.test.tsx`
Expected: PASS for select, compose, edit, copy fallback, save, favorite, and reset.

- [ ] **Step 6: Commit**

```powershell
git add src/features/prompt-builder src/features/favorites tests/prompt-flow.test.tsx
git commit -m "feat: add prompt lab and favorites"
```

### Task 7: Add Technique Management and Media Validation

**Files:**
- Create: `src/features/library/TechniqueEditor.tsx`
- Create: `src/features/library/ManageLibraryPage.tsx`
- Create: `src/features/library/media-service.ts`
- Test: `tests/manage-library.test.tsx`

**Interfaces:**
- Consumes: technique/media repositories.
- Produces: `validateAndResizeImage(file): Promise<ProcessedImage>`, custom CRUD, seed duplicate/hide/restore.

- [ ] **Step 1: Write failing validation and duplicate tests**

```ts
await expect(validateAndResizeImage(new File(['x'], 'x.txt', { type: 'text/plain' })))
  .rejects.toThrow('รองรับเฉพาะ JPG, PNG และ WebP');
await user.click(screen.getByRole('button', { name: /Duplicate Extreme Wide Shot/i }));
expect(await screen.findByDisplayValue('Extreme Wide Shot Copy')).toBeInTheDocument();
```

- [ ] **Step 2: Run and confirm failures**

Run: `pnpm vitest run tests/manage-library.test.tsx`
Expected: FAIL because editor and media service do not exist.

- [ ] **Step 3: Implement Zod record validation, form editor, custom delete confirmation, seed duplicate, hide, and restore**

Custom records receive `crypto.randomUUID()`, `sourceType: 'custom'`, and current ISO timestamps. Seed edits always create a custom copy.

- [ ] **Step 4: Implement image type/size validation and canvas-based WebP resize**

Maximum input is 12 MB. Output longest edge is 1600 px, WebP quality is 0.82, and the original is rejected if decoding fails.

- [ ] **Step 5: Run management tests**

Run: `pnpm vitest run tests/manage-library.test.tsx`
Expected: PASS for create, edit, duplicate, hide, restore, delete confirmation, URL validation, and media errors.

- [ ] **Step 6: Commit**

```powershell
git add src/features/library tests/manage-library.test.tsx
git commit -m "feat: add library management and media handling"
```

### Task 8: Implement Backup, Restore, Settings, and Language Toggle

**Files:**
- Create: `src/features/backup/backup-service.ts`
- Create: `src/features/settings/SettingsPage.tsx`
- Create: `src/features/settings/i18n.tsx`
- Test: `tests/backup-service.test.ts`
- Test: `tests/settings.test.tsx`

**Interfaces:**
- Consumes: all repositories.
- Produces: `exportBackup(): Promise<Blob>`, `inspectBackup(file)`, `importBackup(file, mode)`, `LanguageProvider`.

- [ ] **Step 1: Write failing round-trip and invalid archive tests**

```ts
const archive = await exportBackup();
await clearTestDatabase();
await importBackup(new File([archive], 'backup.zip'), 'replace');
expect(await techniqueRepository.list()).toHaveLength(60);
await expect(importBackup(new File(['bad'], 'bad.zip'), 'merge'))
  .rejects.toThrow('ไฟล์ Backup ไม่ถูกต้อง');
```

- [ ] **Step 2: Run and confirm backup failures**

Run: `pnpm vitest run tests/backup-service.test.ts`
Expected: FAIL because backup service does not exist.

- [ ] **Step 3: Implement ZIP manifest, JSON records, media checksums, inspection, merge, replace snapshot, and rollback**

Manifest contains `{ appVersion, schemaVersion: 1, exportedAt, counts, mediaChecksums }`. Import validates every required file before opening a write transaction.

- [ ] **Step 4: Implement Settings UI and Thai/English description toggle**

Settings persist default language, mode, and platform. Technique names remain English-first and generated prompts never translate to Thai.

- [ ] **Step 5: Run backup/settings tests**

Run: `pnpm vitest run tests/backup-service.test.ts tests/settings.test.tsx`
Expected: PASS for round trip, invalid archive, merge, replace, rollback, and persisted language.

- [ ] **Step 6: Commit**

```powershell
git add src/features/backup src/features/settings tests/backup-service.test.ts tests/settings.test.tsx
git commit -m "feat: add backup restore and settings"
```

### Task 9: Complete Accessibility, Offline Build, and Release Verification

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `src/components/ToastRegion.tsx`
- Modify: `src/styles/global.css`, `src/styles/components.css`, `src/app/App.tsx`
- Create: `tests/app-flow.test.tsx`

**Interfaces:**
- Consumes: completed routes and features.
- Produces: installable metadata, accessible status announcements, verified production bundle.

- [ ] **Step 1: Write the complete user-flow test**

```tsx
render(<TestApp initialEntries={['/library']} />);
await user.type(screen.getByRole('searchbox'), 'close-up');
await user.click(await screen.findByRole('button', { name: /เพิ่ม Close-Up เข้า Prompt/i }));
await user.click(screen.getByRole('link', { name: 'Prompt Lab' }));
await user.type(screen.getByLabelText('ตัวแบบ'), 'a product designer');
expect(screen.getByLabelText('Generated prompt')).toHaveValue(expect.stringContaining('close-up'));
```

- [ ] **Step 2: Run full tests to reveal integration gaps**

Run: `pnpm vitest run`
Expected: complete flow initially fails until route/state integration is finalized.

- [ ] **Step 3: Finalize route integration, live regions, focus restoration, reduced motion, empty/error/loading states, and offline app metadata**

The toast container uses `role="status" aria-live="polite"`. Dialogs restore focus to the trigger. Motion media query reduces transitions to 1 ms.

- [ ] **Step 4: Run all verification commands**

Run:

```powershell
pnpm vitest run
pnpm tsc --noEmit
pnpm build
```

Expected: all tests PASS, TypeScript exits 0, and Vite emits `dist/`.

- [ ] **Step 5: Inspect the production bundle locally**

Run: `pnpm preview --host 127.0.0.1`
Expected: Library loads, search works, Prompt Lab persists across refresh, mobile layout works at 390 px, and no console error occurs.

- [ ] **Step 6: Commit**

```powershell
git add public src tests package.json pnpm-lock.yaml
git commit -m "feat: complete FRAME CRAFT local-first MVP"
```

## Completion Gate

- All nine tasks are committed.
- `pnpm vitest run`, `pnpm tsc --noEmit`, and `pnpm build` exit successfully.
- Seed test proves exactly 60 techniques and seven categories.
- Backup round-trip restores records and media.
- Worktree is clean except for files explicitly identified to the user.
