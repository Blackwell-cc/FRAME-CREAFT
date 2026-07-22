# Close-Up Reference Image Design

## Goal

Make the approved clean-studio portrait the built-in reference image for the `Close-Up` technique on the public FRAME / CRAFT website.

## Approved asset

- Source: `public/images/techniques/close-up-korean-actor-clean-studio-v3.webp`
- Technique id: `shot-close-up`
- The same asset appears in the library card and the detail dialog.
- The card keeps the existing responsive `object-fit: cover` crop.
- The detail dialog keeps the existing larger reference-image presentation.

## Architecture

Use a small static map keyed by technique id instead of adding a field to persisted technique records. `FrameCraftApp` initializes its media URL state from this map and merges IndexedDB media over the defaults, so a user-provided image can override the built-in image without changing the local-first data model.

## Alternatives considered

1. Static media map — selected because it works with existing IndexedDB records and permits local overrides.
2. Add `imageUrl` to `Technique` — rejected because previously persisted seed records would not receive the new field automatically.
3. Seed the image blob into IndexedDB — rejected because it duplicates a public asset and complicates migration and backup behavior.

## Validation

- A component test verifies the card image and detail image use the approved URL.
- The full unit, type, lint, build, and rendered HTML checks pass.
- Production is visually checked at desktop and mobile widths before deployment.

