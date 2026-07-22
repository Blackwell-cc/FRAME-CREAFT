import type { SavedPrompt, SavedPromptV2 } from "./types";

export function isSavedPromptV2(record: SavedPrompt): record is SavedPromptV2 {
  return record.schemaVersion === 2;
}

export function upgradeSavedPrompt(record: SavedPrompt): SavedPromptV2 {
  if (isSavedPromptV2(record)) {
    return {
      ...record,
      input: { ...record.input },
      selectedTechniqueIds: [...record.selectedTechniqueIds],
      structuredDraft: {
        ...record.structuredDraft,
        warnings: [...record.structuredDraft.warnings],
        shots: record.structuredDraft.shots.map((shot) => ({
          ...shot,
          techniques: [...shot.techniques],
        })),
      },
      ...(record.aiMetadata ? { aiMetadata: { ...record.aiMetadata } } : {}),
    };
  }

  return {
    ...record,
    schemaVersion: 2,
    input: { ...record.input },
    selectedTechniqueIds: [],
    structuredDraft: {
      prompt: record.generatedPrompt,
      negativePrompt: "",
      warnings: [],
      shots: [],
    },
    outputLanguage: "en",
    promptState:
      record.editedPrompt !== record.generatedPrompt ? "manual" : "auto",
  };
}
