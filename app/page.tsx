import type { Metadata } from "next";
import { FrameCraftApp } from "./framecraft/FrameCraftApp";

export const metadata: Metadata = {
  title: "FRAME / CRAFT — Production Reference & Prompt Builder",
  description: "คลังมุมกล้อง แสง เลนส์ และ Prompt สำหรับกองถ่ายจริงและ AI Image/Video",
};

export default function Home() {
  return <FrameCraftApp />;
}
