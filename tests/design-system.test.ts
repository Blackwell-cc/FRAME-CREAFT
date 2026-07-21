import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("optical monochrome design system", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  const css = readFileSync("app/framecraft/framecraft.css", "utf8");

  it("loads Prompt and defines readable type tokens", () => {
    expect(layout).toContain("Prompt");
    expect(layout).toContain("--font-prompt");
    expect(css).toContain("--text-description:13px");
    expect(css).toContain("--text-control:14px");
    expect(css).toContain("--text-button:13px");
  });

  it("defines optical and interactive states", () => {
    expect(css).toContain(".chapter-nav");
    expect(css).toContain(":hover");
    expect(css).toContain(".is-copied");
    expect(css).toContain("prefers-reduced-motion:reduce");
  });
});
