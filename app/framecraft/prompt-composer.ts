import type { PlatformPresetId, PromptInput, PromptOutput, PromptMode } from "./types";

export interface PlatformPreset {
  id: PlatformPresetId;
  label: string;
  mode: PromptMode;
}

export const platformPresets: PlatformPreset[] = [
  { id: "generic-image", label: "Generic Image", mode: "image" },
  { id: "midjourney", label: "Midjourney", mode: "image" },
  { id: "flux", label: "Flux", mode: "image" },
  { id: "generic-video", label: "Generic Video", mode: "video" },
  { id: "runway", label: "Runway", mode: "video" },
  { id: "kling", label: "Kling", mode: "video" },
  { id: "veo", label: "Veo", mode: "video" },
];

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function capitalize(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function punctuate(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function subjectClause(input: PromptInput) {
  return [input.subject, input.action, input.environment].map(clean).filter(Boolean).join(" ");
}

function basePrompt(input: PromptInput) {
  const opening = input.shotSize
    ? `${clean(input.shotSize)} of ${subjectClause(input)}`
    : subjectClause(input);
  const details = [
    input.angle,
    input.lens,
    input.mode === "video" ? "" : input.movement,
    input.lighting,
    input.composition,
    input.mood,
  ]
    .map(clean)
    .filter(Boolean);
  return punctuate(capitalize([opening, ...details].filter(Boolean).join(", ")));
}

function videoDirectives(input: PromptInput) {
  return [
    input.movement && `Camera movement: ${clean(input.movement)}.`,
    input.duration && `Duration: ${clean(input.duration)}.`,
    input.pacing && `Pacing: ${clean(input.pacing)}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function composePrompt(input: PromptInput): PromptOutput {
  const base = basePrompt(input);
  const ratio = clean(input.aspectRatio);
  let prompt = base;

  switch (input.platform) {
    case "midjourney":
      prompt = `${base}${ratio ? ` --ar ${ratio}` : ""}`;
      break;
    case "flux":
      prompt = `${base} Natural texture, physically believable light, precise visual detail.`;
      break;
    case "generic-video":
      prompt = `${base} ${videoDirectives(input)}`.trim();
      break;
    case "runway":
      prompt = `${base} ${videoDirectives(input)} Continuous coherent motion, stable subject identity.`.trim();
      break;
    case "kling":
      prompt = `${base} ${videoDirectives(input)} Natural physics, consistent anatomy, smooth temporal motion.`.trim();
      break;
    case "veo":
      prompt = `${base} ${videoDirectives(input)}`.trim();
      break;
  }

  return {
    prompt,
    negativePrompt: "warped anatomy, unreadable text, unstable framing, random camera movement, low detail",
  };
}
