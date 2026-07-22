import { z } from "zod";

const limitedText = z.string().max(8_000);
const shortText = z.string().max(500);
const techniqueCategorySchema = z.enum([
  "shot-size",
  "camera-angle",
  "camera-movement",
  "lighting",
  "composition",
  "lens",
  "camera-settings",
]);
const platformSchema = z.enum([
  "generic-image",
  "midjourney",
  "flux",
  "generic-video",
  "runway",
  "kling",
  "veo",
]);

export const edgeAiOptimizeRequestSchema = z.object({
  input: z.object({
    mode: z.enum(["image", "video"]),
    platform: platformSchema,
    subject: shortText,
    action: shortText,
    environment: shortText,
    shotSize: shortText,
    angle: shortText,
    lens: shortText,
    movement: shortText,
    lighting: shortText,
    composition: shortText,
    mood: shortText,
    aspectRatio: shortText,
    duration: shortText,
    pacing: shortText,
  }),
  selected: z.array(z.object({
    id: shortText,
    category: techniqueCategorySchema,
    titleEn: shortText,
    titleTh: shortText,
    imageKeywords: z.array(shortText).max(30),
    videoKeywords: z.array(shortText).max(30),
  })).max(100),
  composition: z.object({
    prompt: limitedText,
    negativePrompt: limitedText,
    warnings: z.array(shortText).max(20),
    shots: z.array(z.object({
      index: z.number().int().positive(),
      transition: z.enum(["opening", "then", "meanwhile", "finally"]),
      prompt: limitedText,
      shotSize: z.unknown().nullable(),
      techniques: z.array(z.unknown()).max(100),
    })).max(20),
  }),
  platform: platformSchema,
  outputLanguage: z.enum(["th", "en"]),
});

const boundedResultText = z.string().max(500);

export const edgeAiModelResultSchema = z.object({
  optimizedPrompt: z.string().max(8_000),
  improvements: z.array(boundedResultText).max(20),
  warnings: z.array(boundedResultText).max(20),
  shotBreakdown: z.array(z.object({
    index: z.number().int().positive(),
    summary: boundedResultText,
    transition: boundedResultText,
  })).max(20),
});

export const edgeAiOptimizeResultSchema = edgeAiModelResultSchema.extend({
  model: z.string().min(1).max(200),
  optimizedAt: z.string().min(1).max(100),
});

export type EdgeAiOptimizeRequest = z.infer<typeof edgeAiOptimizeRequestSchema>;
export type EdgeAiModelResult = z.infer<typeof edgeAiModelResultSchema>;
export type EdgeAiOptimizeResult = z.infer<typeof edgeAiOptimizeResultSchema>;
