"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, BookOpen, Download, Heart, Languages, Menu, Plus, Search, Settings, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";
import { createBackupArchive, inspectBackupArchive } from "./backup-service";
import { validateMediaFile, validateVideoReferenceUrl } from "./media-service";
import { composePrompt } from "./prompt-composer";
import { PromptPanel } from "./PromptPanel";
import { categoryLabels, starterTechniques } from "./seed-data";
import { frameCraftDb, mediaRepository, promptRepository, restoreBackup, settingsRepository, techniqueRepository } from "./storage";
import { TechniqueCard } from "./TechniqueCard";
import type { AppSettings, PromptInput, SavedPrompt, Technique, TechniqueCategory } from "./types";
import "./framecraft.css";

type View = "library" | "favorites" | "manage" | "settings" | "prompt";

interface FrameCraftAppProps {
  initialTechniques?: Technique[];
  persistence?: "indexeddb" | "memory";
}

const emptyPrompt: PromptInput = {
  mode: "image", platform: "generic-image", subject: "", action: "", environment: "",
  shotSize: "", angle: "", lens: "", movement: "", lighting: "", composition: "",
  mood: "deep monochrome color grade, subtle film grain", aspectRatio: "16:9", duration: "", pacing: "",
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

function applyTechnique(input: PromptInput, technique: Technique): PromptInput {
  const value = technique.imageKeywords[0] || technique.genericImagePrompt;
  switch (technique.category) {
    case "shot-size": return { ...input, shotSize: value };
    case "camera-angle": return { ...input, angle: value };
    case "camera-movement": return { ...input, movement: technique.videoKeywords[0] || value };
    case "lighting": return { ...input, lighting: value };
    case "composition": return { ...input, composition: value };
    case "lens": return { ...input, lens: value };
    case "camera-settings": return { ...input, mood: `${input.mood}, ${value}` };
  }
}

export function FrameCraftApp({ initialTechniques = starterTechniques, persistence = "indexeddb" }: FrameCraftAppProps) {
  const [techniques, setTechniques] = useState<Technique[]>(initialTechniques);
  const [view, setView] = useState<View>("library");
  const [language, setLanguage] = useState<"th" | "en">("th");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TechniqueCategory | "all">("all");
  const [selected, setSelected] = useState<Technique[]>([]);
  const [promptInput, setPromptInput] = useState<PromptInput>(emptyPrompt);
  const [outputOverride, setOutputOverride] = useState("");
  const [detail, setDetail] = useState<Technique | null>(null);
  const [notice, setNotice] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Technique | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

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
        setMediaUrls(urls);
      }
    });
    return () => { active = false; loadedUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [persistence]);

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
    if (persistence === "indexeddb") void settingsRepository.save(next);
  }

  const filtered = useMemo(() => techniques.filter((technique) => {
    if (technique.isHidden) return false;
    if (view === "favorites" && !technique.isFavorite) return false;
    if (category !== "all" && technique.category !== category) return false;
    const query = search.trim().toLocaleLowerCase("th");
    if (!query) return true;
    return [technique.titleEn, technique.titleTh, technique.abbreviation, technique.descriptionTh, technique.useCasesTh, ...technique.tags, ...technique.moods].filter(Boolean).join(" ").toLocaleLowerCase("th").includes(query);
  }), [techniques, view, category, search]);

  function addToPrompt(technique: Technique) {
    setSelected((current) => current.some((item) => item.id === technique.id) ? current : [...current, technique]);
    setPromptInput((current) => applyTechnique(current, technique));
    setOutputOverride("");
  }

  function removeFromPrompt(id: string) {
    const remaining = selected.filter((item) => item.id !== id);
    setSelected(remaining);
    setPromptInput(remaining.reduce(applyTechnique, { ...emptyPrompt, subject: promptInput.subject, action: promptInput.action, environment: promptInput.environment, mode: promptInput.mode, platform: promptInput.platform }));
    setOutputOverride("");
  }

  function toggleFavorite(technique: Technique) {
    const next = !technique.isFavorite;
    setTechniques((current) => current.map((item) => item.id === technique.id ? { ...item, isFavorite: next } : item));
    if (persistence === "indexeddb") void techniqueRepository.update(technique.id, { isFavorite: next });
  }

  function resetPrompt() {
    setSelected([]); setPromptInput(emptyPrompt); setOutputOverride("");
  }

  function savePrompt() {
    const now = new Date().toISOString();
    const generated = composePrompt(promptInput).prompt;
    const record: SavedPrompt = {
      id: crypto.randomUUID(),
      name: promptInput.subject.trim() || `Untitled ${promptInput.mode} prompt`,
      mode: promptInput.mode,
      platform: promptInput.platform,
      input: promptInput,
      generatedPrompt: generated,
      editedPrompt: outputOverride || generated,
      isFavorite: true,
      createdAt: now,
      updatedAt: now,
    };
    setSavedPrompts((current) => [record, ...current]);
    if (persistence === "indexeddb") void promptRepository.save(record);
    setNotice(language === "th" ? "บันทึก Prompt แล้ว" : "Prompt saved");
    window.setTimeout(() => setNotice(""), 2200);
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
    if (persistence === "indexeddb") {
      if (editing) await techniqueRepository.update(record.id, record);
      else await techniqueRepository.create(record);
    }
    if (mediaFile instanceof File && mediaFile.size > 0) {
      const mediaId = crypto.randomUUID();
      const mediaRecord = {
        id: mediaId, techniqueId: record.id, blob: mediaFile, mimeType: mediaFile.type,
        width: 0, height: 0, byteSize: mediaFile.size, altTh: `ภาพอ้างอิง ${titleTh}`,
        altEn: `${titleEn} reference image`, createdAt: now, updatedAt: now,
      };
      if (persistence === "indexeddb") await mediaRepository.save(mediaRecord);
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
      await techniqueRepository.create(copy);
      const media = await mediaRepository.getByTechnique(source.id);
      if (media) {
        const cloned = { ...media, id: crypto.randomUUID(), techniqueId: copy.id, blob: media.blob.slice(), createdAt: now, updatedAt: now };
        await mediaRepository.save(cloned);
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
      if (media) await mediaRepository.delete(media.id);
      await techniqueRepository.delete(technique.id);
    }
    setMediaUrls((current) => {
      if (current[technique.id]) URL.revokeObjectURL(current[technique.id]);
      const next = { ...current }; delete next[technique.id]; return next;
    });
    setNotice("ลบเทคนิคแล้ว");
  }

  const copy = language === "th" ? {
    eyebrow: "PERSONAL PRODUCTION SYSTEM", titleA: "DIRECT", titleB: "THE FRAME.", subtitle: "คลังภาษาภาพสำหรับกองถ่ายและ AI Generation ที่ค้นหาเร็ว ประกอบ Prompt ได้ และเป็นของคุณเอง",
    search: "ค้นหา Shot, Angle, Lens, Lighting หรือ Mood...", count: "เทคนิคพร้อมใช้", reference: "Production reference ส่วนตัว",
  } : {
    eyebrow: "PERSONAL PRODUCTION SYSTEM", titleA: "DIRECT", titleB: "THE FRAME.", subtitle: "A field guide for real productions and AI generation—search, combine, and keep your visual language in one place.",
    search: "Search shots, angles, lenses, lighting or moods...", count: "ready techniques", reference: "Personal production reference",
  };

  return (
    <div className="framecraft-app">
      <nav className={`app-rail ${mobileMenu ? "is-open" : ""}`} aria-label="เมนูหลัก">
        <button className="rail-mark" onClick={() => setView("library")} aria-label="FRAME / CRAFT Home">FC</button>
        <div className="rail-links">
          {navItems.map(({ id, th, en, icon: Icon }) => <button key={id} className={view === id ? "is-active" : ""} onClick={() => { setView(id); setMobileMenu(false); }} aria-label={th} title={language === "th" ? th : en}><Icon size={19} /><span>{language === "th" ? th : en}</span></button>)}
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
            <button className="new-technique" onClick={() => { setEditing(null); setShowNew(true); }}><Plus size={17} /> เพิ่มมุมภาพ</button>
          </section>
          <div className="category-tabs" aria-label="กรองหมวดหมู่"><button className={category === "all" ? "is-active" : ""} onClick={() => setCategory("all")}>ALL <span>{techniques.filter((item) => !item.isHidden).length}</span></button>{Object.entries(categoryLabels).map(([id, label]) => <button key={id} className={category === id ? "is-active" : ""} onClick={() => setCategory(id as TechniqueCategory)}>{language === "th" ? label.th : label.en}</button>)}</div>
          <div className="library-summary"><span>{String(filtered.length).padStart(2, "0")} / {copy.count}</span><SlidersHorizontal size={15} /></div>
          {view === "favorites" && savedPrompts.length > 0 && <section className="saved-prompts"><div className="section-label"><span>SAVED PROMPTS / {String(savedPrompts.length).padStart(2, "0")}</span></div>{savedPrompts.map((prompt) => <article key={prompt.id}><span>{prompt.mode.toUpperCase()} · {prompt.platform}</span><h2>{prompt.name}</h2><p>{prompt.editedPrompt}</p><div><button onClick={() => { setPromptInput(prompt.input); setOutputOverride(prompt.editedPrompt); setView("prompt"); }}>เปิดใน Prompt Lab</button><button aria-label={`ลบ ${prompt.name}`} onClick={() => { setSavedPrompts((current) => current.filter((item) => item.id !== prompt.id)); if (persistence === "indexeddb") void promptRepository.delete(prompt.id); }}><X size={14} /></button></div></article>)}</section>}
          {filtered.length ? <section className="technique-grid">{filtered.map((technique) => <TechniqueCard key={technique.id} technique={technique} language={language} imageUrl={mediaUrls[technique.id]} onAdd={addToPrompt} onFavorite={toggleFavorite} onOpen={setDetail} />)}</section> : <section className="empty-state"><Search size={28} /><h2>ไม่พบเทคนิคที่ค้นหา</h2><p>ลองเปลี่ยนคำค้นหรือเปิดหมวดอื่น</p><button onClick={() => { setSearch(""); setCategory("all"); }}>ล้างตัวกรอง</button></section>}
        </>}

        {view === "manage" && <section className="utility-view">
          <span className="kicker">LIBRARY CONTROL</span>
          <div className="utility-head"><div><h1>จัดการคลัง</h1><p>เพิ่ม แก้ไข ทำสำเนา ซ่อน หรือคืนค่า Production Reference ของคุณ</p></div><button className="primary-button" onClick={() => { setEditing(null); setShowNew(true); }}><Plus size={16} /> เพิ่มเทคนิค</button></div>
          <div className="manage-list">{techniques.map((technique) => <div key={technique.id}>
            <span className="manage-code">{technique.abbreviation || "REF"}</span>
            <span><strong>{technique.titleEn}</strong><small>{technique.titleTh} · {categoryLabels[technique.category].th}</small></span>
            <em>{technique.sourceType === "seed" ? "STARTER" : "CUSTOM"}</em>
            <span className="manage-actions">
              {technique.sourceType === "custom" && <button onClick={() => { setEditing(technique); setShowNew(true); }}>แก้ไข</button>}
              <button onClick={() => void duplicateTechnique(technique)}>สำเนา</button>
              <button onClick={() => { setTechniques((current) => current.map((item) => item.id === technique.id ? { ...item, isHidden: !item.isHidden } : item)); if (persistence === "indexeddb") void techniqueRepository.update(technique.id, { isHidden: !technique.isHidden }); }}>{technique.isHidden ? "คืนค่า" : "ซ่อน"}</button>
              {technique.sourceType === "custom" && <button className="danger-button" onClick={() => void deleteTechnique(technique)}>ลบ</button>}
            </span>
          </div>)}</div>
        </section>}

        {view === "settings" && <section className="utility-view">
          <span className="kicker">LOCAL-FIRST CONTROL</span>
          <div className="utility-head"><div><h1>ตั้งค่าและสำรองข้อมูล</h1><p>ข้อมูลหลักและรูปอ้างอิงเก็บในเบราว์เซอร์เครื่องนี้ Export ไว้ก่อนเปลี่ยนเครื่องหรือล้างข้อมูล</p></div></div>
          <div className="settings-grid">
            <article><Download size={22} /><h2>Export Backup</h2><p>บันทึกเทคนิค Prompt การตั้งค่า และรูปอ้างอิงเป็นไฟล์ ZIP ชุดเดียว</p><button onClick={() => void exportBackup()}><Download size={15} /> Export ตอนนี้</button></article>
            <article><Upload size={22} /><h2>Import Backup</h2><p>เลือก Merge เพื่อรวมรายการ หรือ Replace เพื่อแทนที่ทั้งหมดและดาวน์โหลด Snapshot เดิมอัตโนมัติ</p><label className="field"><span>วิธีนำเข้า</span><select value={importMode} onChange={(event) => setImportMode(event.target.value as "merge" | "replace")}><option value="merge">Merge — รวมข้อมูล</option><option value="replace">Replace — แทนที่ทั้งหมด</option></select></label><button onClick={() => importRef.current?.click()}><Upload size={15} /> เลือกไฟล์ ZIP</button><input ref={importRef} type="file" accept=".zip,application/zip" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); }} /></article>
            <article><Languages size={22} /><h2>ค่าเริ่มต้น</h2><label className="field"><span>ภาษา UI</span><select value={settings.language} onChange={(event) => updateSettings({ language: event.target.value as "th" | "en" })}><option value="th">ภาษาไทย</option><option value="en">English</option></select></label><label className="field"><span>Prompt Mode</span><select value={settings.defaultMode} onChange={(event) => updateSettings({ defaultMode: event.target.value as "image" | "video" })}><option value="image">Image</option><option value="video">Video</option></select></label><label className="field"><span>Platform</span><select value={settings.defaultPlatform} onChange={(event) => updateSettings({ defaultPlatform: event.target.value as AppSettings["defaultPlatform"] })}><option value="generic-image">Generic Image</option><option value="midjourney">Midjourney</option><option value="flux">Flux</option><option value="generic-video">Generic Video</option><option value="runway">Runway</option><option value="kling">Kling</option><option value="veo">Veo</option></select></label></article>
          </div>
        </section>}

        {view === "prompt" && <div className="mobile-prompt-view"><PromptPanel input={promptInput} selected={selected} outputOverride={outputOverride} onInput={(changes) => { setPromptInput((current) => ({ ...current, ...changes })); setOutputOverride(""); }} onOutput={setOutputOverride} onRemove={removeFromPrompt} onReset={resetPrompt} onSave={savePrompt} /></div>}
      </main>

      <PromptPanel compact input={promptInput} selected={selected} outputOverride={outputOverride} onInput={(changes) => { setPromptInput((current) => ({ ...current, ...changes })); setOutputOverride(""); }} onOutput={setOutputOverride} onRemove={removeFromPrompt} onReset={resetPrompt} onSave={savePrompt} />

      {detail && <div className="modal-backdrop" role="presentation" onMouseDown={() => setDetail(null)}><section className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" onClick={() => setDetail(null)} aria-label="ปิดรายละเอียด"><X /></button><div className="detail-visual" data-category={detail.category}>{mediaUrls[detail.id] && <img /* eslint-disable-line @next/next/no-img-element */ src={mediaUrls[detail.id]} alt={`ภาพอ้างอิง ${detail.titleTh}`} />}<span className="viewfinder-grid" /><b>{detail.abbreviation || detail.recommendedLenses[0]}</b></div><div className="detail-copy"><span className="kicker">{categoryLabels[detail.category].en}</span><h2 id="detail-title">{detail.titleEn}</h2><h3>{detail.titleTh}</h3><p>{detail.descriptionTh}</p><dl><div><dt>ใช้เมื่อ</dt><dd>{detail.useCasesTh}</dd></div><div><dt>ผลต่อภาพ</dt><dd>{detail.effectTh}</dd></div><div><dt>Lens</dt><dd>{detail.recommendedLenses.join(", ") || "เลือกตามบริบท"}</dd></div><div><dt>ระวัง</dt><dd>{detail.warningsTh}</dd></div></dl><code>{detail.genericImagePrompt}</code><button className="primary-button" onClick={() => { addToPrompt(detail); setDetail(null); }}><Plus size={16} /> เพิ่มเข้า Prompt Lab</button></div></section></div>}

      {showNew && <div className="modal-backdrop" role="presentation"><form className="new-dialog" role="dialog" aria-modal="true" aria-labelledby="new-title" onSubmit={(event) => { event.preventDefault(); void createTechnique(event.currentTarget); }}>
        <button type="button" className="dialog-close" onClick={() => { setShowNew(false); setEditing(null); }} aria-label="ปิด"><X /></button>
        <span className="kicker">CUSTOM REFERENCE</span><h2 id="new-title">{editing ? "แก้ไขมุมภาพ" : "เพิ่มมุมภาพของคุณ"}</h2>
        <div className="field-grid"><label className="field"><span>ชื่ออังกฤษ</span><input name="titleEn" required placeholder="Push In Reveal" defaultValue={editing?.titleEn} /></label><label className="field"><span>ชื่อไทย</span><input name="titleTh" required placeholder="ดันกล้องเข้าเพื่อเปิดเผย" defaultValue={editing?.titleTh} /></label></div>
        <label className="field"><span>หมวด</span><select name="category" defaultValue={editing?.category}>{Object.entries(categoryLabels).map(([id, label]) => <option key={id} value={id}>{label.th}</option>)}</select></label>
        <label className="field"><span>คำอธิบาย</span><textarea name="descriptionTh" rows={3} required defaultValue={editing?.descriptionTh} /></label>
        <label className="field"><span>Prompt Keywords</span><input name="prompt" required placeholder="slow push in, controlled reveal" defaultValue={editing?.genericImagePrompt} /></label>
        <label className="field"><span>Video Reference URL (ถ้ามี)</span><input name="videoReferenceUrl" type="url" placeholder="https://vimeo.com/..." defaultValue={editing?.videoReferenceUrl} /></label>
        <label className="field"><span>{editing ? "เปลี่ยนภาพอ้างอิง" : "ภาพอ้างอิง"} (JPG, PNG, WebP ไม่เกิน 12 MB)</span><input name="media" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <button className="primary-button" type="submit">{editing ? "บันทึกการแก้ไข" : "บันทึกเทคนิค"}</button>
      </form></div>}
      {notice && <div className="toast" role="status" aria-live="polite">{notice}</div>}
    </div>
  );
}
