import { Heart, Plus } from "lucide-react";
import { categoryLabels } from "./seed-data";
import type { Technique } from "./types";
import { CopyButton } from "./CopyButton";

interface TechniqueCardProps {
  technique: Technique;
  language: "th" | "en";
  imageUrl?: string;
  onAdd: (technique: Technique) => void;
  onFavorite: (technique: Technique) => void;
  onOpen: (technique: Technique) => void;
}

export function TechniqueCard({ technique, language, imageUrl, onAdd, onFavorite, onOpen }: TechniqueCardProps) {
  const category = categoryLabels[technique.category];
  return (
    <article className="technique-card" aria-label={`${technique.titleEn} / ${technique.titleTh}`}>
      <button className="technique-visual" data-category={technique.category} onClick={() => onOpen(technique)}>
        {imageUrl && <img /* eslint-disable-line @next/next/no-img-element */ className={technique.id === "shot-close-up" ? "natural-color-reference" : undefined} src={imageUrl} alt="" />}
        <span className="viewfinder-grid" aria-hidden="true" />
        <span className="visual-code">{technique.abbreviation || technique.recommendedLenses[0]}</span>
        <span className="visual-index">{technique.id.slice(-2).toUpperCase()}</span>
      </button>
      <div className="technique-card__body">
        <div className="technique-card__meta">
          <span>{language === "th" ? category.th : category.en}</span>
          <button
            className={`icon-button ${technique.isFavorite ? "is-active" : ""}`}
            aria-label={`${technique.isFavorite ? "นำ" : "เพิ่ม"} ${technique.titleEn} ${technique.isFavorite ? "ออกจาก" : "เป็น"}รายการโปรด`}
            onClick={() => onFavorite(technique)}
          >
            <Heart size={16} fill={technique.isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        <button className="technique-title" onClick={() => onOpen(technique)}>
          <strong>{technique.titleEn}</strong>
          <span>{technique.titleTh}</span>
        </button>
        <p>{language === "th" ? technique.descriptionTh : technique.descriptionEn}</p>
        <div className="tag-row">
          {technique.moods.slice(0, 2).map((mood) => <span key={mood}>{mood}</span>)}
        </div>
        <div className="technique-card__actions">
          <CopyButton
            value={technique.genericImagePrompt}
            idleLabel="Copy"
            copiedLabel="คัดลอกแล้ว"
            ariaLabel={`คัดลอก Prompt ของ ${technique.titleEn}`}
            className="copy-button"
          />
          <button className="add-button" onClick={() => onAdd(technique)} aria-label={`เพิ่ม ${technique.titleEn} เข้า Prompt`}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>
    </article>
  );
}
