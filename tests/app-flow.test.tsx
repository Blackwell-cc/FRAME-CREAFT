import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FrameCraftApp } from "../app/framecraft/FrameCraftApp";
import { starterTechniques } from "../app/framecraft/seed-data";

describe("FRAME / CRAFT application", () => {
  it("organizes the library into seven searchable production chapters", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

    expect(screen.getByRole("region", { name: "01 Shot Sizes" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "02 Camera Angles" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "07 Camera Settings" })).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "ค้นหาคลัง Production" }), "low angle");

    expect(screen.queryByRole("region", { name: "01 Shot Sizes" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "02 Camera Angles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "01 ระยะภาพ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "02 มุมกล้อง" })).toBeEnabled();
  });

  it("searches the starter library and adds a technique to the live prompt", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

    expect(screen.getByText("FRAME / CRAFT")).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "ค้นหาคลัง Production" }), "low angle");

    const card = await screen.findByRole("article", { name: "Low Angle / มุมเสย" });
    expect(screen.queryByRole("article", { name: "Eye-Level / ระดับสายตา" })).not.toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "เพิ่ม Low Angle เข้า Prompt" }));
    await user.type(screen.getByLabelText("ตัวแบบ"), "a Thai film director");

    expect((screen.getByLabelText("Generated prompt") as HTMLTextAreaElement).value).toContain(
      "low angle perspective",
    );
  });

  it("filters favorites and switches the interface language", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

    const card = screen.getByRole("article", { name: "Extreme Wide Shot / ภาพกว้างมาก" });
    await user.click(within(card).getByRole("button", { name: "เพิ่ม Extreme Wide Shot เป็นรายการโปรด" }));
    await user.click(screen.getByRole("button", { name: "รายการโปรด" }));

    expect(screen.getByRole("article", { name: "Extreme Wide Shot / ภาพกว้างมาก" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Wide Shot / ภาพกว้าง" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "เปลี่ยนภาษาเป็นอังกฤษ" }));
    expect(screen.getByText("Personal production reference")).toBeInTheDocument();
  });

  it("returns to the library and smoothly scrolls to the top from the camera mark", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

    const navigation = screen.getAllByRole("navigation")[0];
    await user.click(within(navigation).getAllByRole("button")[3]);
    await user.click(screen.getByRole("button", { name: "FRAME / CRAFT Home" }));

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("uses instant home scrolling when reduced motion is enabled", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

    await user.click(screen.getByRole("button", { name: "FRAME / CRAFT Home" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("shows a clean approved Close-Up reference in the card and detail view", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

    const approvedImage = "/images/techniques/close-up-korean-actor-clean-studio-v3.webp";
    const card = screen.getByRole("article", { name: /^Close-Up/ });
    const cardImage = card.querySelector("img");

    expect(cardImage).toHaveAttribute("src", approvedImage);
    expect(cardImage).toHaveClass("natural-color-reference");
    expect(card.querySelector(".viewfinder-grid")).not.toBeInTheDocument();
    expect(card.querySelector(".visual-code")).not.toBeInTheDocument();
    expect(card.querySelector(".visual-index")).not.toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: /^Close-Up/ }));

    const dialog = screen.getByRole("dialog");
    const detailImage = dialog.querySelector("img");
    expect(detailImage).toHaveAttribute("src", approvedImage);
    expect(detailImage).toHaveClass("natural-color-reference");
    expect(dialog.querySelector(".viewfinder-grid")).not.toBeInTheDocument();
    expect(dialog.querySelector(".detail-visual b")).not.toBeInTheDocument();
  });

  it("keeps fallback overlays for techniques without reference images", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

    const card = screen.getByRole("article", { name: /^Extreme Wide Shot/ });
    expect(card.querySelector("img")).not.toBeInTheDocument();
    expect(card.querySelector(".viewfinder-grid")).toBeInTheDocument();
    expect(card.querySelector(".visual-code")).toHaveTextContent("EWS");
    expect(card.querySelector(".visual-index")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: /^Extreme Wide Shot/ }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("img")).not.toBeInTheDocument();
    expect(dialog.querySelector(".viewfinder-grid")).toBeInTheDocument();
    expect(dialog.querySelector(".detail-visual b")).toHaveTextContent("EWS");
  });
});
