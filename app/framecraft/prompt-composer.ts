import type {
  ComposePromptRequest,
  OutputLanguage,
  PlatformPresetId,
  PromptComposition,
  PromptInput,
  PromptMode,
  ShotBreakdown,
  Technique,
  TechniqueCategory,
} from "./types";

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

const categoryOrder: TechniqueCategory[] = [
  "shot-size",
  "camera-angle",
  "camera-movement",
  "lens",
  "lighting",
  "composition",
  "camera-settings",
];

const categoryLabels: Record<
  OutputLanguage,
  Record<TechniqueCategory, string>
> = {
  en: {
    "shot-size": "Shot size",
    "camera-angle": "Camera angle",
    "camera-movement": "Camera movement",
    lens: "Lens",
    lighting: "Lighting",
    composition: "Composition",
    "camera-settings": "Camera settings",
  },
  th: {
    "shot-size": "ระยะภาพ",
    "camera-angle": "มุมกล้อง",
    "camera-movement": "การเคลื่อนกล้อง",
    lens: "เลนส์",
    lighting: "แสง",
    composition: "องค์ประกอบภาพ",
    "camera-settings": "ค่ากล้อง",
  },
};

function clean(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function punctuate(value: string) {
  if (!value) return "";
  return /[.!?。！？]$/.test(value) ? value : `${value}.`;
}

function techniqueValue(
  technique: Technique,
  mode: PromptMode,
  language: OutputLanguage,
) {
  if (language === "th") return clean(technique.titleTh);
  return clean(mode === "video"
    ? technique.genericVideoPrompt || technique.videoKeywords[0]
    : technique.genericImagePrompt || technique.imageKeywords.join(", "));
}

function semanticSubject(input: PromptInput, language: OutputLanguage) {
  const labels = language === "th"
    ? { subject: "ตัวแบบ", action: "การกระทำ", environment: "สถานที่" }
    : { subject: "Subject", action: "Action", environment: "Environment" };
  return punctuate([
    input.subject && `${labels.subject}: ${clean(input.subject)}`,
    input.action && `${labels.action}: ${clean(input.action)}`,
    input.environment && `${labels.environment}: ${clean(input.environment)}`,
  ].filter(Boolean).join("; "));
}

function renderTechniqueGroups(
  techniques: Technique[],
  mode: PromptMode,
  language: OutputLanguage,
) {
  return categoryOrder.flatMap((category) => {
    const values = techniques
      .filter((item) => item.category === category)
      .map((item) => techniqueValue(item, mode, language))
      .filter(Boolean);
    return values.length
      ? [`${categoryLabels[language][category]}: ${values.join("; ")}`]
      : [];
  }).join("; ");
}

function renderLegacyGroups(input: PromptInput, language: OutputLanguage) {
  const values: Partial<Record<TechniqueCategory, string>> = {
    "shot-size": clean(input.shotSize),
    "camera-angle": clean(input.angle),
    "camera-movement": clean(input.movement),
    lens: clean(input.lens),
    lighting: clean(input.lighting),
    composition: clean(input.composition),
    "camera-settings": clean(input.mood),
  };
  return categoryOrder.flatMap((category) => values[category]
    ? [`${categoryLabels[language][category]}: ${values[category]}`]
    : []).join("; ");
}

export type DurationValidation =
  | { valid: true; value: number | null }
  | { valid: false; messageTh: string; messageEn: string };

export function validateDuration(value: string): DurationValidation {
  const normalized = clean(value);
  if (!normalized) return { valid: true, value: null };
  if (!/^\d+$/.test(normalized)) {
    return {
      valid: false,
      messageTh: "กรอกระยะเวลา 1–600 วินาที",
      messageEn: "Enter a duration from 1–600 seconds",
    };
  }
  const duration = Number(normalized);
  if (duration < 1 || duration > 600) {
    return {
      valid: false,
      messageTh: "กรอกระยะเวลา 1–600 วินาที",
      messageEn: "Enter a duration from 1–600 seconds",
    };
  }
  return { valid: true, value: duration };
}

interface PendingShot {
  shotSize: Technique | null;
  techniques: Technique[];
}

function groupVideoShots(selected: Technique[]): PendingShot[] {
  const shots: PendingShot[] = [];
  let current: PendingShot | null = null;

  for (const technique of selected) {
    if (technique.category === "shot-size") {
      if (current?.techniques.length) shots.push(current);
      current = { shotSize: technique, techniques: [technique] };
      continue;
    }
    if (!current) current = { shotSize: null, techniques: [] };
    current.techniques.push(technique);
  }

  if (current?.techniques.length) shots.push(current);
  return shots;
}

function transitionFor(index: number, count: number): ShotBreakdown["transition"] {
  if (index === 0) return "opening";
  if (index === count - 1) return "finally";
  return index % 2 === 1 ? "then" : "meanwhile";
}

function transitionLabel(
  transition: ShotBreakdown["transition"],
  index: number,
  language: OutputLanguage,
) {
  if (language === "th") {
    const labels = {
      opening: "ช็อตเปิด",
      then: "จากนั้น ช็อต",
      meanwhile: "ต่อเนื่องด้วยช็อต",
      finally: "ปิดท้ายด้วยช็อต",
    };
    return `${labels[transition]} ${index}`;
  }
  const labels = {
    opening: "Opening shot",
    then: "Then, shot",
    meanwhile: "Meanwhile, shot",
    finally: "Finally, shot",
  };
  return `${labels[transition]} ${index}`;
}

function buildVideoShots(
  selected: Technique[],
  input: PromptInput,
  language: OutputLanguage,
) {
  const subject = semanticSubject(input, language);
  const grouped = groupVideoShots(selected);
  return grouped.map((shot, index): ShotBreakdown => {
    const transition = transitionFor(index, grouped.length);
    const details = renderTechniqueGroups(shot.techniques, "video", language);
    const prompt = punctuate([
      `${transitionLabel(transition, index + 1, language)}${details ? ` — ${details}` : ""}`,
      subject,
    ].filter(Boolean).join(". "));
    return {
      index: index + 1,
      shotSize: shot.shotSize,
      techniques: shot.techniques,
      transition,
      prompt,
    };
  });
}

const conflictCodes: Partial<Record<TechniqueCategory, string>> = {
  "camera-angle": "camera-angles",
  "camera-movement": "camera-movements",
  lens: "lenses",
  "camera-settings": "camera-settings",
};

function completenessWarnings(input: PromptInput) {
  return [
    !clean(input.subject) && "missing-subject",
    !clean(input.action) && "missing-action",
    !clean(input.environment) && "missing-environment",
  ].filter((warning): warning is string => Boolean(warning));
}

function videoWarnings(shots: ShotBreakdown[]) {
  const warnings: string[] = [];
  for (const shot of shots) {
    if (!shot.shotSize) warnings.push(`missing-shot-size-in-shot-${shot.index}`);
    for (const [category, code] of Object.entries(conflictCodes)) {
      const count = shot.techniques.filter(
        (item) => item.category === category,
      ).length;
      if (count > 1) warnings.push(`multiple-${code}-in-shot-${shot.index}`);
    }
  }
  return warnings;
}

function timingDirectives(
  input: PromptInput,
  language: OutputLanguage,
  duration: DurationValidation,
) {
  const parts: string[] = [];
  if (duration.valid && duration.value !== null) {
    parts.push(language === "th"
      ? `ระยะเวลา: ${duration.value} วินาที.`
      : `Duration: ${duration.value} seconds.`);
  }
  if (clean(input.pacing)) {
    parts.push(language === "th"
      ? `จังหวะ: ${clean(input.pacing)}.`
      : `Pacing: ${clean(input.pacing)}.`);
  }
  return parts.join(" ");
}

function applyPlatformDirective(base: string, input: PromptInput) {
  const ratio = clean(input.aspectRatio);
  switch (input.platform) {
    case "midjourney":
      return `${base}${ratio ? ` --ar ${ratio}` : ""}`;
    case "flux":
      return `${base} Natural texture, physically believable light, precise visual detail.`;
    case "runway":
      return `${base} Continuous coherent motion, stable subject identity.`;
    case "kling":
      return `${base} Natural physics, consistent anatomy, smooth temporal motion.`;
    default:
      return base;
  }
}

export function composePrompt({
  input,
  selected,
  outputLanguage,
}: ComposePromptRequest): PromptComposition {
  const warnings = completenessWarnings(input);
  const duration = validateDuration(input.duration);
  if (!duration.valid) warnings.push("invalid-duration");

  let shots: ShotBreakdown[] = [];
  let base: string;

  if (input.mode === "video" && selected.length) {
    shots = buildVideoShots(selected, input, outputLanguage);
    warnings.push(...videoWarnings(shots));
    base = shots.map((shot) => shot.prompt).join(" ");
  } else {
    const subject = semanticSubject(input, outputLanguage);
    const details = selected.length
      ? renderTechniqueGroups(selected, input.mode, outputLanguage)
      : renderLegacyGroups(input, outputLanguage);
    base = [subject, punctuate(details)].filter(Boolean).join(" ");
  }

  if (input.mode === "video") {
    const timing = timingDirectives(input, outputLanguage, duration);
    if (timing) base = `${base} ${timing}`.trim();
  }

  return {
    prompt: applyPlatformDirective(base, input),
    negativePrompt: outputLanguage === "th"
      ? "สัดส่วนผิดเพี้ยน, ตัวหนังสืออ่านไม่ออก, เฟรมไม่นิ่ง, กล้องเคลื่อนแบบสุ่ม, รายละเอียดต่ำ"
      : "warped anatomy, unreadable text, unstable framing, random camera movement, low detail",
    warnings,
    shots,
  };
}
