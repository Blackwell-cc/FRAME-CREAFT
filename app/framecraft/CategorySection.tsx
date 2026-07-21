import { categoryGuides } from "./category-guides";
import { TechniqueCard } from "./TechniqueCard";
import type { Technique, TechniqueCategory } from "./types";

interface CategorySectionProps {
  category: TechniqueCategory;
  index: number;
  techniques: Technique[];
  language: "th" | "en";
  mediaUrls: Record<string, string>;
  onAdd: (technique: Technique) => void;
  onFavorite: (technique: Technique) => void;
  onOpen: (technique: Technique) => void;
}

export function CategorySection({
  category,
  index,
  techniques,
  language,
  mediaUrls,
  onAdd,
  onFavorite,
  onOpen,
}: CategorySectionProps) {
  if (techniques.length === 0) return null;
  const guide = categoryGuides[category];
  const number = String(index + 1).padStart(2, "0");

  return (
    <section
      id={`chapter-${category}`}
      className="category-section"
      aria-label={`${number} ${guide.titleEn}`}
    >
      <header className="category-section__head">
        <span className="category-section__number">{number}</span>
        <div>
          <span className="kicker">PRODUCTION CHAPTER / {number}</span>
          <h2>{guide.titleEn}</h2>
          <h3>{guide.titleTh}</h3>
          <p>{language === "th" ? guide.descriptionTh : guide.descriptionEn}</p>
        </div>
      </header>
      <div className="category-guide">
        <div>
          <span>Production Tip</span>
          <p>{language === "th" ? guide.tipTh : guide.tipEn}</p>
        </div>
        <div>
          <span>Prompt Formula</span>
          <code>{guide.promptFormula}</code>
        </div>
      </div>
      <div className="category-section__summary">
        <span>{String(techniques.length).padStart(2, "0")} TECHNIQUES</span>
        <i aria-hidden="true" />
      </div>
      <div className="technique-grid">
        {techniques.map((technique) => (
          <TechniqueCard
            key={technique.id}
            technique={technique}
            language={language}
            imageUrl={mediaUrls[technique.id]}
            onAdd={onAdd}
            onFavorite={onFavorite}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
