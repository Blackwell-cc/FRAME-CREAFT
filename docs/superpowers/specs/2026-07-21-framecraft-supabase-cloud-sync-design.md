# FRAME / CRAFT Supabase Cloud Sync Design

**Date:** 2026-07-21
**Status:** Approved in conversation; awaiting written-spec review
**Scope:** Move FRAME / CRAFT from browser-only IndexedDB persistence to an owner-managed Supabase cloud database while preserving offline use.

## 1. Goals

- Make the production library available online from multiple devices.
- Let anonymous visitors browse public techniques, images, video links, and copy or compose prompts.
- Allow only the owner to create, edit, delete, migrate, import, or upload content.
- Synchronize the owner's saved prompts, favorites, and settings privately across devices.
- Support both email/password sign-in and a linked Google identity for the same owner account.
- Preserve IndexedDB as a fast local cache and offline write queue.
- Migrate all existing techniques, saved prompts, settings, and the current Close-Up image without deleting the original local data until verification succeeds.
- Stay within a no-cost Supabase plan for the intended personal-use scale.

## 2. Non-goals

- Public account registration or multi-user collaboration.
- Uploading video files; videos remain external URLs.
- Payments, subscriptions, comments, visitor uploads, or visitor profiles.
- Real-time collaborative editing.
- Replacing the current visual design or prompt-composition behavior.
- Embedding Supabase service-role credentials in the website.

## 3. Chosen architecture

Supabase is the cloud system of record and provides three services:

1. **PostgreSQL Database** for techniques, media metadata, private prompts, favorites, settings, ownership, and sync receipts.
2. **Supabase Storage** for technique reference images.
3. **Supabase Auth** for email/password login and a Google identity linked to the same owner account.

The website uses the public Supabase URL and publishable/anonymous key. These values are safe to expose only because every database and storage operation is protected by Row Level Security. The service-role key must never be included in browser code, public environment variables, source control, or deployment artifacts.

IndexedDB remains a local mirror. The app reads cached data immediately, refreshes from Supabase when online, and queues authorized owner changes while offline.

## 4. Access model

### Anonymous visitors

- May select published, non-deleted techniques and their media metadata.
- May read public image objects from the `technique-images` bucket.
- May use search, technique details, Copy, and Prompt Lab in the current browser session.
- Cannot read private prompts, favorites, settings, owner records, sync receipts, or conflicts.
- Cannot insert, update, delete, upload, import, or migrate anything.

### Owner

- Must authenticate with the single approved Supabase Auth account.
- May read and manage all public library records and images.
- May read and manage only private rows whose `user_id` equals `auth.uid()`.
- Is recognized by an `owner_profiles` row keyed by the approved Auth user UUID.

There is no public sign-up interface. The initial owner is created with email/password. While authenticated, the owner links Google from Settings so both sign-in methods resolve to the same Auth user and owner UUID.

## 5. Cloud data model

### `owner_profiles`

- `user_id uuid primary key references auth.users`
- `created_at timestamptz`

Anonymous and normal authenticated users cannot select or modify this table. Owner checks use a small security-definer helper function with a fixed search path rather than exposing the row.

### `techniques`

Stores the current `Technique` fields with database-friendly snake-case names, plus:

- `id text primary key`
- `published boolean default true`
- `version integer default 1`
- `created_at timestamptz`
- `updated_at timestamptz`
- `deleted_at timestamptz null`

Anonymous reads are limited to `published = true and deleted_at is null`. Owner policies allow full CRUD. Deletes are soft deletes first so offline clients can observe tombstones safely.

### `media`

- `id text primary key`
- `technique_id text references techniques(id)`
- `storage_path text unique`
- MIME type, width, height, byte size, Thai/English alt text
- `version`, `created_at`, `updated_at`, and nullable `deleted_at`

The database stores metadata and object paths, not image blobs. Technique and media IDs remain text so migration can preserve current IDs such as `shot-close-up` exactly; no ID remapping is allowed.

### `saved_prompts`

Stores the current `SavedPrompt` fields plus:

- `id text primary key`
- `user_id uuid references auth.users`
- `version`, `created_at`, `updated_at`, and nullable `deleted_at`

All policies require `user_id = auth.uid()`.

### `favorites`

- `user_id uuid references auth.users`
- `entity_type` constrained to `technique` or `prompt`
- `entity_id text`
- `created_at timestamptz`
- Composite primary key on `user_id`, `entity_type`, and `entity_id`

Favorites are removed from the shared `techniques.isFavorite` concept so a private choice cannot leak into public library data.

### `user_settings`

- `user_id uuid primary key references auth.users`
- Language, default mode, default platform
- `version` and `updated_at`

Only the matching owner may select or update the row.

### `sync_receipts`

- `operation_id uuid primary key`
- `user_id uuid references auth.users`
- Entity type, text entity ID, action, applied version, and `applied_at`

This makes retries idempotent when a write succeeds on Supabase but the browser loses the response.

## 6. Image storage

- Use one public-read bucket named `technique-images`.
- Use deterministic object paths: `{owner_user_id}/{technique_id}/{media_id}.{extension}`.
- Anonymous users may read objects.
- Only the owner may insert, update, or delete objects under the owner's path.
- Validate allowed MIME types, maximum byte size, and file signatures in the client before upload; Storage policies provide the final authorization boundary.
- Upload the current Close-Up image during migration and write its resulting object path to `media`.
- Video references remain validated external URLs and never consume Supabase Storage.

## 7. Repository boundaries in the app

Keep UI components independent from Supabase by introducing interfaces:

- `TechniqueRepository`
- `MediaRepository`
- `PromptRepository`
- `FavoritesRepository`
- `SettingsRepository`
- `AuthRepository`
- `SyncEngine`

Supabase adapters handle network operations. Dexie adapters handle cache, queue, conflicts, and existing backup compatibility. UI components call repositories rather than importing the Supabase client directly.

The current large `FrameCraftApp` orchestration should be split only where necessary for authentication, sync status, migration, and repository composition. Unrelated visual refactoring is out of scope.

## 8. Offline and synchronization behavior

### Startup

1. Open Dexie and render the most recent cached public data.
2. Restore the current Auth session if available.
3. Fetch permitted Supabase rows.
4. Merge newer cloud rows and tombstones into Dexie.
5. Re-render and update the last-sync timestamp.
6. If the owner is online, process the pending queue.

### Owner write

1. Validate the change.
2. Commit the local entity and a queue operation in one Dexie transaction.
3. Show the local result immediately.
4. When online, send the operation through a database RPC using `operation_id` and `base_version`.
5. On success, store the new server version locally and remove the queue item.

### Conflict handling

- The RPC applies a change only when the supplied `base_version` matches the current row version.
- A repeated `operation_id` returns its existing receipt instead of applying twice.
- A version mismatch does not overwrite either side silently.
- The local payload is moved to `sync_conflicts`, and the owner sees a review action with two explicit choices: keep the cloud version or overwrite it with the local version.
- Public visitors never create queue entries.

### Offline status

The UI exposes four states: `Cloud Connected`, `Syncing`, `Offline — waiting to sync`, and `Needs review`. It also shows last-sync time and pending-operation count to the owner.

## 9. IndexedDB upgrade

Upgrade the existing Dexie database without deleting its current stores. Add:

- `syncQueue`
- `syncConflicts`
- `syncMetadata`

Existing techniques, prompts, media blobs, settings, and backup/restore behavior remain readable. Cloud storage paths are added alongside local image blobs during the transition so the site can roll back safely.

## 10. One-time migration

The migration wizard is visible only to the owner and performs these steps:

1. Generate and download a pre-migration Backup ZIP.
2. Inspect the existing IndexedDB records and embedded starter data.
3. Show counts for techniques, saved prompts, media, favorites, and settings.
4. Upload images with deterministic paths.
5. Upsert public and private records using stable IDs.
6. Read back all inserted records and verify counts, IDs, and image availability.
7. Mark the migration complete only after verification succeeds.

Migration is restartable and idempotent. Failure never clears IndexedDB. The public site continues using the local/starter fallback until the verified cloud dataset is available.

## 11. Owner interface

Public visitors keep the current browsing experience. Owner-only controls are hidden while signed out.

Settings gains:

- Owner Login modal
- Email/password sign-in
- Password reset
- Link Google identity
- Sign out
- Cloud status and last-sync time
- Pending and conflicted operation counts
- Sync Now
- Export Backup
- Migrate Existing Data

After authentication, Add, Edit, Delete, Import, Restore, and image-upload controls become available. Authentication alone is not authorization; `owner_profiles` and RLS remain the final enforcement layer.

## 12. Error handling

User-facing messages must state what happened and whether data is safe:

- Network failure: local save succeeded and is queued.
- Expired session: local data remains safe; re-authentication is required before sync.
- Authorization failure: no cloud write occurred.
- Storage quota or file validation failure: metadata is not committed without its required image.
- Partial migration: IndexedDB remains authoritative and the migration can resume.
- Sync conflict: no automatic overwrite; owner review is required.

All error paths retain enough structured detail for tests and diagnostics without exposing secrets to users.

## 13. Security and configuration

- Enable RLS on every exposed table and on `storage.objects` policies.
- Default-deny all writes, then grant only explicit owner operations.
- Test policies using anonymous, non-owner authenticated, and owner sessions.
- Keep Google OAuth client secret in Supabase/Google configuration, not in the website.
- Deploy only the Supabase URL and publishable key to the browser environment.
- Never log access tokens, passwords, reset links, OAuth secrets, or service-role keys.
- Configure allowed redirect URLs for local development and the exact production origin.
- Disable or omit public sign-up UI; non-owner accounts receive no write capability even if an identity exists.

## 14. Verification requirements

Before public deployment, verify:

- Anonymous public reads work and anonymous writes fail.
- A non-owner authenticated session cannot read private rows or write public rows/storage.
- The owner can CRUD techniques and private data and can replace/delete images.
- Email/password, reset, Google linking, Google login, session restoration, and sign-out work.
- Saved prompts, favorites, and settings never appear in anonymous responses.
- Offline changes survive reload and synchronize after reconnection.
- Duplicate retries are idempotent and version conflicts require review.
- Migration creates a backup, preserves stable IDs, uploads Close-Up, verifies all counts, and does not clear IndexedDB on failure.
- Existing search, details, Copy, Add, Prompt Lab, typography, button feedback, and clean Close-Up imagery remain intact.
- Unit tests, RLS/security tests, TypeScript, lint, build, and browser QA pass.

## 15. Rollout and rollback

1. Create the Supabase project and owner account under the user's control.
2. Apply reviewed SQL migrations and storage policies.
3. Configure local environment and verify with empty cloud data.
4. Implement repositories, auth, cache sync, and migration behind a cloud-readiness gate.
5. Run the one-time migration and verify read-back.
6. Publish the updated site only after all security and regression checks pass.

Rollback keeps the current IndexedDB data and Backup ZIP. If cloud configuration fails, the application remains able to render cached/starter data and owner cloud writes remain disabled rather than falling back to insecure writes.

## 16. Free-plan constraints

The design targets Supabase Free limits current at design time: 500 MB database, 1 GB file storage, and 5 GB egress. Images should be resized and compressed before upload, and video files are excluded. The owner should monitor project usage in Supabase. Free projects may pause after inactivity, so the app must distinguish a sleeping/unavailable cloud from an empty dataset and continue to show cached data without destructive reseeding.
