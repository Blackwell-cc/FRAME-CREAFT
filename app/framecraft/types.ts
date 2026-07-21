export type TechniqueCategory =
  | "shot-size"
  | "camera-angle"
  | "camera-movement"
  | "lighting"
  | "composition"
  | "lens"
  | "camera-settings";

export type PromptMode = "image" | "video";
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
