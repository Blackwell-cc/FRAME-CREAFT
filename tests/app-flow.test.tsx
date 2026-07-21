import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
});
