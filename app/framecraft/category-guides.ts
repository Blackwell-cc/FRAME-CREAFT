import type { TechniqueCategory } from "./types";

export interface CategoryGuide {
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  tipTh: string;
  tipEn: string;
  promptFormula: string;
}

export const categoryOrder: TechniqueCategory[] = [
  "shot-size", "camera-angle", "camera-movement", "lighting",
  "composition", "lens", "camera-settings",
];

export const categoryGuides: Record<TechniqueCategory, CategoryGuide> = {
  "shot-size": {
    titleTh: "ระยะภาพ", titleEn: "Shot Sizes",
    descriptionTh: "กำหนดว่าผู้ชมอยู่ใกล้ตัวแบบแค่ไหน และเลือกว่าจะให้อารมณ์หรือสภาพแวดล้อมเป็นผู้เล่าเรื่อง",
    descriptionEn: "Control audience distance and decide whether emotion or environment carries the story.",
    tipTh: "วางลำดับภาพกว้างไปหาใกล้เพื่อสร้างบริบทก่อนพาผู้ชมเข้าสู่อารมณ์",
    tipEn: "Move from wide to close so context arrives before emotional detail.",
    promptFormula: "{shot size} of {subject}, {action}",
  },
  "camera-angle": {
    titleTh: "มุมกล้อง", titleEn: "Camera Angles",
    descriptionTh: "ตำแหน่งกล้องเทียบกับตัวแบบเปลี่ยนความรู้สึกเรื่องอำนาจ ความเปราะบาง และมุมมองของผู้ชม",
    descriptionEn: "Camera position changes power, vulnerability, and the viewer's emotional alignment.",
    tipTh: "เลือกมุมจากความรู้สึกที่ต้องการก่อนเลือกความสวย และตรวจเส้นฉากหลังทุกครั้ง",
    tipEn: "Choose the emotional effect before visual novelty and always check background lines.",
    promptFormula: "{shot size} of {subject}, {camera angle}, {action}",
  },
  "camera-movement": {
    titleTh: "การเคลื่อนกล้อง", titleEn: "Camera Movement",
    descriptionTh: "การเคลื่อนกล้องควบคุมจังหวะการเปิดเผยข้อมูลและพลังงานที่ผู้ชมรู้สึกในช็อต",
    descriptionEn: "Camera motion controls reveal timing and the energy carried through a shot.",
    tipTh: "ทุกการเคลื่อนควรมีเหตุผล เริ่มจากตัวแบบ การเปิดเผยข้อมูล หรือการเปลี่ยนอารมณ์",
    tipEn: "Motivate every move with subject motion, information reveal, or an emotional shift.",
    promptFormula: "{camera movement}, following {subject}, {pacing}",
  },
  lighting: {
    titleTh: "แสง", titleEn: "Lighting",
    descriptionTh: "ทิศทาง คุณภาพ และอัตราส่วนของแสงสร้างเวลา มิติ และอารมณ์ก่อนการเกรดสี",
    descriptionEn: "Direction, quality, and contrast ratio establish time, depth, and mood before grading.",
    tipTh: "กำหนดแสงหลักหนึ่งทิศก่อน แล้วค่อยเพิ่ม Fill หรือ Practical เท่าที่เรื่องต้องการ",
    tipEn: "Commit to one key direction, then add fill or practicals only when the story needs them.",
    promptFormula: "{lighting style}, key light from {direction}, {contrast}",
  },
  composition: {
    titleTh: "องค์ประกอบ", titleEn: "Composition",
    descriptionTh: "การจัดตำแหน่ง เส้น และพื้นที่ว่างช่วยกำหนดลำดับการมองและความสัมพันธ์ภายในเฟรม",
    descriptionEn: "Placement, lines, and negative space determine visual priority and relationships in frame.",
    tipTh: "ตัดสิ่งที่ไม่ช่วยเล่าเรื่องออกจากขอบเฟรมก่อนเพิ่มองค์ประกอบใหม่เสมอ",
    tipEn: "Remove distractions at the frame edge before adding another compositional device.",
    promptFormula: "{composition}, {subject placement}, {foreground/background relationship}",
  },
  lens: {
    titleTh: "เลนส์", titleEn: "Lens Language",
    descriptionTh: "ทางยาวโฟกัสและระยะกล้องเปลี่ยนสัดส่วน ระยะห่าง และความรู้สึกใกล้ชิดของภาพ",
    descriptionEn: "Focal length and camera distance change proportion, space, and perceived intimacy.",
    tipTh: "เลือกตำแหน่งกล้องจาก Perspective ที่ต้องการก่อน แล้วจึงเลือกเลนส์ให้ได้ขนาดเฟรม",
    tipEn: "Choose camera position for perspective first, then select focal length for framing.",
    promptFormula: "shot on {focal length}, {depth of field}, {lens character}",
  },
  "camera-settings": {
    titleTh: "ค่ากล้อง", titleEn: "Camera Settings",
    descriptionTh: "Shutter รูรับแสง ISO และเฟรมเรตควบคุม Motion Blur ระยะชัด และพื้นผิวของภาพ",
    descriptionEn: "Shutter, aperture, ISO, and frame rate control motion blur, depth, and image texture.",
    tipTh: "ล็อกเฟรมเรตและ Shutter ก่อน แล้วคุม Exposure ด้วยรูรับแสง แสง และ ND",
    tipEn: "Lock frame rate and shutter first, then control exposure with aperture, lighting, and ND.",
    promptFormula: "{frame rate}, {shutter character}, {aperture}, {image texture}",
  },
};
