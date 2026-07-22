export type TechniqueCategory =
  | "shot-size"
  | "camera-angle"
  | "camera-movement"
  | "lighting"
  | "composition"
  | "lens"
  | "camera-settings";

export type PromptMode = "image" | "video";
export type OutputLanguage = "th" | "en";
export type PromptState = "auto" | "manual" | "stale" | "ai-preview" | "ai-applied";
export type PlatformPresetId =
  | "generic-image"
  | "midjourney"
  | "flux"
  | "generic-video"
  | "runway"
  | "kling"
  | "veo";

export interface Technique {
  id: string;
  slug: string;
  schemaVersion: 1;
  sourceType: "seed" | "custom";
  category: TechniqueCategory;
  titleEn: string;
  titleTh: string;
  abbreviation?: string;
  descriptionEn: string;
  descriptionTh: string;
  useCasesTh: string;
  effectTh: string;
  warningsTh: string;
  tags: string[];
  moods: string[];
  recommendedLenses: string[];
  cameraSettings: string[];
  imageKeywords: string[];
  videoKeywords: string[];
  genericImagePrompt: string;
  genericVideoPrompt: string;
  videoReferenceUrl?: string;
  isFavorite: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromptInput {
  mode: PromptMode;
  platform: PlatformPresetId;
  subject: string;
  action: string;
  environment: string;
  shotSize: string;
  angle: string;
  lens: string;
  movement: string;
  lighting: string;
  composition: string;
  mood: string;
  aspectRatio: string;
  duration: string;
  pacing: string;
}

export interface PromptOutput {
  prompt: string;
  negativePrompt: string;
}

export interface ShotBreakdown {
  index: number;
  shotSize: Technique | null;
  techniques: Technique[];
  transition: "opening" | "then" | "meanwhile" | "finally";
  prompt: string;
}

export interface PromptComposition extends PromptOutput {
  warnings: string[];
  shots: ShotBreakdown[];
}

export interface ComposePromptRequest {
  input: PromptInput;
  selected: Technique[];
  outputLanguage: OutputLanguage;
}

export interface SavedPrompt {
  id: string;
  name: string;
  mode: PromptMode;
  platform: PlatformPresetId;
  input: PromptInput;
  generatedPrompt: string;
  editedPrompt: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaRecord {
  id: string;
  techniqueId: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  altTh: string;
  altEn: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: "app";
  language: "th" | "en";
  defaultMode: PromptMode;
  defaultPlatform: PlatformPresetId;
  updatedAt: string;
}

export type SyncEntity =
  | "technique"
  | "media"
  | "saved_prompt"
  | "favorite"
  | "user_settings";

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

export interface SyncMetadataRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface LocalFavoriteRecord {
  id: string;
  userId: string;
  entityType: "technique" | "prompt";
  entityId: string;
  createdAt: string;
}
