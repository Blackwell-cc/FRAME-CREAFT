"use client";

import { categoryGuides, categoryOrder } from "./category-guides";
import type { TechniqueCategory } from "./types";

interface ChapterNavProps {
  active: TechniqueCategory;
  counts: Record<TechniqueCategory, number>;
  language: "th" | "en";
}

export function ChapterNav({ active, counts, language }: ChapterNavProps) {
  function navigate(category: TechniqueCategory) {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`chapter-${category}`)?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <nav className="chapter-nav" aria-label="สารบัญ Production Chapters">
      <div className="chapter-nav__track">
        {categoryOrder.map((category, index) => {
          const guide = categoryGuides[category];
          const number = String(index + 1).padStart(2, "0");
          const title = language === "th" ? guide.titleTh : guide.titleEn;
          return (
            <button
              key={category}
              type="button"
              className={active === category ? "is-active" : ""}
              aria-current={active === category ? "true" : undefined}
              aria-label={`${number} ${title}`}
              disabled={counts[category] === 0}
              onClick={() => navigate(category)}
            >
              <span>{number}</span>
              <strong>{title}</strong>
              <small>{String(counts[category]).padStart(2, "0")}</small>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
