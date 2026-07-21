import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategorySection } from "../app/framecraft/CategorySection";
import { ChapterNav } from "../app/framecraft/ChapterNav";
import { starterTechniques } from "../app/framecraft/seed-data";

const counts = {
  "shot-size": 10,
  "camera-angle": 9,
  "camera-movement": 10,
  lighting: 10,
  composition: 9,
  lens: 7,
  "camera-settings": 5,
} as const;

describe("production chapter components", () => {
  it("marks the active chapter and scrolls to a selected chapter", async () => {
    const scrollIntoView = vi.fn();
    const target = document.createElement("section");
    target.id = "chapter-camera-angle";
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);

    render(<ChapterNav active="shot-size" language="th" counts={counts} />);

    expect(screen.getByRole("button", { name: "01 ระยะภาพ" })).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByRole("button", { name: "02 มุมกล้อง" }));
    expect(scrollIntoView).toHaveBeenCalledOnce();
    target.remove();
  });

  it("renders chapter guidance and only the supplied techniques", () => {
    render(
      <CategorySection
        category="camera-angle"
        index={1}
        techniques={starterTechniques.filter((item) => item.category === "camera-angle")}
        language="th"
        mediaUrls={{}}
        onAdd={() => undefined}
        onFavorite={() => undefined}
        onOpen={() => undefined}
      />,
    );

    const section = screen.getByRole("region", { name: "02 Camera Angles" });
    expect(within(section).getByText("Production Tip")).toBeInTheDocument();
    expect(within(section).getByText("Prompt Formula")).toBeInTheDocument();
    expect(within(section).getAllByRole("article")).toHaveLength(9);
    expect(within(section).queryByRole("article", { name: "Wide Shot / ภาพกว้าง" })).not.toBeInTheDocument();
  });
});
