# Clean Reference Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every real production reference image fill its card and detail frame cleanly, while removing all text and Grid overlays automatically and preserving the existing fallback visual for techniques without images.

**Architecture:** Treat the presence of `imageUrl` as the single source of truth for media mode. `TechniqueCard` and the detail dialog conditionally render either a clean image or the existing fallback overlays, while CSS excludes the visual button from the generic button-child positioning rule that currently breaks absolute image layout.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS, vinext

## Global Constraints

- Real images use `position: absolute`, `inset: 0`, `width: 100%`, `height: 100%`, and `object-fit: cover`.
- Real images show no `visual-code`, `visual-index`, `viewfinder-grid`, or large detail abbreviation.
- Techniques without images retain the current Monochrome fallback, abbreviation, index, and Grid.
- Overlay visibility and full-frame layout are driven by image presence, never by a technique-specific ID.
- The existing Close-Up natural-color treatment remains unchanged.
- Do not add dependencies.

---

## File Map

- `tests/app-flow.test.tsx`: behavioral regression coverage for clean media and fallback media modes.
- `tests/design-system.test.ts`: CSS contract preventing the shared button effect from overriding media positioning.
- `app/framecraft/TechniqueCard.tsx`: chooses clean-image or fallback-overlay rendering for library cards.
- `app/framecraft/FrameCraftApp.tsx`: chooses clean-image or fallback-overlay rendering for the detail dialog.
- `app/framecraft/framecraft.css`: preserves absolute image cover and scopes the shared button-child stacking rule.

### Task 1: Media-aware card and detail rendering

**Files:**
- Modify: `tests/app-flow.test.tsx`
- Modify: `app/framecraft/TechniqueCard.tsx`
- Modify: `app/framecraft/FrameCraftApp.tsx`

**Interfaces:**
- Consumes: `TechniqueCardProps.imageUrl?: string` and `mediaUrls: Record<string, string>`.
- Produces: clean media mode when a URL exists; fallback media mode when it does not.

- [ ] **Step 1: Extend the Close-Up test to require clean media mode**

Replace the existing Close-Up test with assertions that the card and detail dialog contain the approved image but no visual overlays:

```tsx
it("shows a clean approved Close-Up reference in the card and detail view", async () => {
  const user = userEvent.setup();
  render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

  const approvedImage = "/images/techniques/close-up-korean-actor-clean-studio-v3.webp";
  const card = screen.getByRole("article", { name: /^Close-Up/ });
  const cardImage = card.querySelector("img");

  expect(cardImage).toHaveAttribute("src", approvedImage);
  expect(cardImage).toHaveClass("natural-color-reference");
  expect(card.querySelector(".viewfinder-grid")).not.toBeInTheDocument();
  expect(card.querySelector(".visual-code")).not.toBeInTheDocument();
  expect(card.querySelector(".visual-index")).not.toBeInTheDocument();

  await user.click(within(card).getByRole("button", { name: /^Close-Up/ }));

  const dialog = screen.getByRole("dialog");
  const detailImage = dialog.querySelector("img");
  expect(detailImage).toHaveAttribute("src", approvedImage);
  expect(detailImage).toHaveClass("natural-color-reference");
  expect(dialog.querySelector(".viewfinder-grid")).not.toBeInTheDocument();
  expect(dialog.querySelector(".detail-visual b")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add a fallback regression test**

Add a separate test proving that a technique without an image still renders the existing visual language:

```tsx
it("keeps fallback overlays for techniques without reference images", async () => {
  const user = userEvent.setup();
  render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

  const card = screen.getByRole("article", { name: /^Extreme Wide Shot/ });
  expect(card.querySelector("img")).not.toBeInTheDocument();
  expect(card.querySelector(".viewfinder-grid")).toBeInTheDocument();
  expect(card.querySelector(".visual-code")).toHaveTextContent("EWS");
  expect(card.querySelector(".visual-index")).toBeInTheDocument();

  await user.click(within(card).getByRole("button", { name: /^Extreme Wide Shot/ }));

  const dialog = screen.getByRole("dialog");
  expect(dialog.querySelector("img")).not.toBeInTheDocument();
  expect(dialog.querySelector(".viewfinder-grid")).toBeInTheDocument();
  expect(dialog.querySelector(".detail-visual b")).toHaveTextContent("EWS");
});
```

- [ ] **Step 3: Run the focused behavior tests and verify RED**

Run:

```bash
npm run test:unit -- tests/app-flow.test.tsx
```

Expected: the clean-media test fails because the Close-Up card still contains `.viewfinder-grid`, `.visual-code`, and `.visual-index`, and the detail dialog still contains the Grid and `CU` abbreviation. The fallback test passes.

- [ ] **Step 4: Make `TechniqueCard` render one visual mode at a time**

Replace the visual contents in `app/framecraft/TechniqueCard.tsx` with:

```tsx
<button className="technique-visual" data-category={technique.category} onClick={() => onOpen(technique)}>
  {imageUrl ? (
    <img
      /* eslint-disable-line @next/next/no-img-element */
      className={technique.id === "shot-close-up" ? "natural-color-reference" : undefined}
      src={imageUrl}
      alt=""
    />
  ) : (
    <>
      <span className="viewfinder-grid" aria-hidden="true" />
      <span className="visual-code">{technique.abbreviation || technique.recommendedLenses[0]}</span>
      <span className="visual-index">{technique.id.slice(-2).toUpperCase()}</span>
    </>
  )}
</button>
```

- [ ] **Step 5: Make the detail dialog render one visual mode at a time**

Inside `FrameCraftApp`, add a derived URL before the return statement:

```tsx
const detailImageUrl = detail ? mediaUrls[detail.id] : undefined;
```

Replace the contents of `.detail-visual` with:

```tsx
<div className="detail-visual" data-category={detail.category}>
  {detailImageUrl ? (
    <img
      /* eslint-disable-line @next/next/no-img-element */
      className={detail.id === "shot-close-up" ? "natural-color-reference" : undefined}
      src={detailImageUrl}
      alt={`ภาพอ้างอิง ${detail.titleTh}`}
    />
  ) : (
    <>
      <span className="viewfinder-grid" />
      <b>{detail.abbreviation || detail.recommendedLenses[0]}</b>
    </>
  )}
</div>
```

- [ ] **Step 6: Run the focused behavior tests and verify GREEN**

Run:

```bash
npm run test:unit -- tests/app-flow.test.tsx
```

Expected: all tests in `tests/app-flow.test.tsx` pass.

- [ ] **Step 7: Commit the media-mode behavior**

```bash
git add tests/app-flow.test.tsx app/framecraft/TechniqueCard.tsx app/framecraft/FrameCraftApp.tsx
git commit -m "fix: hide overlays from reference images"
```

### Task 2: Prevent button effects from breaking image cover

**Files:**
- Modify: `tests/design-system.test.ts`
- Modify: `app/framecraft/framecraft.css`

**Interfaces:**
- Consumes: `.technique-visual` and the existing shared button hover/shine rules.
- Produces: an absolute full-frame image whose positioning cannot be overridden by generic button-child stacking.

- [ ] **Step 1: Add a CSS contract test for visual-button isolation**

Add this test to `tests/design-system.test.ts`:

```ts
it("keeps real reference images absolute and outside generic button child positioning", () => {
  expect(css).toContain(".technique-visual img,.detail-visual img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover");
  expect(css).toContain(".framecraft-app button:not(.dialog-close):not(.technique-visual)>*");
  expect(css).not.toContain(".framecraft-app button:not(.dialog-close)>*{position:relative");
});
```

- [ ] **Step 2: Run the CSS contract test and verify RED**

Run:

```bash
npm run test:unit -- tests/design-system.test.ts
```

Expected: FAIL because the current shared selector is `.framecraft-app button:not(.dialog-close)>*` and still includes `.technique-visual` children.

- [ ] **Step 3: Scope the shared button-child rule**

In `app/framecraft/framecraft.css`, change:

```css
.framecraft-app button:not(.dialog-close)>*{position:relative;z-index:1}
```

to:

```css
.framecraft-app button:not(.dialog-close):not(.technique-visual)>*{position:relative;z-index:1}
```

Keep the existing absolute image rule unchanged:

```css
.technique-visual img,.detail-visual img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.08)}
```

- [ ] **Step 4: Run the CSS and behavior tests and verify GREEN**

Run:

```bash
npm run test:unit -- tests/design-system.test.ts tests/app-flow.test.tsx
```

Expected: both test files pass.

- [ ] **Step 5: Commit the layout fix**

```bash
git add tests/design-system.test.ts app/framecraft/framecraft.css
git commit -m "fix: keep reference images flush with frames"
```

### Task 3: Full verification and Public deployment

**Files:**
- Verify: all source and test files changed in Tasks 1–2
- Preserve: `.openai/hosting.json`

**Interfaces:**
- Consumes: the validated branch HEAD and existing Sites `project_id`.
- Produces: a new production deployment at the existing FRAME / CRAFT Public URL.

- [ ] **Step 1: Run the complete verification suite**

Run each command and require exit code 0:

```bash
npm run test:unit
npx tsc --noEmit
npm run lint
npm test
git diff --check
git status --short
```

Expected: all unit tests pass, TypeScript and lint emit no errors, production build and rendered HTML tests pass, `git diff --check` is clean, and the worktree has no uncommitted changes.

- [ ] **Step 2: Inspect the local page**

Start the production app on an unused local port, search for `Close-Up`, and verify:

```text
Card: the image touches all four visual-frame edges.
Card: CU, index text, and Grid are absent.
Detail: the image fills the left visual panel.
Detail: CU and Grid are absent.
Fallback: Extreme Wide Shot still shows EWS and Grid.
```

- [ ] **Step 3: Publish the exact validated commit**

Use the Sites hosting workflow with the existing `project_id` from `.openai/hosting.json`:

```text
1. Push the exact branch HEAD to the configured Sites source branch.
2. Package the build with the Sites package-site.sh helper.
3. Save one site version using the pushed HEAD as commit_sha.
4. Deploy that saved version to the existing Public site.
5. Poll deployment status until succeeded or failed.
```

Expected: deployment status is `succeeded` and returns the existing FRAME / CRAFT production URL.

- [ ] **Step 4: Verify the production page and clean temporary files**

Request the production page and Close-Up image URL and require HTTP 200. Confirm the rendered HTML includes the approved image URL, does not render Close-Up overlay elements inside its media container, and the deployed CSS contains the scoped selector. Remove only the temporary deployment archive created during this task and stop only the local server process started in Step 2.
