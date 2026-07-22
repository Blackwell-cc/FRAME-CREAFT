# Close-Up Reference Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the approved clean-studio portrait as the default image for the Close-Up card and detail dialog.

**Architecture:** Export a static `starterMediaUrls` map keyed by the stable technique id `shot-close-up`. Initialize the app media state with that map and merge persisted media over it so local uploads remain authoritative.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, vinext, static WebP asset.

## Global Constraints

- Do not change any technique other than `shot-close-up`.
- Keep the original approved WebP dimensions and responsive `object-fit: cover` behavior.
- Persisted user media must override the built-in image.
- Do not add dependencies.

---

### Task 1: Default Close-Up media

**Files:**
- Create: `app/framecraft/starter-media.ts`
- Modify: `app/framecraft/FrameCraftApp.tsx`
- Test: `tests/app-flow.test.tsx`
- Add: `public/images/techniques/close-up-korean-actor-clean-studio-v3.webp`

**Interfaces:**
- Produces: `starterMediaUrls: Record<string, string>`
- Consumes: stable technique id `shot-close-up`

- [ ] **Step 1: Write the failing test**

```tsx
it("shows the approved Close-Up reference in the card and detail view", async () => {
  const user = userEvent.setup();
  render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);
  const card = screen.getByRole("article", { name: /^Close-Up/ });
  expect(card.querySelector("img")).toHaveAttribute(
    "src",
    "/images/techniques/close-up-korean-actor-clean-studio-v3.webp",
  );
  await user.click(within(card).getByRole("button", { name: /^Close-Up/ }));
  expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute(
    "src",
    "/images/techniques/close-up-korean-actor-clean-studio-v3.webp",
  );
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm run test:unit -- tests/app-flow.test.tsx`

Expected: FAIL because the Close-Up card has no image.

- [ ] **Step 3: Add the default media map and merge behavior**

```ts
export const starterMediaUrls: Record<string, string> = {
  "shot-close-up": "/images/techniques/close-up-korean-actor-clean-studio-v3.webp",
};
```

Initialize `mediaUrls` with `starterMediaUrls`, then merge persisted object URLs over the defaults.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
npm run test:unit -- tests/app-flow.test.tsx
npm run test:unit
npx tsc --noEmit
npm run lint
npm test
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/framecraft/starter-media.ts app/framecraft/FrameCraftApp.tsx tests/app-flow.test.tsx public/images/techniques/close-up-korean-actor-clean-studio-v3.webp
git commit -m "feat: add Close-Up studio reference image"
```

