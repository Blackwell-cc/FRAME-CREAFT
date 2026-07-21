import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("optical monochrome design system", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const css = readFileSync("app/framecraft/framecraft.css", "utf8");

  it("loads Prompt and defines readable type tokens", () => {
    expect(layout).toContain("Prompt");
    expect(layout).toContain("--font-prompt");
    expect(css).toContain(".framecraft-app{font-family:var(--font-prompt)");
    expect(css).toContain("--text-description:13px");
    expect(css).toContain("--text-control:14px");
    expect(css).toContain("--text-button:13px");
  });

  it("defines optical and interactive states", () => {
    expect(css).toContain(".chapter-nav");
    expect(css).toContain(".app-main{overflow:visible}");
    expect(css).toContain(":hover");
    expect(css).toContain(".is-copied");
    expect(css).toContain("prefers-reduced-motion:reduce");
  });

  it("separates toolbar summary and styles every native dropdown", () => {
    expect(css).toContain(".library-toolbar{margin-bottom:12px}");
    expect(css).toContain(".library-summary{margin:0 0 18px;");
    expect(css).toContain("color-scheme:dark");
    expect(css).toContain(".framecraft-app select option");
    expect(css).toContain("background:#111214");
    expect(css).toContain("color:#f4f4f1");
  });

  it("keeps inverse buttons legible and Thai utility headings in Prompt", () => {
    expect(css).toContain(".rail-links button:hover{color:#050505!important}");
    expect(css).toContain(".mode-toggle button.is-active:hover{color:#050505!important}");
    expect(css).toContain(".primary-button:hover{color:#050505!important}");
    expect(css).toContain(".utility-head h1{font-family:var(--font-prompt)");
    expect(css).toContain(".settings-grid h2{font-family:var(--font-prompt)");
  });

  it("preserves natural color for approved production references", () => {
    expect(css).toContain(".natural-color-reference{filter:none!important}");
  });
});
