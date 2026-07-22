"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, BookOpen, Download, Heart, Languages, Menu, Plus, Search, Settings, Sparkles, Upload, Video, X } from "lucide-react";
import { createBackupArchive, inspectBackupArchive } from "./backup-service";
import { AiPromptPreview } from "./AiPromptPreview";
import type { AiOptimizeResult, AiOptimizerErrorCode } from "./ai-optimizer";
import { categoryOrder } from "./category-guides";
import { CategorySection } from "./CategorySection";
import { ChapterNav } from "./ChapterNav";
import { readImageDimensions, validateMediaFile, validateVideoReferenceUrl } from "./media-service";
import { composePrompt } from "./prompt-composer";
import { reconcileSelectionForMode, validateTechniqueSelection } from "./prompt-selection";
import { applyAiPrompt, createPromptSession, editPrompt, markPromptStale, replaceWithAutomaticPrompt, updateAutomaticCandidate } from "./prompt-session";
import { PromptPanel } from "./PromptPanel";
import { categoryLabels, starterTechniques } from "./seed-data";
import { starterMediaUrls } from "./starter-media";
import { frameCraftDb, mediaRepository, ownerMutationRepository, promptRepository, restoreBackup, settingsRepository, syncConflictRepository, syncMetadataRepository, syncQueueRepository, techniqueRepository } from "./storage";
import type { AppSettings, MediaRecord, OutputLanguage, PromptInput, PromptMode, SavedPrompt, SavedPromptV2, SyncEntity, SyncQueueRecord, Technique, TechniqueCategory } from "./types";
import { upgradeSavedPrompt } from "./saved-prompt-schema";
import type { OwnerSession, SyncStatusSnapshot } from "./cloud/contracts";
import { createAppCloudRuntime, type AppCloudRuntime } from "./cloud/app-runtime";
import { OwnerAuthPanel } from "./OwnerAuthPanel";
import { MigrationWizard } from "./MigrationWizard";
import { createSyncEngine } from "./cloud/sync-engine";
import { SyncStatus } from "./SyncStatus";
import "./framecraft.css";

type View = "library" | "favorites" | "manage" | "settings" | "prompt";

interface FrameCraftAppProps {
  initialTechniques?: Technique[];
  persistence?: "indexeddb" | "memory";
  initialOwnerSession?: OwnerSession;
  cloudRuntime?: AppCloudRuntime | null;
}

const emptyPrompt: PromptInput = {
  mode: "image", platform: "generic-image", subject: "", action: "", environment: "",
  shotSize: "", angle: "", lens: "", movement: "", lighting: "", composition: "",
  mood: "", aspectRatio: "16:9", duration: "", pacing: "",
};

const defaultSettings: AppSettings = {
  id: "app", language: "th", defaultMode: "image", defaultPlatform: "generic-image",
  updatedAt: new Date(0).toISOString(),
};

const navItems: Array<{ id: View; th: string; en: string; icon: typeof BookOpen }> = [
  { id: "library", th: "คลัง Production", en: "Library", icon: BookOpen },
  { id: "favorites", th: "รายการโปรด", en: "Favorites", icon: Heart },
  { id: "manage", th: "จัดการคลัง", en: "Manage", icon: Archive },
  { id: "settings", th: "ตั้งค่าและสำรอง", en: "Settings", icon: Settings },
];

export function FrameCraftApp({
  initialTechniques = starterTechniques,
  persistence = "indexeddb",
  initialOwnerSession = { state: "signed-out" },
  cloudRuntime,
}: FrameCraftAppProps) {
  const [techniques, setTechniques] = useState<Technique[]>(initialTechniques);
  const [view, setView] = useState<View>("library");
  const [language, setLanguage] = useState<"th" | "en">("th");
  const [search, setSearch] = useState("");
  const [activeChapter, setActiveChapter] = useState<TechniqueCategory>("shot-size");
  const [selected, setSelected] = useState<Technique[]>([]);
  const [promptInput, setPromptInput] = useState<PromptInput>(emptyPrompt);
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("en");
  const composition = useMemo(
    () => composePrompt({ input: promptInput, selected, outputLanguage }),
    [outputLanguage, promptInput, selected],
  );
  const [promptSession, setPromptSession] = useState(
    () => createPromptSession(composition.prompt),
  );
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "preview" | "error">("idle");
  const [aiPreview, setAiPreview] = useState<AiOptimizeResult | null>(null);
  const [aiError, setAiError] = useState("");
  const [selectionWarning, setSelectionWarning] = useState("");
  const [detail, setDetail] = useState<Technique | null>(null);
  const [notice, setNotice] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>(() => ({ ...starterMediaUrls }));
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Technique | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [ownerSession, setOwnerSession] = useState<OwnerSession>(initialOwnerSession);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(initialTechniques.filter((item) => item.isFavorite).map((item) => item.id)));
  const [syncSnapshot, setSyncSnapshot] = useState<SyncStatusSnapshot>({ state: "connected", pendingCount: 0, conflictCount: 0, lastSyncedAt: null });
  const importRef = useRef<HTMLInputElement>(null);
  const runtime = useMemo(() => {
    if (cloudRuntime !== undefined) return cloudRuntime;
    if (persistence === "memory") return null;
    return createAppCloudRuntime({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  }, [cloudRuntime, persistence]);
  const isOwner = ownerSession.state === "owner";
  const syncEngine = useMemo(() => {
    if (!runtime || persistence !== "indexeddb") return null;
    return createSyncEngine({
      queue: syncQueueRepository,
      conflicts: syncConflictRepository,
      metadata: syncMetadataRepository,
      refresh: async () => { await runtime.loadPublic(); },
      apply: (record) => runtime.apply(record),
      getSession: () => runtime.auth.getSession(),
      isOnline: () => typeof navigator === "undefined" || navigator.onLine,
      now: () => new Date().toISOString(),
    });
  }, [persistence, runtime]);
  const migrationService = useMemo(() => ownerSession.state === "owner" && runtime
    ? runtime.migration(ownerSession.userId)
    : null, [ownerSession, runtime]);

  useEffect(() => {
    if (persistence === "memory") return;
    let active = true;
    const loadedUrls: string[] = [];
    Promise.all([
      techniqueRepository.ensureSeeded(starterTechniques).then(() => techniqueRepository.list()),
      promptRepository.list(),
      mediaRepository.list(),
      settingsRepository.get(),
    ]).then(([records, prompts, media, storedSettings]) => {
      if (active && records.length) setTechniques(records);
      if (active) setSavedPrompts(prompts);
      if (active && storedSettings) {
        setSettings(storedSettings);
        setLanguage(storedSettings.language);
        setPromptInput((current) => ({ ...current, mode: storedSettings.defaultMode, platform: storedSettings.defaultPlatform }));
      }
      if (active) {
        const urls = Object.fromEntries(media.map((record) => {
          const url = URL.createObjectURL(record.blob);
          loadedUrls.push(url);
          return [record.techniqueId, url];
        }));
        setMediaUrls({ ...starterMediaUrls, ...urls });
      }
    });
    return () => { active = false; loadedUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [persistence]);

  useEffect(() => {
    if (!runtime || persistence === "memory") return;
    let active = true;
    void runtime.loadPublic().then(({ techniques: cloudTechniques, mediaUrls: cloudMediaUrls }) => {
      if (!active || cloudTechniques.length === 0) return;
      setTechniques(cloudTechniques);
      setMediaUrls((current) => ({ ...current, ...cloudMediaUrls }));
      void frameCraftDb.techniques.bulkPut(cloudTechniques);
    }).catch(() => undefined);
    void runtime.auth.getSession().then((session) => {
      if (active) setOwnerSession(session);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [persistence, runtime]);

  useEffect(() => {
    if (!runtime || ownerSession.state !== "owner") return;
    let active = true;
    void runtime.loadOwner().then(({ prompts, favorites, settings: cloudSettings }) => {
      if (!active) return;
      setSavedPrompts(prompts);
      setFavoriteIds(new Set(favorites.filter((item) => item.entity_type === "technique").map((item) => item.entity_id)));
      if (cloudSettings) {
        setSettings(cloudSettings);
        setLanguage(cloudSettings.language);
        setPromptInput((current) => ({ ...current, mode: cloudSettings.defaultMode, platform: cloudSettings.defaultPlatform }));
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [ownerSession, runtime]);

  useEffect(() => {
    if (!syncEngine) return;
    const unsubscribe = syncEngine.subscribeStatus(setSyncSnapshot);
    const sync = () => { void syncEngine.syncNow(); };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    void syncEngine.start();
    return () => {
      unsubscribe();
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [syncEngine]);

  async function createQueueRecord(entity: SyncEntity, entityId: string, action: "upsert" | "delete", payload: unknown): Promise<SyncQueueRecord | null> {
    if (ownerSession.state !== "owner" || persistence !== "indexeddb") return null;
    const now = new Date().toISOString();
    const version = await syncMetadataRepository.get(`cloud-version:${entity}:${entityId}`);
    return {
      operationId: crypto.randomUUID(), userId: ownerSession.userId, entity, entityId, action,
      baseVersion: typeof version?.value === "number" ? version.value : null,
      payload, attempts: 0, createdAt: now, updatedAt: now,
    };
  }

  async function persistTechnique(record: Technique) {
    const queue = await createQueueRecord("technique", record.id, "upsert", record);
    if (queue) await ownerMutationRepository.saveTechnique(record, queue);
    else if (await techniqueRepository.getById(record.id)) await techniqueRepository.update(record.id, record);
    else await techniqueRepository.create(record);
    await syncEngine?.syncNow();
  }

  async function persistMedia(record: MediaRecord) {
    const queue = await createQueueRecord("media", record.id, "upsert", record);
    if (queue) await ownerMutationRepository.saveMedia(record, queue);
    else await mediaRepository.save(record);
    await syncEngine?.syncNow();
  }

  async function hideTechnique(technique: Technique) {
    const next = { ...technique, isHidden: !technique.isHidden, updatedAt: new Date().toISOString() };
    setTechniques((current) => current.map((item) => item.id === technique.id ? next : item));
    if (persistence === "indexeddb") await persistTechnique(next);
  }

  async function removeSavedPrompt(prompt: SavedPrompt) {
    setSavedPrompts((current) => current.filter((item) => item.id !== prompt.id));
    if (persistence !== "indexeddb") return;
    const queue = await createQueueRecord("saved_prompt", prompt.id, "delete", {});
    if (queue) await ownerMutationRepository.deletePrompt(prompt.id, queue);
    else await promptRepository.delete(prompt.id);
    await syncEngine?.syncNow();
  }

  function updateSettings(changes: Partial<AppSettings>) {
    const next = { ...settings, ...changes, updatedAt: new Date().toISOString() };
    setSettings(next);
    if (changes.language) setLanguage(changes.language);
    if (changes.defaultMode || changes.defaultPlatform) {
      setPromptInput((current) => ({
        ...current,
        mode: changes.defaultMode || current.mode,
        platform: changes.defaultPlatform || current.platform,
      }));
    }
    if (persistence === "indexeddb") void (async () => {
      const queue = await createQueueRecord("user_settings", next.id, "upsert", next);
      if (queue) await ownerMutationRepository.saveSettings(next, queue);
      else await settingsRepository.save(next);
      await syncEngine?.syncNow();
    })();
  }

  const filtered = useMemo(() => techniques.filter((technique) => {
    if (technique.isHidden) return false;
    if (view === "favorites" && !favoriteIds.has(technique.id)) return false;
    const query = search.trim().toLocaleLowerCase("th");
    if (!query) return true;
    return [technique.titleEn, technique.titleTh, technique.abbreviation, technique.descriptionTh, technique.useCasesTh, ...technique.tags, ...technique.moods].filter(Boolean).join(" ").toLocaleLowerCase("th").includes(query);
  }), [favoriteIds, techniques, view, search]);

  const grouped = useMemo(() => Object.fromEntries(
    categoryOrder.map((id) => [id, filtered.filter((item) => item.category === id)]),
  ) as Record<TechniqueCategory, Technique[]>, [filtered]);

  const chapterCounts = useMemo(() => Object.fromEntries(
    categoryOrder.map((id) => [id, grouped[id].length]),
  ) as Record<TechniqueCategory, number>, [grouped]);

  const visibleActiveChapter = chapterCounts[activeChapter] > 0
    ? activeChapter
    : categoryOrder.find((id) => chapterCounts[id] > 0) || activeChapter;

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = document.querySelectorAll<HTMLElement>(".category-section");
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) setActiveChapter(visible.target.id.replace("chapter-", "") as TechniqueCategory);
    }, { rootMargin: "-20% 0px -65% 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [chapterCounts]);

  function promptWillBeReplaced() {
    return promptSession.state === "manual"
      || promptSession.state === "stale"
      || promptSession.state === "ai-applied";
  }

  function confirmPromptRegeneration(detailMessage = "") {
    const message = language === "th"
      ? `เมื่อแก้ไขแล้ว GENERATED PROMPT จะถูกสร้างใหม่${detailMessage ? `\n\n${detailMessage}` : ""}\n\nยืนยันจะแก้ไขไหม?`
      : `GENERATED PROMPT will be regenerated after this change.${detailMessage ? `\n\n${detailMessage}` : ""}\n\nContinue?`;
    return window.confirm(message);
  }

  function regeneratePrompt(
    input: PromptInput,
    nextSelected: Technique[],
    nextLanguage = outputLanguage,
  ) {
    return composePrompt({
      input,
      selected: nextSelected,
      outputLanguage: nextLanguage,
    }).prompt;
  }

  function addToPrompt(technique: Technique) {
    const decision = validateTechniqueSelection(
      promptInput.mode,
      selected,
      technique,
    );
    if (!decision.allowed) {
      if (decision.reason === "duplicate") {
        setSelectionWarning(
          language === "th"
            ? `${technique.titleEn} ถูกเลือกไว้แล้ว จึงไม่สามารถเพิ่มซ้ำได้`
            : `${technique.titleEn} is already selected and cannot be added twice.`,
        );
        return;
      }
      const existing = selected.find(
        (item) => item.id === decision.currentTechniqueId,
      );
      setSelectionWarning(language === "th"
        ? `โหมด Image เลือกได้เพียง 1 รายการในหมวด ${categoryLabels[technique.category].th} ขณะนี้เลือก ${existing?.titleEn ?? "รายการเดิม"} อยู่ กรุณานำรายการเดิมออกก่อน`
        : `Image mode allows only one ${categoryLabels[technique.category].en}. Remove ${existing?.titleEn ?? "the current item"} first.`);
      return;
    }

    if (promptWillBeReplaced() && !confirmPromptRegeneration()) return;
    const nextSelected = [...selected, technique];
    setSelected(nextSelected);
    setSelectionWarning("");
    setPromptSession(createPromptSession(
      regeneratePrompt(promptInput, nextSelected),
    ));
  }

  function removeFromPrompt(id: string) {
    if (!selected.some((item) => item.id === id)) return;
    if (promptWillBeReplaced() && !confirmPromptRegeneration()) return;
    const nextSelected = selected.filter((item) => item.id !== id);
    setSelected(nextSelected);
    setSelectionWarning("");
    setPromptSession(createPromptSession(
      regeneratePrompt(promptInput, nextSelected),
    ));
  }

  function changePromptField(
    changes: Partial<PromptInput>,
    reason: string,
  ) {
    const nextInput = { ...promptInput, ...changes };
    const nextAutomatic = regeneratePrompt(nextInput, selected);
    setPromptInput(nextInput);
    setPromptSession((current) => {
      const withCandidate = updateAutomaticCandidate(current, nextAutomatic);
      return current.state === "auto"
        ? withCandidate
        : markPromptStale(withCandidate, reason);
    });
  }

  function changeOutputLanguage(nextLanguage: OutputLanguage) {
    if (nextLanguage === outputLanguage) return;
    const nextAutomatic = regeneratePrompt(
      promptInput,
      selected,
      nextLanguage,
    );
    setOutputLanguage(nextLanguage);
    setPromptSession((current) => {
      const withCandidate = updateAutomaticCandidate(current, nextAutomatic);
      return current.state === "auto"
        ? withCandidate
        : markPromptStale(withCandidate, "output-language");
    });
  }

  function changePromptMode(mode: PromptMode) {
    if (mode === promptInput.mode) return;
    const reconciled = reconcileSelectionForMode(mode, selected);
    const removedMessage = reconciled.removed.length
      ? `${language === "th" ? "รายการที่จะถูกนำออก" : "Items to remove"}: ${reconciled.removed.map((item) => item.titleEn).join(", ")}`
      : "";
    if ((promptWillBeReplaced() || reconciled.removed.length > 0)
      && !confirmPromptRegeneration(removedMessage)) return;
    const nextInput: PromptInput = {
      ...promptInput,
      mode,
      platform: mode === "image" ? "generic-image" : "generic-video",
      ...(mode === "image" ? { duration: "", pacing: "" } : {}),
    };
    setPromptInput(nextInput);
    setSelected(reconciled.kept);
    setSelectionWarning("");
    setPromptSession(createPromptSession(
      regeneratePrompt(nextInput, reconciled.kept),
    ));
  }

  function toggleFavorite(technique: Technique) {
    const willFavorite = !favoriteIds.has(technique.id);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(technique.id)) next.delete(technique.id);
      else next.add(technique.id);
      return next;
    });
    if (ownerSession.state === "owner" && persistence === "indexeddb") void (async () => {
      const id = `${ownerSession.userId}:technique:${technique.id}`;
      const favorite = { id, userId: ownerSession.userId, entityType: "technique" as const, entityId: technique.id, createdAt: new Date().toISOString() };
      const payload = { user_id: ownerSession.userId, entity_type: "technique" as const, entity_id: technique.id, created_at: favorite.createdAt };
      const queue = await createQueueRecord("favorite", technique.id, willFavorite ? "upsert" : "delete", payload);
      if (!queue) return;
      if (willFavorite) await ownerMutationRepository.saveFavorite(favorite, queue);
      else await ownerMutationRepository.deleteFavorite(id, queue);
      await syncEngine?.syncNow();
    })();
  }

  function resetPrompt() {
    if (promptWillBeReplaced() && !confirmPromptRegeneration()) return;
    setSelected([]);
    setPromptInput(emptyPrompt);
    setOutputLanguage("en");
    setSelectionWarning("");
    setPromptSession(createPromptSession(
      regeneratePrompt(emptyPrompt, [], "en"),
    ));
  }

  function aiErrorMessage(code: AiOptimizerErrorCode | undefined) {
    const messages: Record<AiOptimizerErrorCode, string> = {
      unauthorized: "Session หมดอายุ กรุณาเข้าสู่ระบบ Owner ใหม่",
      forbidden: "บัญชีนี้ไม่มีสิทธิ์ใช้ AI Optimizer",
      "rate-limit": "ใช้งานครบโควตาชั่วคราว กรุณารอสักครู่แล้วลองใหม่",
      timeout: "AI ใช้เวลานานเกินกำหนด Prompt เดิมของคุณยังไม่เปลี่ยนแปลง",
      "invalid-response": "ผลลัพธ์จาก AI ไม่อยู่ในรูปแบบที่ปลอดภัย จึงยังไม่ได้นำมาใช้",
      unavailable: "AI Optimizer ยังไม่พร้อมใช้งาน กรุณาตรวจสอบการตั้งค่า Edge Function",
    };
    return code ? messages[code] : messages.unavailable;
  }

  async function analyzeWithAi() {
    if (!isOwner || !runtime?.ai || aiStatus === "loading") return;
    setAiStatus("loading");
    setAiError("");
    setAiPreview(null);
    try {
      const result = await runtime.ai.analyze({
        input: promptInput,
        selected: selected.map((technique) => ({
          id: technique.id,
          category: technique.category,
          titleEn: technique.titleEn,
          titleTh: technique.titleTh,
          imageKeywords: technique.imageKeywords,
          videoKeywords: technique.videoKeywords,
        })),
        composition,
        platform: promptInput.platform,
        outputLanguage,
      });
      setAiPreview(result);
      setAiStatus("preview");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? error.code as AiOptimizerErrorCode
        : undefined;
      setAiError(aiErrorMessage(code));
      setAiStatus("error");
    }
  }

  function applyAiPreview() {
    if (!aiPreview) return;
    setPromptSession((current) => applyAiPrompt(current, aiPreview.optimizedPrompt, {
      model: aiPreview.model,
      optimizedAt: aiPreview.optimizedAt,
    }));
    setAiPreview(null);
    setAiStatus("idle");
    setAiError("");
  }

  function cancelAiPreview() {
    setAiPreview(null);
    setAiStatus("idle");
  }

  function savePrompt() {
    const now = new Date().toISOString();
    const record: SavedPromptV2 = {
      id: crypto.randomUUID(),
      schemaVersion: 2,
      name: promptInput.subject.trim() || `Untitled ${promptInput.mode} prompt`,
      mode: promptInput.mode,
      platform: promptInput.platform,
      input: promptInput,
      generatedPrompt: composition.prompt,
      editedPrompt: promptSession.value,
      selectedTechniqueIds: selected.map((technique) => technique.id),
      structuredDraft: composition,
      outputLanguage,
      promptState: promptSession.state === "ai-preview"
        ? "manual"
        : promptSession.state,
      ...(promptSession.aiMetadata
        ? { aiMetadata: promptSession.aiMetadata }
        : {}),
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
    };
    setSavedPrompts((current) => [record, ...current]);
    if (persistence === "indexeddb") void (async () => {
      const queue = await createQueueRecord("saved_prompt", record.id, "upsert", record);
      if (queue) await ownerMutationRepository.savePrompt(record, queue);
      else await promptRepository.save(record);
      await syncEngine?.syncNow();
    })();
    setNotice(language === "th" ? "บันทึก Prompt แล้ว" : "Prompt saved");
    window.setTimeout(() => setNotice(""), 2200);
  }

  function openSavedPrompt(prompt: SavedPrompt) {
    const saved = upgradeSavedPrompt(prompt);
    const restoredSelection = saved.selectedTechniqueIds
      .map((id) => techniques.find((technique) => technique.id === id))
      .filter((technique): technique is Technique => Boolean(technique));
    const automatic = saved.structuredDraft.prompt || saved.generatedPrompt;
    const automaticSession = createPromptSession(automatic);
    let restoredSession = automaticSession;
    if (saved.promptState === "manual") {
      restoredSession = editPrompt(automaticSession, saved.editedPrompt);
    } else if (saved.promptState === "stale") {
      restoredSession = markPromptStale(
        editPrompt(automaticSession, saved.editedPrompt),
        "saved-data",
      );
    } else if (saved.promptState === "ai-applied") {
      restoredSession = saved.aiMetadata
        ? applyAiPrompt(automaticSession, saved.editedPrompt, saved.aiMetadata)
        : editPrompt(automaticSession, saved.editedPrompt);
    }

    setPromptInput(saved.input);
    setSelected(restoredSelection);
    setOutputLanguage(saved.outputLanguage);
    setSelectionWarning("");
    setPromptSession(restoredSession);
    setView("prompt");
  }

  function downloadArchive(bytes: Uint8Array, filename: string) {
    const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportBackup() {
    const media = persistence === "indexeddb" ? await mediaRepository.list() : [];
    const bytes = await createBackupArchive({ techniques, prompts: savedPrompts, settings, media });
    downloadArchive(bytes, `framecraft-backup-${new Date().toISOString().slice(0, 10)}.zip`);
    setNotice("Export Backup แล้ว");
  }

  async function importBackup(file: File) {
    try {
      const backup = inspectBackupArchive(new Uint8Array(await file.arrayBuffer()));
      if (persistence === "indexeddb") {
        if (importMode === "replace") {
          const snapshot = await createBackupArchive({
            techniques, prompts: savedPrompts, settings, media: await mediaRepository.list(),
          });
          downloadArchive(snapshot, `framecraft-snapshot-before-import-${new Date().toISOString().slice(0, 10)}.zip`);
        }
        await restoreBackup(frameCraftDb, backup, importMode);
        const [records, prompts, media, storedSettings] = await Promise.all([
          techniqueRepository.list(), promptRepository.list(), mediaRepository.list(), settingsRepository.get(),
        ]);
        setTechniques(records);
        setSavedPrompts(prompts);
        setMediaUrls((current) => {
          Object.values(current).forEach((url) => URL.revokeObjectURL(url));
          return Object.fromEntries(media.map((record) => [record.techniqueId, URL.createObjectURL(record.blob)]));
        });
        if (storedSettings) { setSettings(storedSettings); setLanguage(storedSettings.language); }
      } else {
        setTechniques(importMode === "replace" ? backup.techniques : [...techniques, ...backup.techniques.filter((record) => !techniques.some((item) => item.id === record.id))]);
        setSavedPrompts(importMode === "replace" ? backup.prompts : [...savedPrompts, ...backup.prompts.filter((record) => !savedPrompts.some((item) => item.id === record.id))]);
      }
      setNotice(`Import แบบ ${importMode === "merge" ? "รวมข้อมูล" : "แทนที่ทั้งหมด"} สำเร็จ ${backup.techniques.length} รายการ`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import ไม่สำเร็จ");
    }
  }

  async function createTechnique(form: HTMLFormElement) {
    const data = new FormData(form);
    const now = new Date().toISOString();
    const titleEn = String(data.get("titleEn") || "Untitled Technique");
    const titleTh = String(data.get("titleTh") || "เทคนิคใหม่");
    const categoryValue = String(data.get("category")) as TechniqueCategory;
    const descriptionTh = String(data.get("descriptionTh") || "คำอธิบายเทคนิค Production ส่วนตัว");
    const prompt = String(data.get("prompt") || titleEn.toLocaleLowerCase());
    const videoReferenceUrl = String(data.get("videoReferenceUrl") || "").trim();
    const videoValidation = validateVideoReferenceUrl(videoReferenceUrl);
    if (!videoValidation.valid) { setNotice(videoValidation.error); return; }
    const mediaFile = data.get("media");
    if (mediaFile instanceof File && mediaFile.size > 0) {
      const validation = validateMediaFile(mediaFile);
      if (!validation.valid) { setNotice(validation.error); return; }
    }
    const record: Technique = {
      id: editing?.id || crypto.randomUUID(), slug: editing?.slug || `${titleEn.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      schemaVersion: 1, sourceType: "custom", category: categoryValue, titleEn, titleTh,
      descriptionEn: `A custom production reference for ${titleEn}.`, descriptionTh, useCasesTh: "ใช้ตามบริบทที่ผู้ใช้กำหนด",
      effectTh: "สร้างผลลัพธ์ตาม Prompt และการตั้งค่าที่บันทึกไว้", warningsTh: "ทดสอบกับกล้องและแพลตฟอร์มก่อนใช้งานจริง",
      tags: [titleEn.toLocaleLowerCase()], moods: ["custom"], recommendedLenses: [], cameraSettings: [],
      imageKeywords: [prompt], videoKeywords: [`${prompt}, controlled motion`], genericImagePrompt: prompt,
      genericVideoPrompt: `${prompt}, controlled cinematic motion`, videoReferenceUrl: videoReferenceUrl || undefined,
      isFavorite: editing?.isFavorite || false, isHidden: editing?.isHidden || false, createdAt: editing?.createdAt || now, updatedAt: now,
    };
    setTechniques((current) => editing ? current.map((item) => item.id === record.id ? record : item) : [record, ...current]);
    if (persistence === "indexeddb") await persistTechnique(record);
    if (mediaFile instanceof File && mediaFile.size > 0) {
      const mediaId = crypto.randomUUID();
      const dimensions = await readImageDimensions(mediaFile);
      const mediaRecord = {
        id: mediaId, techniqueId: record.id, blob: mediaFile, mimeType: mediaFile.type,
        width: dimensions.width, height: dimensions.height, byteSize: mediaFile.size, altTh: `ภาพอ้างอิง ${titleTh}`,
        altEn: `${titleEn} reference image`, createdAt: now, updatedAt: now,
      };
      if (persistence === "indexeddb") await persistMedia(mediaRecord);
      setMediaUrls((current) => {
        if (current[record.id]) URL.revokeObjectURL(current[record.id]);
        return { ...current, [record.id]: URL.createObjectURL(mediaFile) };
      });
    }
    setShowNew(false); setEditing(null); setNotice(editing ? "บันทึกการแก้ไขแล้ว" : "เพิ่มเทคนิคใหม่แล้ว");
  }

  async function duplicateTechnique(source: Technique) {
    const now = new Date().toISOString();
    const copy: Technique = {
      ...source, id: crypto.randomUUID(), slug: `${source.slug}-copy-${now.replace(/\D/g, "")}`,
      sourceType: "custom", titleEn: `${source.titleEn} Copy`, titleTh: `${source.titleTh} (สำเนา)`,
      isHidden: false, createdAt: now, updatedAt: now,
    };
    setTechniques((current) => [copy, ...current]);
    if (persistence === "indexeddb") {
      await persistTechnique(copy);
      const media = await mediaRepository.getByTechnique(source.id);
      if (media) {
        const cloned = { ...media, id: crypto.randomUUID(), techniqueId: copy.id, blob: media.blob.slice(), createdAt: now, updatedAt: now };
        await persistMedia(cloned);
        setMediaUrls((current) => ({ ...current, [copy.id]: URL.createObjectURL(cloned.blob) }));
      }
    }
    setNotice("ทำสำเนาเทคนิคแล้ว");
  }

  async function deleteTechnique(technique: Technique) {
    if (!window.confirm(`ลบ ${technique.titleEn} ออกจากคลังถาวรหรือไม่?`)) return;
    setTechniques((current) => current.filter((item) => item.id !== technique.id));
    if (persistence === "indexeddb") {
      const media = await mediaRepository.getByTechnique(technique.id);
      const queue = await createQueueRecord("technique", technique.id, "delete", {});
      const mediaQueue = media ? await createQueueRecord("media", media.id, "delete", media) : null;
      if (queue) await ownerMutationRepository.deleteTechnique(technique.id, queue, media, mediaQueue ?? undefined);
      else {
        if (media) await mediaRepository.delete(media.id);
        await techniqueRepository.delete(technique.id);
      }
      await syncEngine?.syncNow();
    }
    setMediaUrls((current) => {
      if (current[technique.id]) URL.revokeObjectURL(current[technique.id]);
      const next = { ...current }; delete next[technique.id]; return next;
    });
    setNotice("ลบเทคนิคแล้ว");
  }

  function goHome() {
    setView("library");
    setMobileMenu(false);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  const copy = language === "th" ? {
    eyebrow: "PERSONAL PRODUCTION SYSTEM", titleA: "DIRECT", titleB: "THE FRAME.", subtitle: "คลังภาษาภาพสำหรับกองถ่ายและ AI Generation ที่ค้นหาเร็ว ประกอบ Prompt ได้ และเป็นของคุณเอง",
    search: "ค้นหา Shot, Angle, Lens, Lighting หรือ Mood...", count: "เทคนิคพร้อมใช้", reference: "Production reference ส่วนตัว",
  } : {
    eyebrow: "PERSONAL PRODUCTION SYSTEM", titleA: "DIRECT", titleB: "THE FRAME.", subtitle: "A field guide for real productions and AI generation—search, combine, and keep your visual language in one place.",
    search: "Search shots, angles, lenses, lighting or moods...", count: "ready techniques", reference: "Personal production reference",
  };
  const detailImageUrl = detail ? mediaUrls[detail.id] : undefined;

  return (
    <div className="framecraft-app">
      <nav className={`app-rail ${mobileMenu ? "is-open" : ""}`} aria-label="เมนูหลัก">
        <button className="rail-mark" onClick={goHome} aria-label="FRAME / CRAFT Home"><Video size={22} strokeWidth={1.7} aria-hidden="true" /></button>
        <div className="rail-links">
          {navItems.filter(({ id }) => id !== "manage" || isOwner).map(({ id, th, en, icon: Icon }) => <button key={id} className={view === id ? "is-active" : ""} onClick={() => { setView(id); setMobileMenu(false); }} aria-label={th} title={language === "th" ? th : en}><Icon size={19} /><span>{language === "th" ? th : en}</span></button>)}
        </div>
        <button className="rail-language" aria-label={language === "th" ? "เปลี่ยนภาษาเป็นอังกฤษ" : "Switch language to Thai"} onClick={() => updateSettings({ language: language === "th" ? "en" : "th" })}><Languages size={18} /><span>{language === "th" ? "TH" : "EN"}</span></button>
      </nav>

      <main className="app-main">
        <header className="mobile-header"><button onClick={() => setMobileMenu((value) => !value)} aria-label="เปิดเมนู"><Menu size={20} /></button><strong>FRAME / CRAFT</strong><button onClick={() => setView("prompt")} aria-label="เปิด Prompt Lab"><Sparkles size={19} /></button></header>
        {(view === "library" || view === "favorites") && <>
          <section className="hero-zone">
            <div className="hero-copy"><span className="kicker">{copy.eyebrow}</span><h1>{copy.titleA}<br /><em>{copy.titleB}</em></h1><p>{copy.subtitle}</p><span className="reference-copy">{copy.reference}</span></div>
            <div className="lens-signature" aria-hidden="true"><div className="lens-ring lens-ring--one" /><div className="lens-ring lens-ring--two" /><div className="lens-core"><span>ƒ / 2.8</span><b>35</b><small>MM</small></div><div className="focus-scale"><span>∞</span><i /><span>10</span><i /><span>5</span><i /><span>2</span></div></div>
          </section>
          <section className="library-toolbar">
            <label className="search-field"><Search size={18} /><input type="search" aria-label="ค้นหาคลัง Production" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} /><kbd>⌘ K</kbd></label>
            {isOwner ? <button className="new-technique" onClick={() => { setEditing(null); setShowNew(true); }}><Plus size={17} /> เพิ่มมุมภาพ</button> : null}
          </section>
          <div className="library-summary"><span>{String(filtered.length).padStart(2, "0")} / {copy.count}</span><span>07 / PRODUCTION CHAPTERS</span></div>
          {view === "favorites" && savedPrompts.length > 0 && <section className="saved-prompts"><div className="section-label"><span>SAVED PROMPTS / {String(savedPrompts.length).padStart(2, "0")}</span></div>{savedPrompts.map((prompt) => <article key={prompt.id}><span>{prompt.mode.toUpperCase()} · {prompt.platform}</span><h2>{prompt.name}</h2><p>{prompt.editedPrompt}</p><div><button onClick={() => openSavedPrompt(prompt)}>เปิดใน Prompt Lab</button>{isOwner ? <button aria-label={`ลบ ${prompt.name}`} onClick={() => void removeSavedPrompt(prompt)}><X size={14} /></button> : null}</div></article>)}</section>}
          <ChapterNav active={visibleActiveChapter} counts={chapterCounts} language={language} />
          {filtered.length ? <div className="production-chapters">{categoryOrder.map((categoryId, index) => <CategorySection key={categoryId} category={categoryId} index={index} techniques={grouped[categoryId].map((item) => ({ ...item, isFavorite: favoriteIds.has(item.id) }))} language={language} mediaUrls={mediaUrls} onAdd={addToPrompt} onFavorite={toggleFavorite} onOpen={setDetail} />)}</div> : <section className="empty-state"><Search size={28} /><h2>ไม่พบเทคนิคที่ค้นหา</h2><p>ลองเปลี่ยนคำค้นหรือใช้คำที่กว้างขึ้น</p><button onClick={() => setSearch("")}>ล้างคำค้น</button></section>}
        </>}

        {isOwner && view === "manage" && <section className="utility-view">
          <span className="kicker">LIBRARY CONTROL</span>
          <div className="utility-head"><div><h1>จัดการคลัง</h1><p>เพิ่ม แก้ไข ทำสำเนา ซ่อน หรือคืนค่า Production Reference ของคุณ</p></div><button className="primary-button" onClick={() => { setEditing(null); setShowNew(true); }}><Plus size={16} /> เพิ่มเทคนิค</button></div>
          <div className="manage-list">{techniques.map((technique) => <div key={technique.id}>
            <span className="manage-code">{technique.abbreviation || "REF"}</span>
            <span><strong>{technique.titleEn}</strong><small>{technique.titleTh} · {categoryLabels[technique.category].th}</small></span>
            <em>{technique.sourceType === "seed" ? "STARTER" : "CUSTOM"}</em>
            <span className="manage-actions">
              {technique.sourceType === "custom" && <button onClick={() => { setEditing(technique); setShowNew(true); }}>แก้ไข</button>}
              <button onClick={() => void duplicateTechnique(technique)}>สำเนา</button>
              <button onClick={() => void hideTechnique(technique)}>{technique.isHidden ? "คืนค่า" : "ซ่อน"}</button>
              {technique.sourceType === "custom" && <button className="danger-button" onClick={() => void deleteTechnique(technique)}>ลบ</button>}
            </span>
          </div>)}</div>
        </section>}

        {view === "settings" && <section className="utility-view">
          <span className="kicker">LOCAL-FIRST CONTROL</span>
          <div className="utility-head"><div><h1>ตั้งค่าและสำรองข้อมูล</h1><p>ข้อมูลหลักและรูปอ้างอิงเก็บในเบราว์เซอร์เครื่องนี้ Export ไว้ก่อนเปลี่ยนเครื่องหรือล้างข้อมูล</p></div></div>
          <div className="settings-grid">
            {runtime ? <OwnerAuthPanel key={`${ownerSession.state}:${"userId" in ownerSession ? ownerSession.userId : "guest"}`} repository={runtime.auth} initialSession={ownerSession} origin={typeof window === "undefined" ? "" : window.location.origin} onSessionChange={setOwnerSession} /> : <article><Settings size={22} /><h2>Cloud ยังไม่เชื่อมต่อ</h2><p>เว็บไซต์ยังใช้งานแบบ Local ได้ตามปกติ กรุณาตั้งค่า Supabase Environment เมื่อต้องการ Sync</p></article>}
            {isOwner ? <article><Download size={22} /><h2>Export Backup</h2><p>บันทึกเทคนิค Prompt การตั้งค่า และรูปอ้างอิงเป็นไฟล์ ZIP ชุดเดียว</p><button onClick={() => void exportBackup()}><Download size={15} /> Export ตอนนี้</button></article> : null}
            {isOwner ? <article><Upload size={22} /><h2>Import Backup</h2><p>เลือก Merge เพื่อรวมรายการ หรือ Replace เพื่อแทนที่ทั้งหมดและดาวน์โหลด Snapshot เดิมอัตโนมัติ</p><label className="field"><span>วิธีนำเข้า</span><select value={importMode} onChange={(event) => setImportMode(event.target.value as "merge" | "replace")}><option value="merge">Merge — รวมข้อมูล</option><option value="replace">Replace — แทนที่ทั้งหมด</option></select></label><button onClick={() => importRef.current?.click()}><Upload size={15} /> เลือกไฟล์ ZIP</button><input ref={importRef} type="file" accept=".zip,application/zip" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); }} /></article> : null}
            <article><Languages size={22} /><h2>ค่าเริ่มต้น</h2><label className="field"><span>ภาษา UI</span><select value={settings.language} onChange={(event) => updateSettings({ language: event.target.value as "th" | "en" })}><option value="th">ภาษาไทย</option><option value="en">English</option></select></label><label className="field"><span>Prompt Mode</span><select value={settings.defaultMode} onChange={(event) => updateSettings({ defaultMode: event.target.value as "image" | "video" })}><option value="image">Image</option><option value="video">Video</option></select></label><label className="field"><span>Platform</span><select value={settings.defaultPlatform} onChange={(event) => updateSettings({ defaultPlatform: event.target.value as AppSettings["defaultPlatform"] })}><option value="generic-image">Generic Image</option><option value="midjourney">Midjourney</option><option value="flux">Flux</option><option value="generic-video">Generic Video</option><option value="runway">Runway</option><option value="kling">Kling</option><option value="veo">Veo</option></select></label></article>
            {runtime && ownerSession.state === "owner" ? <SyncStatus snapshot={syncSnapshot} /> : null}
            {migrationService ? <MigrationWizard isOwner service={migrationService} /> : null}
          </div>
        </section>}

        {view === "prompt" && <div className="mobile-prompt-view"><PromptPanel input={promptInput} selected={selected} composition={composition} session={promptSession} outputLanguage={outputLanguage} selectionWarning={selectionWarning} onFieldChange={changePromptField} onModeChange={changePromptMode} onLanguageChange={changeOutputLanguage} onOutputEdit={(value) => setPromptSession((current) => editPrompt(current, value))} onRegenerate={() => setPromptSession((current) => replaceWithAutomaticPrompt(current, current.automaticPrompt))} onRemove={removeFromPrompt} onReset={resetPrompt} onSave={savePrompt} canUseAi={isOwner && Boolean(runtime?.ai)} aiStatus={aiStatus} aiError={aiError} onAnalyze={() => void analyzeWithAi()} /></div>}
      </main>

      <PromptPanel compact input={promptInput} selected={selected} composition={composition} session={promptSession} outputLanguage={outputLanguage} selectionWarning={selectionWarning} onFieldChange={changePromptField} onModeChange={changePromptMode} onLanguageChange={changeOutputLanguage} onOutputEdit={(value) => setPromptSession((current) => editPrompt(current, value))} onRegenerate={() => setPromptSession((current) => replaceWithAutomaticPrompt(current, current.automaticPrompt))} onRemove={removeFromPrompt} onReset={resetPrompt} onSave={savePrompt} canUseAi={isOwner && Boolean(runtime?.ai)} aiStatus={aiStatus} aiError={aiError} onAnalyze={() => void analyzeWithAi()} />

      {aiPreview ? <AiPromptPreview result={aiPreview} onApply={applyAiPreview} onCancel={cancelAiPreview} /> : null}

      {detail && <div className="modal-backdrop" role="presentation" onMouseDown={() => setDetail(null)}><section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" onClick={() => setDetail(null)} aria-label="ปิดรายละเอียด"><X /></button><div className="detail-visual" data-category={detail.category}>{detailImageUrl ? <img /* eslint-disable-line @next/next/no-img-element */ className={detail.id === "shot-close-up" ? "natural-color-reference" : undefined} src={detailImageUrl} alt={`ภาพอ้างอิง ${detail.titleTh}`} /> : <><span className="viewfinder-grid" /><b>{detail.abbreviation || detail.recommendedLenses[0]}</b></>}</div><div className="detail-copy"><span className="kicker">{categoryLabels[detail.category].en}</span><h2 id="detail-title">{detail.titleEn}</h2><h3>{detail.titleTh}</h3><p>{detail.descriptionTh}</p><dl><div><dt>ใช้เมื่อ</dt><dd>{detail.useCasesTh}</dd></div><div><dt>ผลต่อภาพ</dt><dd>{detail.effectTh}</dd></div><div><dt>Lens</dt><dd>{detail.recommendedLenses.join(", ") || "เลือกตามบริบท"}</dd></div><div><dt>ระวัง</dt><dd>{detail.warningsTh}</dd></div></dl><code>{detail.genericImagePrompt}</code><button className="primary-button" onClick={() => { addToPrompt(detail); setDetail(null); }}><Plus size={16} /> เพิ่มเข้า Prompt Lab</button></div></section></div>}

      {isOwner && showNew && <div className="modal-backdrop" role="presentation"><form className="new-dialog" role="dialog" aria-modal="true" aria-labelledby="new-title" onSubmit={(event) => { event.preventDefault(); void createTechnique(event.currentTarget); }}>
        <button type="button" className="dialog-close" onClick={() => { setShowNew(false); setEditing(null); }} aria-label="ปิด"><X /></button>
        <span className="kicker">CUSTOM REFERENCE</span><h2 id="new-title">{editing ? "แก้ไขมุมภาพ" : "เพิ่มมุมภาพของคุณ"}</h2>
        <div className="field-grid"><label className="field"><span>ชื่ออังกฤษ</span><input name="titleEn" required placeholder="Push In Reveal" defaultValue={editing?.titleEn} /></label><label className="field"><span>ชื่อไทย</span><input name="titleTh" required placeholder="ดันกล้องเข้าเพื่อเปิดเผย" defaultValue={editing?.titleTh} /></label></div>
        <label className="field"><span>หมวด</span><select name="category" defaultValue={editing?.category}>{Object.entries(categoryLabels).map(([id, label]) => <option key={id} value={id}>{label.th}</option>)}</select></label>
        <label className="field"><span>คำอธิบาย</span><textarea name="descriptionTh" rows={3} required defaultValue={editing?.descriptionTh} /></label>
        <label className="field"><span>Prompt Keywords</span><input name="prompt" required placeholder="slow push in, controlled reveal" defaultValue={editing?.genericImagePrompt} /></label>
        <label className="field"><span>Video Reference URL (ถ้ามี)</span><input name="videoReferenceUrl" type="url" placeholder="https://vimeo.com/..." defaultValue={editing?.videoReferenceUrl} /></label>
        <label className="field"><span>{editing ? "เปลี่ยนภาพอ้างอิง" : "ภาพอ้างอิง"} (JPG, PNG, WebP ไม่เกิน 10 MB)</span><input name="media" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <button className="primary-button" type="submit">{editing ? "บันทึกการแก้ไข" : "บันทึกเทคนิค"}</button>
      </form></div>}
      {notice && <div className="toast" role="status" aria-live="polite">{notice}</div>}
    </div>
  );
}
