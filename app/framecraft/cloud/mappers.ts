import type { AppSettings, MediaRecord, SavedPrompt, Technique } from "../types";
import { upgradeSavedPrompt } from "../saved-prompt-schema";
import type {
  CloudMediaRow,
  CloudSavedPromptRow,
  CloudSettingsRow,
  CloudTechniqueRow,
} from "./contracts";

export function toCloudTechnique(record: Technique): CloudTechniqueRow {
  return {
    id: record.id,
    slug: record.slug,
    schema_version: record.schemaVersion,
    source_type: record.sourceType,
    category: record.category,
    title_en: record.titleEn,
    title_th: record.titleTh,
    abbreviation: record.abbreviation ?? null,
    description_en: record.descriptionEn,
    description_th: record.descriptionTh,
    use_cases_th: record.useCasesTh,
    effect_th: record.effectTh,
    warnings_th: record.warningsTh,
    tags: [...record.tags],
    moods: [...record.moods],
    recommended_lenses: [...record.recommendedLenses],
    camera_settings: [...record.cameraSettings],
    image_keywords: [...record.imageKeywords],
    video_keywords: [...record.videoKeywords],
    generic_image_prompt: record.genericImagePrompt,
    generic_video_prompt: record.genericVideoPrompt,
    video_reference_url: record.videoReferenceUrl ?? null,
    is_hidden: record.isHidden,
    published: !record.isHidden,
    version: 1,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    deleted_at: null,
  };
}

export function fromCloudTechnique(row: CloudTechniqueRow): Technique {
  return {
    id: row.id,
    slug: row.slug,
    schemaVersion: row.schema_version,
    sourceType: row.source_type,
    category: row.category,
    titleEn: row.title_en,
    titleTh: row.title_th,
    ...(row.abbreviation ? { abbreviation: row.abbreviation } : {}),
    descriptionEn: row.description_en,
    descriptionTh: row.description_th,
    useCasesTh: row.use_cases_th,
    effectTh: row.effect_th,
    warningsTh: row.warnings_th,
    tags: [...row.tags],
    moods: [...row.moods],
    recommendedLenses: [...row.recommended_lenses],
    cameraSettings: [...row.camera_settings],
    imageKeywords: [...row.image_keywords],
    videoKeywords: [...row.video_keywords],
    genericImagePrompt: row.generic_image_prompt,
    genericVideoPrompt: row.generic_video_prompt,
    ...(row.video_reference_url
      ? { videoReferenceUrl: row.video_reference_url }
      : {}),
    isFavorite: false,
    isHidden: row.is_hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCloudSavedPrompt(
  record: SavedPrompt,
  userId: string,
): CloudSavedPromptRow {
  const normalized = upgradeSavedPrompt(record);
  return {
    id: normalized.id,
    user_id: userId,
    name: normalized.name,
    mode: normalized.mode,
    platform: normalized.platform,
    input: {
      ...normalized.input,
      _framecraftV2: {
        schemaVersion: 2,
        selectedTechniqueIds: [...normalized.selectedTechniqueIds],
        structuredDraft: normalized.structuredDraft,
        outputLanguage: normalized.outputLanguage,
        promptState: normalized.promptState,
        aiMetadata: normalized.aiMetadata ?? null,
      },
    },
    generated_prompt: normalized.generatedPrompt,
    edited_prompt: normalized.editedPrompt,
    version: 1,
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
    deleted_at: null,
  };
}

export function fromCloudSavedPrompt(row: CloudSavedPromptRow): SavedPrompt {
  const { _framecraftV2: metadata, ...input } = row.input;
  const legacy: SavedPrompt = {
    id: row.id,
    name: row.name,
    mode: row.mode,
    platform: row.platform,
    input,
    generatedPrompt: row.generated_prompt,
    editedPrompt: row.edited_prompt,
    isFavorite: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (metadata?.schemaVersion !== 2) return upgradeSavedPrompt(legacy);

  return upgradeSavedPrompt({
    ...legacy,
    schemaVersion: 2,
    selectedTechniqueIds: [...metadata.selectedTechniqueIds],
    structuredDraft: metadata.structuredDraft,
    outputLanguage: metadata.outputLanguage,
    promptState: metadata.promptState,
    ...(metadata.aiMetadata ? { aiMetadata: metadata.aiMetadata } : {}),
  });
}

export function toCloudSettings(
  settings: AppSettings,
  userId: string,
): CloudSettingsRow {
  return {
    user_id: userId,
    language: settings.language,
    default_mode: settings.defaultMode,
    default_platform: settings.defaultPlatform,
    version: 1,
    updated_at: settings.updatedAt,
  };
}

export function fromCloudSettings(row: CloudSettingsRow): AppSettings {
  return {
    id: "app",
    language: row.language,
    defaultMode: row.default_mode,
    defaultPlatform: row.default_platform,
    updatedAt: row.updated_at,
  };
}

export function toCloudMedia(
  record: MediaRecord,
  storagePath: string,
): CloudMediaRow {
  return {
    id: record.id,
    technique_id: record.techniqueId,
    storage_path: storagePath,
    mime_type: record.mimeType,
    width: record.width,
    height: record.height,
    byte_size: record.byteSize,
    alt_th: record.altTh,
    alt_en: record.altEn,
    version: 1,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    deleted_at: null,
  };
}
