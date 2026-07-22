# FRAME / CRAFT Supabase Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move FRAME / CRAFT to an owner-managed Supabase database and image store with public read access, owner-only writes, private cross-device data, and resilient IndexedDB offline sync.

**Architecture:** Supabase PostgreSQL, Storage, and Auth are the cloud system of record. Repository interfaces isolate UI code from Supabase, while Dexie remains the local cache, write queue, conflict store, and rollback source. Database RLS and Storage policies enforce public-read/owner-write access independently of UI visibility.

**Tech Stack:** React 19, TypeScript 5.9, vinext/Next 16, Dexie 4, Supabase JS 2, PostgreSQL/RLS, Supabase Storage/Auth, Vitest, Testing Library, pgTAP/Supabase CLI.

## Global Constraints

- Anonymous visitors may read published techniques and images but may never write cloud data.
- Only the single user listed in `owner_profiles` may manage public library data.
- Saved prompts, favorites, and settings are private to `auth.uid()`.
- Support email/password login, password reset, and a Google identity linked to the same owner account.
- Keep IndexedDB data and Backup ZIP compatibility throughout migration and rollback.
- Keep videos as validated external URLs; upload images only.
- Never expose, commit, log, or deploy a Supabase service-role key, Google client secret, password, reset link, or access token.
- Only the Supabase project URL and publishable key may reach browser code.
- Preserve the existing visual design, public browsing, Copy, Add, Prompt Lab, and clean Close-Up reference behavior.
- Use TDD for every code task and commit each independently testable task.

---

## File map

### New cloud and sync files

- `app/framecraft/cloud/config.ts` — validates public Supabase configuration.
- `app/framecraft/cloud/client.ts` — creates the browser Supabase client.
- `app/framecraft/cloud/contracts.ts` — repository, auth, sync, queue, conflict, and status interfaces.
- `app/framecraft/cloud/mappers.ts` — converts application camel-case records to cloud snake-case rows and back.
- `app/framecraft/cloud/repositories.ts` — public/private Supabase data access without UI state.
- `app/framecraft/cloud/auth.ts` — owner sign-in, reset, Google linking, session, and sign-out.
- `app/framecraft/cloud/sync-engine.ts` — startup refresh, offline queue processing, receipt handling, and conflicts.
- `app/framecraft/cloud/migration-service.ts` — safe, idempotent IndexedDB-to-Supabase migration and read-back verification.
- `app/framecraft/OwnerAuthPanel.tsx` — owner login and identity controls.
- `app/framecraft/SyncStatus.tsx` — connection, pending, last-sync, and conflict states.
- `app/framecraft/MigrationWizard.tsx` — preflight, backup, upload, verification, resume, and completion UI.

### New Supabase files

- `supabase/migrations/202607210001_framecraft_schema.sql` — tables, constraints, indexes, RLS, and Storage bucket policies.
- `supabase/migrations/202607210002_framecraft_sync_rpc.sql` — idempotent version-checked sync RPC functions.
- `supabase/tests/framecraft_rls.test.sql` — pgTAP access-policy tests.
- `.env.example` — public variable names only; no values or secrets.

### Existing files to modify

- `package.json` and lockfile — add `@supabase/supabase-js` and Supabase scripts.
- `app/framecraft/types.ts` — separate public technique state from private favorite state and add cloud metadata types.
- `app/framecraft/storage.ts` — Dexie v2 queue, conflict, and sync metadata stores.
- `app/framecraft/backup-service.ts` — retain backup compatibility while including favorites and sync-safe metadata.
- `app/framecraft/FrameCraftApp.tsx` — compose repositories, auth, sync, migration, and owner-only actions.
- `app/framecraft/framecraft.css` — style auth, sync, and migration states within the monochrome design system.

### New and modified tests

- `tests/cloud-config.test.ts`
- `tests/cloud-mappers.test.ts`
- `tests/cloud-repositories.test.ts`
- `tests/auth-repository.test.ts`
- `tests/offline-storage.test.ts`
- `tests/sync-engine.test.ts`
- `tests/migration-service.test.ts`
- `tests/owner-cloud-ui.test.tsx`
- Modify `tests/backup-service.test.ts`, `tests/app-flow.test.tsx`, and `tests/design-system.test.ts`.

---

### Task 1: Create the user-owned Supabase project and public configuration contract

**Files:**
- Create: `.env.example`
- Create: `app/framecraft/cloud/config.ts`
- Test: `tests/cloud-config.test.ts`
- Modify: `package.json`
- Modify: package lockfile

**Interfaces:**
- Produces: `CloudConfig`, `readCloudConfig(env)`, and `isCloudConfigured(config)`.
- Consumes: the real project URL and publishable key entered locally by the user.

- [ ] **Step 1: Create the Supabase project under the user's account**

Open `https://supabase.com/dashboard`, create a Free project named `framecraft-production`, choose the Singapore region, and save the database password in the user's password manager. Do not paste the password into Codex or commit it.

- [ ] **Step 2: Record only browser-safe project values locally**

From Project Settings → API, copy the Project URL and Publishable key into an ignored `.env.local`. In the editor, create exactly two lines: the first starts with `NEXT_PUBLIC_SUPABASE_URL=` followed immediately by the displayed Project URL; the second starts with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` followed immediately by the displayed Publishable key. Never use or request the service-role key.

- [ ] **Step 3: Add the dependency**

Run:

```powershell
npm install @supabase/supabase-js@^2
npm install --save-dev supabase@^2
```

Expected: dependency and lockfile update with exit code 0.

- [ ] **Step 4: Write the failing configuration tests**

```ts
import { describe, expect, it } from "vitest";
import { isCloudConfigured, readCloudConfig } from "../app/framecraft/cloud/config";

describe("cloud config", () => {
  it("accepts a valid Supabase URL and publishable key", () => {
    const config = readCloudConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc123.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    });
    expect(config.url).toBe("https://abc123.supabase.co");
    expect(isCloudConfigured(config)).toBe(true);
  });

  it("keeps the app in local mode when either value is missing", () => {
    expect(isCloudConfigured(readCloudConfig({}))).toBe(false);
  });
});
```

- [ ] **Step 5: Run the test and verify RED**

Run: `npx vitest run tests/cloud-config.test.ts`

Expected: FAIL because `app/framecraft/cloud/config.ts` does not exist.

- [ ] **Step 6: Implement the minimal configuration boundary**

```ts
export interface CloudConfig {
  url: string;
  publishableKey: string;
}

export function readCloudConfig(env: Record<string, string | undefined>): CloudConfig {
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
  };
}

export function isCloudConfigured(config: CloudConfig) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url) && config.publishableKey.startsWith("sb_publishable_");
}
```

Create `.env.example` containing only:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- [ ] **Step 7: Run GREEN and commit**

Run: `npx vitest run tests/cloud-config.test.ts`

Expected: 2 tests pass.

```powershell
git add package.json package-lock.json .env.example app/framecraft/cloud/config.ts tests/cloud-config.test.ts
git commit -m "feat: add Supabase public configuration"
```

---

### Task 2: Create the cloud schema, RLS policies, and image bucket

**Files:**
- Create: `supabase/migrations/202607210001_framecraft_schema.sql`
- Create: `supabase/tests/framecraft_rls.test.sql`
- Modify: `package.json`

**Interfaces:**
- Produces: `owner_profiles`, `techniques`, `media`, `saved_prompts`, `favorites`, `user_settings`, `sync_receipts`, `is_framecraft_owner()`, and `technique-images`.
- Consumes: authenticated `auth.uid()` and stable text entity IDs.

- [ ] **Step 1: Add database test scripts**

Add these scripts to `package.json`:

```json
{
  "db:start": "supabase start",
  "db:reset": "supabase db reset",
  "db:test": "supabase test db"
}
```

- [ ] **Step 2: Write pgTAP expectations before the migration**

The SQL test must assert all of the following with explicit `has_table`, `has_function`, `policies_are`, and role-switch checks:

```sql
begin;
select plan(14);
select has_table('public', 'techniques');
select has_table('public', 'media');
select has_table('public', 'saved_prompts');
select has_table('public', 'favorites');
select has_table('public', 'user_settings');
select has_table('public', 'owner_profiles');
select has_table('public', 'sync_receipts');
select has_function('public', 'is_framecraft_owner', array[]::text[]);
select is((select public.is_framecraft_owner()), false, 'anonymous is not owner');
select ok((select rowsecurity from pg_tables where schemaname='public' and tablename='techniques'), 'techniques RLS enabled');
select ok((select rowsecurity from pg_tables where schemaname='public' and tablename='saved_prompts'), 'saved prompts RLS enabled');
select ok(exists(select 1 from storage.buckets where id='technique-images' and public), 'public image bucket exists');
select is((select count(*)::int from pg_policies where tablename='techniques' and cmd='INSERT'), 1, 'one guarded insert policy');
select is((select count(*)::int from pg_policies where tablename='saved_prompts' and cmd='SELECT'), 1, 'one private select policy');
select * from finish();
rollback;
```

- [ ] **Step 3: Run the database test and verify RED**

Run: `npm run db:start` then `npm run db:test`.

Expected: FAIL because the tables and function are missing.

- [ ] **Step 4: Implement the migration**

Create exact typed tables. Preserve current string IDs such as `shot-close-up` with `text primary key`. Include all current `Technique` fields as explicit columns, `version integer not null default 1`, server `updated_at`, and nullable `deleted_at`. Use checks for category, source type, prompt mode, platform, and favorite entity type.

Implement the owner helper and access pattern:

```sql
create or replace function public.is_framecraft_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.owner_profiles
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_framecraft_owner() from public;
grant execute on function public.is_framecraft_owner() to anon, authenticated;

alter table public.techniques enable row level security;

create policy "public reads published techniques"
on public.techniques for select
to anon, authenticated
using ((published and deleted_at is null) or public.is_framecraft_owner());

create policy "owner inserts techniques"
on public.techniques for insert
to authenticated
with check (public.is_framecraft_owner());

create policy "owner updates techniques"
on public.techniques for update
to authenticated
using (public.is_framecraft_owner())
with check (public.is_framecraft_owner());

create policy "owner deletes techniques"
on public.techniques for delete
to authenticated
using (public.is_framecraft_owner());
```

Apply the same public-read/owner-write model to `media`. Apply `user_id = auth.uid()` plus owner checks to private tables. Insert the bucket idempotently and authorize writes only when the first storage path segment equals `auth.uid()::text` and `is_framecraft_owner()` is true.

- [ ] **Step 5: Run GREEN against local Supabase**

Run: `npm run db:reset` then `npm run db:test`.

Expected: all 14 pgTAP assertions pass.

- [ ] **Step 6: Apply the reviewed migration to the user's project**

Use Supabase Dashboard → SQL Editor. Paste only the committed migration, review the target project name, run it once, and confirm all seven tables and the `technique-images` bucket appear. Do not paste secrets into SQL.

- [ ] **Step 7: Create the owner record safely**

In Supabase Dashboard → Authentication → Users, create the email/password owner and copy the resulting user UUID. Open Table Editor → `owner_profiles` → Insert row, paste that exact UUID into `user_id`, leave `created_at` at its database default, and save. Do not commit the UUID.

- [ ] **Step 8: Commit**

```powershell
git add package.json supabase/migrations/202607210001_framecraft_schema.sql supabase/tests/framecraft_rls.test.sql
git commit -m "feat: add protected FrameCraft cloud schema"
```

---

### Task 3: Add cloud contracts, mappings, and public/private repositories

**Files:**
- Create: `app/framecraft/cloud/client.ts`
- Create: `app/framecraft/cloud/contracts.ts`
- Create: `app/framecraft/cloud/mappers.ts`
- Create: `app/framecraft/cloud/repositories.ts`
- Test: `tests/cloud-mappers.test.ts`
- Test: `tests/cloud-repositories.test.ts`

**Interfaces:**
- Produces: `CloudTechniqueRow`, `CloudMediaRow`, `CloudSavedPromptRow`, `CloudFavoriteRow`, `CloudSettingsRow`, mapping functions, and repository factories.
- Consumes: existing `Technique`, `MediaRecord`, `SavedPrompt`, `AppSettings`, and a Supabase client.

- [ ] **Step 1: Write failing round-trip mapper tests**

Test that `toCloudTechnique(starterTechniques[0])` uses snake-case fields and `fromCloudTechnique(toCloudTechnique(value))` preserves every application field and stable ID. Add equivalent tests for saved prompts and settings.

Run: `npx vitest run tests/cloud-mappers.test.ts`

Expected: FAIL because the mappers do not exist.

- [ ] **Step 2: Define focused repository contracts**

```ts
export interface PublicTechniqueRepository {
  listPublished(): Promise<Technique[]>;
}

export type SyncApplyResult =
  | { status: "applied"; version: number }
  | { status: "conflict"; cloudVersion: number; cloudPayload: unknown };

export interface OwnerTechniqueRepository extends PublicTechniqueRepository {
  upsert(record: Technique, baseVersion: number | null, operationId: string): Promise<SyncApplyResult>;
  remove(id: string, baseVersion: number, operationId: string): Promise<SyncApplyResult>;
}

export interface PrivatePromptRepository {
  listMine(): Promise<SavedPrompt[]>;
  upsertMine(record: SavedPrompt, baseVersion: number | null, operationId: string): Promise<SyncApplyResult>;
  removeMine(id: string, baseVersion: number, operationId: string): Promise<SyncApplyResult>;
}
```

Define matching media, favorites, settings, auth, queue, conflict, and sync-status interfaces in the same file.

- [ ] **Step 3: Implement mappings and client creation**

`client.ts` calls `createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })` only when `isCloudConfigured(config)` is true. It returns `null` in local-only mode.

- [ ] **Step 4: Write repository tests with a scripted Supabase mock**

Cover published technique selection, private prompt selection by user policy, missing configuration, API errors, and correct RPC parameters. The repository must throw a typed `CloudRepositoryError` with `code`, `operation`, and safe `message` fields; never include tokens or raw headers.

- [ ] **Step 5: Implement repositories minimally**

Public reads use `.from("techniques").select("*").eq("published", true).is("deleted_at", null)`. Owner mutations call the versioned RPCs from Task 6 rather than direct unguarded updates. Media repository uploads to deterministic Storage paths and commits metadata only after upload succeeds.

- [ ] **Step 6: Run focused and existing tests**

Run: `npx vitest run tests/cloud-mappers.test.ts tests/cloud-repositories.test.ts tests/storage.test.ts tests/media-repository.test.ts`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```powershell
git add app/framecraft/cloud tests/cloud-mappers.test.ts tests/cloud-repositories.test.ts
git commit -m "feat: add Supabase repository boundaries"
```

---

### Task 4: Add owner authentication and linked Google identity

**Files:**
- Create: `app/framecraft/cloud/auth.ts`
- Create: `app/framecraft/OwnerAuthPanel.tsx`
- Test: `tests/auth-repository.test.ts`
- Test: `tests/owner-cloud-ui.test.tsx`
- Modify: `app/framecraft/framecraft.css`

**Interfaces:**
- Produces: `OwnerSession`, `AuthRepository`, `createAuthRepository(client)`, and `OwnerAuthPanel`.
- Consumes: configured Supabase client and exact production/local redirect URLs.

- [ ] **Step 1: Write failing auth repository tests**

Cover `signInWithPassword`, `sendPasswordReset`, `linkGoogle`, `getSession`, `onAuthStateChange`, and `signOut`. Assert that auth success is followed by an owner check and a valid session without an owner row becomes `{ state: "viewer" }`, never an owner.

- [ ] **Step 2: Implement the auth repository**

Use these exact operations:

```ts
client.auth.signInWithPassword({ email, password });
client.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/reset` });
client.auth.linkIdentity({ provider: "google", options: { redirectTo: origin } });
client.auth.getSession();
client.auth.signOut();
```

After every session change, call `rpc("is_framecraft_owner")`. Only `true` enables owner mode.

- [ ] **Step 3: Configure Google in the user's dashboards**

In Google Cloud Console, create an OAuth web client using the callback URL shown by Supabase Auth → Providers → Google. Store the Google Client ID and Client Secret only inside Supabase's Google provider settings. Add local and production website origins to the allowed redirect list. Never send the client secret in chat.

- [ ] **Step 4: Write failing component tests**

Assert signed-out login form, Thai validation, password reset feedback, owner controls, link-Google action, sign-out, and viewer denial. Assert there is no public sign-up button.

- [ ] **Step 5: Implement `OwnerAuthPanel` and styles**

Use Prompt font and existing monochrome tokens. Keep password values in component state only, clear them after submit, and never persist them to Dexie.

- [ ] **Step 6: Run tests and commit**

Run: `npx vitest run tests/auth-repository.test.ts tests/owner-cloud-ui.test.tsx tests/design-system.test.ts`

Expected: all tests pass.

```powershell
git add app/framecraft/cloud/auth.ts app/framecraft/OwnerAuthPanel.tsx app/framecraft/framecraft.css tests/auth-repository.test.ts tests/owner-cloud-ui.test.tsx
git commit -m "feat: add protected owner authentication"
```

---

### Task 5: Upgrade Dexie for offline queue, conflicts, and sync metadata

**Files:**
- Modify: `app/framecraft/types.ts`
- Modify: `app/framecraft/storage.ts`
- Test: `tests/offline-storage.test.ts`
- Modify: `tests/storage.test.ts`

**Interfaces:**
- Produces: `SyncQueueRecord`, `SyncConflictRecord`, `SyncMetadataRecord`, `syncQueueRepository`, `syncConflictRepository`, and `syncMetadataRepository`.
- Consumes: existing Dexie `framecraft` database without clearing version 1 stores.

- [ ] **Step 1: Write failing Dexie upgrade tests**

Create a v1 database with an edited technique and image Blob, close it, open with the new class, and assert the original rows remain while new stores exist. Test atomic local entity + queue writes and FIFO queue listing.

- [ ] **Step 2: Define sync records**

```ts
export type SyncEntity = "technique" | "media" | "saved_prompt" | "favorite" | "user_settings";
export type SyncAction = "upsert" | "delete";

export interface SyncQueueRecord {
  operationId: string;
  userId: string;
  entity: SyncEntity;
  entityId: string;
  action: SyncAction;
  baseVersion: number | null;
  payload: unknown;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyncConflictRecord extends SyncQueueRecord {
  cloudPayload: unknown;
  cloudVersion: number;
  detectedAt: string;
}
```

- [ ] **Step 3: Add Dexie version 2 without destructive changes**

```ts
this.version(2).stores({
  techniques: "id, slug, category, sourceType, isHidden, updatedAt, *tags, *moods",
  prompts: "id, mode, platform, updatedAt",
  media: "id, techniqueId, updatedAt",
  settings: "id",
  meta: "key",
  syncQueue: "operationId, userId, entity, entityId, createdAt",
  syncConflicts: "operationId, userId, entity, entityId, detectedAt",
  syncMetadata: "key, updatedAt",
});
```

Favorites become their own local store instead of mutating public technique rows. Add it in version 2 and migrate existing `isFavorite` values into owner-scoped favorites only after the owner session is known.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run tests/offline-storage.test.ts tests/storage.test.ts tests/media-repository.test.ts tests/prompt-repository.test.ts tests/settings-repository.test.ts`

Expected: all tests pass and v1 data remains.

```powershell
git add app/framecraft/types.ts app/framecraft/storage.ts tests/offline-storage.test.ts tests/storage.test.ts
git commit -m "feat: add offline sync persistence"
```

---

### Task 6: Add idempotent version-checked RPCs and the sync engine

**Files:**
- Create: `supabase/migrations/202607210002_framecraft_sync_rpc.sql`
- Create: `app/framecraft/cloud/sync-engine.ts`
- Create: `app/framecraft/SyncStatus.tsx`
- Test: `tests/sync-engine.test.ts`
- Modify: `supabase/tests/framecraft_rls.test.sql`
- Modify: `app/framecraft/framecraft.css`

**Interfaces:**
- Produces: `apply_framecraft_operation(...)`, `SyncEngine.start()`, `syncNow()`, `resolveConflict()`, `subscribeStatus()`, and `SyncStatus`.
- Consumes: repository contracts and Dexie sync repositories.

- [ ] **Step 1: Extend pgTAP tests for RPC security and conflicts**

Test owner success, anonymous denial, non-owner denial, duplicate `operation_id` receipt reuse, base-version conflict, soft delete, and server version increment.

- [ ] **Step 2: Implement a fixed-entity RPC**

The function accepts `p_operation_id uuid`, `p_entity text`, `p_entity_id text`, `p_action text`, `p_base_version integer`, and `p_payload jsonb`. It must:

1. Reject unless `is_framecraft_owner()` is true.
2. Return an existing `sync_receipts` result for duplicate operation IDs.
3. Lock the target row with `for update`.
4. Return `{ status: "conflict", cloudVersion, cloudPayload }` when versions differ.
5. Use an explicit `case p_entity` with typed column assignments; never concatenate table names or SQL.
6. Increment `version`, set server `updated_at`, and soft-delete via `deleted_at`.
7. Insert a receipt and return `{ status: "applied", version }` in the same transaction.

Revoke function execution from `public` and `anon`; grant only to `authenticated`.

- [ ] **Step 3: Run database tests GREEN and apply migration**

Run: `npm run db:reset` then `npm run db:test`.

Expected: all original and new pgTAP tests pass.

Apply the committed RPC migration in the user's Supabase SQL Editor and verify the function appears under Database → Functions.

- [ ] **Step 4: Write failing sync-engine tests**

Cover cached-first startup, online refresh, FIFO processing, successful receipt removal, response-loss retry, expired auth pause, offline preservation, conflict storage, and explicit cloud/local conflict resolution.

- [ ] **Step 5: Implement the sync engine**

Use one processor lock so two browser events cannot process the queue concurrently. Listen to `online`, `offline`, and auth changes. Never treat a cloud error or paused project as an empty dataset. Only a successful query with an empty result may update the cache to empty.

- [ ] **Step 6: Implement `SyncStatus` and run tests**

Render exactly four primary states: `Cloud Connected`, `Syncing`, `Offline — waiting to sync`, and `Needs review`, plus pending count and last-sync time for the owner.

Run: `npx vitest run tests/sync-engine.test.ts tests/owner-cloud-ui.test.tsx tests/design-system.test.ts`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```powershell
git add supabase/migrations/202607210002_framecraft_sync_rpc.sql supabase/tests/framecraft_rls.test.sql app/framecraft/cloud/sync-engine.ts app/framecraft/SyncStatus.tsx app/framecraft/framecraft.css tests/sync-engine.test.ts
git commit -m "feat: add conflict-safe cloud synchronization"
```

---

### Task 7: Add verified one-time migration and backup compatibility

**Files:**
- Create: `app/framecraft/cloud/migration-service.ts`
- Create: `app/framecraft/MigrationWizard.tsx`
- Test: `tests/migration-service.test.ts`
- Modify: `app/framecraft/backup-service.ts`
- Modify: `tests/backup-service.test.ts`
- Modify: `app/framecraft/framecraft.css`

**Interfaces:**
- Produces: `inspectMigration()`, `runMigration()`, `resumeMigration()`, `verifyMigration()`, `MigrationReport`, and `MigrationWizard`.
- Consumes: existing Dexie repositories, backup archive service, cloud repositories, and owner session.

- [ ] **Step 1: Write failing migration tests**

Cover pre-migration backup first, count preflight, stable text IDs, deterministic image paths, Close-Up upload, private `user_id` assignment, retry after partial upload, idempotent rerun, read-back mismatch, and no IndexedDB deletion on every failure path.

- [ ] **Step 2: Extend backup format compatibly**

Add optional `favorites` and cloud metadata fields under a new manifest version while continuing to import the old manifest. Reject archives with invalid IDs, unsafe URLs, unexpected files, or count/hash mismatches before any replace transaction.

- [ ] **Step 3: Implement migration phases**

```ts
export type MigrationPhase =
  | "idle"
  | "backup-required"
  | "preflight"
  | "uploading-media"
  | "uploading-records"
  | "verifying"
  | "complete"
  | "failed";
```

Persist the last completed phase and uploaded object paths in `syncMetadata`. Set `migration-complete` only when record IDs/counts match and every referenced image returns successfully.

- [ ] **Step 4: Implement `MigrationWizard`**

Require owner authentication, show counts before upload, force the Backup ZIP step, show per-phase progress, expose safe retry, and never present a success state until read-back verification passes.

- [ ] **Step 5: Run tests and commit**

Run: `npx vitest run tests/migration-service.test.ts tests/backup-service.test.ts tests/media-service.test.ts`

Expected: all tests pass.

```powershell
git add app/framecraft/cloud/migration-service.ts app/framecraft/MigrationWizard.tsx app/framecraft/backup-service.ts app/framecraft/framecraft.css tests/migration-service.test.ts tests/backup-service.test.ts
git commit -m "feat: add verified cloud migration"
```

---

### Task 8: Integrate cloud ownership without changing the public experience

**Files:**
- Modify: `app/framecraft/FrameCraftApp.tsx`
- Modify: `app/framecraft/types.ts`
- Modify: `app/framecraft/TechniqueCard.tsx`
- Modify: `app/framecraft/framecraft.css`
- Modify: `tests/app-flow.test.tsx`
- Modify: `tests/owner-cloud-ui.test.tsx`
- Modify: `tests/design-system.test.ts`

**Interfaces:**
- Consumes: cloud config/client, repositories, auth repository, sync engine, `OwnerAuthPanel`, `SyncStatus`, and `MigrationWizard`.
- Produces: final owner-gated FRAME / CRAFT application behavior.

- [ ] **Step 1: Write failing public/owner integration tests**

Assert anonymous visitors can browse, Copy, and use Prompt Lab but cannot see Add Technique, Manage Library, Import, Restore, Delete, or image-upload controls. Assert owner mode reveals those controls and every mutation writes locally plus queues a cloud operation.

- [ ] **Step 2: Move favorites out of public techniques**

Derive card favorite state from the private favorites repository when owner-authenticated. Anonymous visitors see an unselected local-session heart without loading private cloud rows.

- [ ] **Step 3: Compose cloud services at the app boundary**

Keep `persistence="memory"` tests local. In IndexedDB mode, render cached data first, start auth/session restoration, fetch public cloud data only when configured, and preserve starter data on connection errors. Route all owner mutations through a local transaction + queue helper.

- [ ] **Step 4: Add owner controls to Settings**

Place `OwnerAuthPanel`, `SyncStatus`, `MigrationWizard`, Backup, Import, and Restore in Settings. Hide manage navigation and create/edit/delete controls when not owner-authorized.

- [ ] **Step 5: Run regression suites**

Run:

```powershell
npx vitest run tests/app-flow.test.tsx tests/owner-cloud-ui.test.tsx tests/design-system.test.ts tests/copy-button.test.tsx tests/chapter-components.test.tsx
```

Expected: all public and owner tests pass, including clean Close-Up image assertions.

- [ ] **Step 6: Commit**

```powershell
git add app/framecraft/FrameCraftApp.tsx app/framecraft/types.ts app/framecraft/TechniqueCard.tsx app/framecraft/framecraft.css tests/app-flow.test.tsx tests/owner-cloud-ui.test.tsx tests/design-system.test.ts
git commit -m "feat: integrate owner-managed cloud library"
```

---

### Task 9: Security verification, guided migration, and public deployment

**Files:**
- Create: `docs/framecraft-supabase-owner-guide.md`
- Modify: relevant tests only if verification exposes defects

**Interfaces:**
- Consumes: complete feature and the user's configured Supabase project.
- Produces: verified cloud data, owner runbook, and a deployed public site.

- [ ] **Step 1: Write the owner guide**

Document exact dashboard paths for project status, Table Editor, Storage, Auth users/providers, usage limits, password reset, linking Google, Backup ZIP, Sync Now, conflicts, migration retry, and rollback. Include a warning list of values that must never be shared.

- [ ] **Step 2: Run the complete automated verification**

Run each command and require exit code 0:

```powershell
npm run test:unit
npx tsc --noEmit
npm run lint
npm test
git diff --check
```

Run `npm run db:test` against local Supabase and require all pgTAP policy/RPC assertions to pass.

- [ ] **Step 3: Perform adversarial access checks**

Use an anonymous client and a non-owner test user to attempt public inserts/updates/deletes, private selects, RPC calls, and Storage uploads/deletes. Every attempt must be denied. Delete the non-owner test user after the checks.

- [ ] **Step 4: Configure production browser-safe environment**

Set only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Sites runtime environment. Confirm no service-role or Google secret appears in the repository, build output, browser bundle, logs, or deployment configuration.

- [ ] **Step 5: Migrate the user's existing data with checkpoints**

1. Log in as owner with email/password.
2. Download and open the pre-migration Backup ZIP.
3. Record preflight counts.
4. Run migration.
5. Confirm read-back counts, stable IDs, and Close-Up image.
6. Open a second browser/device and confirm public data plus private owner data after login.
7. Simulate offline edit, reconnect, and confirm queue clears.
8. Do not clear original IndexedDB.

- [ ] **Step 6: Browser QA locally and in production**

Verify desktop and mobile public browsing, owner login, Google link/login, Settings, cloud status, offline indicator, migration completion, image upload/replace/delete, Copy feedback, Prompt Lab, chapter navigation, dropdown contrast, and clean Close-Up card/detail frames.

- [ ] **Step 7: Deploy only after explicit public approval**

Save a new Sites version from the exact tested commit, request explicit public deployment approval, deploy to the existing FRAME / CRAFT URL, poll until succeeded, and repeat production smoke tests.

- [ ] **Step 8: Commit the guide and final verification fixes**

```powershell
git add docs/framecraft-supabase-owner-guide.md
git commit -m "docs: add FrameCraft cloud owner guide"
```

---

## Completion criteria

- The user controls the Supabase project and can inspect tables, storage, users, and usage in their dashboard.
- Public visitors read the full published library without signing in and cannot mutate any cloud resource.
- Only the owner can manage library records and images.
- Owner prompts, favorites, and settings sync privately across devices.
- Email/password, password reset, linked Google login, and sign-out are verified.
- Cached data opens offline; queued writes resume safely; conflicts never overwrite silently.
- Existing data and Close-Up media migrate with verified counts and stable IDs.
- Original IndexedDB and a valid Backup ZIP remain available for rollback.
- All unit, policy, type, lint, build, and browser checks pass before deployment.
