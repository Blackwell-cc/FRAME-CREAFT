import type {
  AppSettings,
  MediaRecord,
  PlatformPresetId,
  PromptInput,
  PromptMode,
  SavedPrompt,
  Technique,
  TechniqueCategory,
} from "../types";

export interface CloudTechniqueRow {
  id: string;
  slug: string;
  schema_version: 1;
  source_type: "seed" | "custom";
  category: TechniqueCategory;
  title_en: string;
  title_th: string;
  abbreviation: string | null;
  description_en: string;
  description_th: string;
  use_cases_th: string;
  effect_th: string;
  warnings_th: string;
  tags: string[];
  moods: string[];
  recommended_lenses: string[];
  camera_settings: string[];
  image_keywords: string[];
  video_keywords: string[];
  generic_image_prompt: string;
  generic_video_prompt: string;
  video_reference_url: string | null;
  is_hidden: boolean;
  published: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CloudMediaRow {
  id: string;
  technique_id: string;
  storage_path: string;
  mime_type: string;
  width: number;
  height: number;
  byte_size: number;
  alt_th: string;
  alt_en: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CloudSavedPromptRow {
  id: string;
  user_id: string;
  name: string;
  mode: PromptMode;
  platform: PlatformPresetId;
  input: PromptInput;
  generated_prompt: string;
  edited_prompt: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CloudFavoriteRow {
  user_id: string;
  entity_type: "technique" | "prompt";
  entity_id: string;
  created_at: string;
}

export interface CloudSettingsRow {
  user_id: string;
  language: "th" | "en";
  default_mode: PromptMode;
  default_platform: PlatformPresetId;
  version: number;
  updated_at: string;
}

export type SyncApplyResult =
  | { status: "applied"; version: number }
  | { status: "conflict"; cloudVersion: number; cloudPayload: unknown };

export interface PublicTechniqueRepository {
  listPublished(): Promise<Technique[]>;
}

export interface OwnerTechniqueRepository extends PublicTechniqueRepository {
  upsert(
    record: Technique,
    baseVersion: number | null,
    operationId: string,
  ): Promise<SyncApplyResult>;
  remove(
    id: string,
    baseVersion: number,
    operationId: string,
  ): Promise<SyncApplyResult>;
}

export interface PrivatePromptRepository {
  listMine(): Promise<SavedPrompt[]>;
  upsertMine(
    record: SavedPrompt,
    baseVersion: number | null,
    operationId: string,
  ): Promise<SyncApplyResult>;
  removeMine(
    id: string,
    baseVersion: number,
    operationId: string,
  ): Promise<SyncApplyResult>;
}

export interface CloudMediaRepository {
  listPublished(): Promise<CloudMediaRow[]>;
  upload(
    record: MediaRecord,
    ownerUserId: string,
    baseVersion: number | null,
    operationId: string,
  ): Promise<{ record: CloudMediaRow; sync: SyncApplyResult }>;
  remove(
    record: MediaRecord,
    ownerUserId: string,
    baseVersion: number,
    operationId: string,
  ): Promise<SyncApplyResult>;
}

export interface PrivateSettingsRepository {
  getMine(): Promise<AppSettings | null>;
  saveMine(
    settings: AppSettings,
    baseVersion: number | null,
    operationId: string,
  ): Promise<SyncApplyResult>;
}

export interface PrivateFavoritesRepository {
  listMine(): Promise<CloudFavoriteRow[]>;
  saveMine(
    favorite: CloudFavoriteRow,
    operationId: string,
  ): Promise<SyncApplyResult>;
  removeMine(
    entityType: CloudFavoriteRow["entity_type"],
    entityId: string,
    operationId: string,
  ): Promise<SyncApplyResult>;
}

export type OwnerSession =
  | { state: "signed-out" }
  | { state: "viewer"; userId: string; email: string | null }
  | { state: "owner"; userId: string; email: string | null };

export interface AuthRepository {
  getSession(): Promise<OwnerSession>;
  signIn(email: string, password: string): Promise<OwnerSession>;
  sendPasswordReset(email: string, origin: string): Promise<void>;
  linkGoogle(origin: string): Promise<void>;
  signOut(): Promise<void>;
  subscribe(listener: (session: OwnerSession) => void): () => void;
}

export interface SyncQueueEntry {
  operationId: string;
  entityType: "technique" | "media" | "prompt" | "favorite" | "settings";
  entityId: string;
  action: "upsert" | "delete";
  baseVersion: number | null;
  payload: unknown;
  createdAt: string;
  attempts: number;
}

export interface SyncQueueRepository {
  enqueue(entry: SyncQueueEntry): Promise<void>;
  peek(): Promise<SyncQueueEntry | null>;
  remove(operationId: string): Promise<void>;
  count(): Promise<number>;
}

export interface SyncConflict {
  operationId: string;
  entityType: SyncQueueEntry["entityType"];
  entityId: string;
  localPayload: unknown;
  cloudPayload: unknown;
  cloudVersion: number;
  createdAt: string;
}

export interface ConflictRepository {
  save(conflict: SyncConflict): Promise<void>;
  list(): Promise<SyncConflict[]>;
  remove(operationId: string): Promise<void>;
}

export type SyncConnectionState =
  | "connected"
  | "syncing"
  | "offline"
  | "needs-review";

export interface SyncStatusSnapshot {
  state: SyncConnectionState;
  pendingCount: number;
  conflictCount: number;
  lastSyncedAt: string | null;
}
