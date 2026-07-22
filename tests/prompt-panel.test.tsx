import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FrameCraftApp } from "../app/framecraft/FrameCraftApp";
import { starterTechniques } from "../app/framecraft/seed-data";

describe("Prompt Lab workflow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps an empty manual prompt and marks it stale after a field changes", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);
    const output = screen.getByLabelText("Generated prompt");

    await user.type(output, "temporary draft");
    await user.clear(output);
    await user.type(screen.getByLabelText("ตัวแบบ"), "a director");

    expect(output).toHaveValue("");
    expect(screen.getByText("ข้อมูลมีการเปลี่ยนแปลง")).toBeInTheDocument();
  });

  it("blocks a second image shot size and explains the existing selection", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);
    const closeUp = screen.getByRole("article", { name: "Close-Up / ภาพใกล้" });
    const extremeCloseUp = screen.getByRole("article", {
      name: "Extreme Close-Up / ภาพใกล้มาก",
    });

    await user.click(
      within(closeUp).getByRole("button", { name: "เพิ่ม Close-Up เข้า Prompt" }),
    );
    await user.click(
      within(extremeCloseUp).getByRole("button", {
        name: "เพิ่ม Extreme Close-Up เข้า Prompt",
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "เลือกได้เพียง 1 รายการ",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Close-Up");
    expect(
      within(screen.getByLabelText("Prompt Lab")).getByText("SELECTED / 01"),
    ).toBeInTheDocument();
  });

  it("cancels a card mutation when a manual prompt would be replaced", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);
    const closeUp = screen.getByRole("article", { name: "Close-Up / ภาพใกล้" });
    const lowAngle = screen.getByRole("article", { name: "Low Angle / มุมเสย" });

    await user.click(
      within(closeUp).getByRole("button", { name: "เพิ่ม Close-Up เข้า Prompt" }),
    );
    const output = screen.getByLabelText("Generated prompt");
    await user.clear(output);
    await user.type(output, "my manual prompt");
    await user.click(
      within(lowAngle).getByRole("button", { name: "เพิ่ม Low Angle เข้า Prompt" }),
    );

    expect(confirm).toHaveBeenCalledOnce();
    expect(output).toHaveValue("my manual prompt");
    expect(
      within(screen.getByLabelText("Prompt Lab")).getByText("SELECTED / 01"),
    ).toBeInTheDocument();
  });

  it("regenerates from the latest fields only when the user asks", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);
    const output = screen.getByLabelText("Generated prompt");

    await user.type(output, "manual wording");
    await user.type(screen.getByLabelText("ตัวแบบ"), "a director");
    expect(output).toHaveValue("manual wording");

    await user.click(screen.getByRole("button", { name: "สร้าง Prompt ใหม่" }));

    expect((output as HTMLTextAreaElement).value).toContain("Subject: a director");
    expect(screen.queryByText("ข้อมูลมีการเปลี่ยนแปลง")).not.toBeInTheDocument();
  });

  it("switches output language independently from the interface language", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);
    await user.type(screen.getByLabelText("ตัวแบบ"), "a director");

    await user.selectOptions(screen.getByLabelText("ภาษาผลลัพธ์"), "th");

    expect(
      (screen.getByLabelText("Generated prompt") as HTMLTextAreaElement).value,
    ).toContain("ตัวแบบ: a director");
    expect(screen.getByText("คลัง Production")).toBeInTheDocument();
  });

  it("adds a duration label and unit from a numeric video input", async () => {
    const user = userEvent.setup();
    render(<FrameCraftApp initialTechniques={starterTechniques} persistence="memory" />);

    await user.click(screen.getByRole("button", { name: "Video" }));
    await user.type(screen.getByLabelText("Duration"), "8");

    expect(
      (screen.getByLabelText("Generated prompt") as HTMLTextAreaElement).value,
    ).toContain("Duration: 8 seconds.");
  });
});
