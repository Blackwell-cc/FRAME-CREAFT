# FRAME / CRAFT — Optical Monochrome Refinement

วันที่: 2026-07-21  
สถานะ: Approved direction

## เป้าหมาย

ปรับหน้า FRAME / CRAFT ให้ภาษาไทยอ่านง่ายในระดับมาตรฐานเว็บไซต์ เพิ่มการตอบสนองของปุ่ม และทำให้ธีม Monochrome มีมิติแบบแสงผ่านเลนส์มากกว่าขาวดำแบบแบน โดยไม่เพิ่มสีอื่นและไม่ทำให้ UI รบกวนการทำงาน

## Typography

- โหลด `Prompt` ผ่าน `next/font/google` และใช้เป็นฟอนต์หลักของ UI
- Utility/Code ภาษาอังกฤษยังใช้ Geist Mono ได้ แต่ fallback ภาษาไทยต้องกลับมาที่ Prompt เสมอ
- Body และข้อความทั่วไป: 14–16px, line-height 1.65–1.8
- Card description: 13px บน desktop และ 14px บน mobile
- Form input/select/textarea: 14px; placeholder ไม่น้อยกว่า 12px
- Button: 13px; utility label และ metadata: 11–12px
- Heading เดิมยังรักษาบุคลิก condensed cinematic แต่ข้อความไทยใน heading ใช้ Prompt

## Optical Monochrome Theme

Palette ใช้สีเอกรงค์เท่านั้น:

- Pitch Black `#030303`
- Deep Charcoal `#0B0B0C`
- Graphite `#232427`
- Silver Gray `#8E9298`
- Soft White `#E8E9E6`
- Pure White `#FFFFFF`

พื้นหลังประกอบจาก radial gradient หลายชั้น, ลำแสงเฉียงโปร่งบาง และ vignette รอบขอบจอ แผง Card/Prompt ใช้ gradient จาก charcoal ไป pitch black พร้อม highlight 1px ด้านรับแสง Signature เดิมคือวงแหวนเลนส์ และเพิ่ม optical sheen ที่สัมพันธ์กับมุมแสงเดียวกันทั้งระบบ

## Button Interaction

ปุ่มทุกชนิดมี state ที่สม่ำเสมอ:

- Default: ขอบ graphite และพื้น gradient ตามระดับความสำคัญ
- Hover: เลื่อนขึ้น 1–2px, ขอบสว่างขึ้น, เกิด rim-light และ reflective sweep สั้น
- Active: ลด scale เล็กน้อยและลดแสงเพื่อให้รู้สึกว่าปุ่มถูกกด
- Focus-visible: เส้น Pure White ชัดเจนสำหรับ keyboard
- Disabled: ไม่มี motion และลด contrast
- `prefers-reduced-motion` ปิด sweep/transform แต่ยังคงการเปลี่ยนขอบและ contrast

## Copy Feedback

สร้าง Copy control ที่ใช้ร่วมกันใน Technique Card และ Prompt Lab:

1. กด Copy แล้วเขียนข้อความลง clipboard
2. เปลี่ยนไอคอนจาก Copy เป็น Check
3. เปลี่ยน label เป็น `Copied` หรือ `คัดลอกแล้ว` ตามบริบท
4. เพิ่ม class `is-copied` เพื่อแสดง pulse สีขาวประมาณ 1.5 วินาที
5. หาก clipboard ใช้งานไม่ได้ ให้แสดงข้อความแจ้งที่เข้าใจได้และไม่แสดงสถานะสำเร็จ

## จุดที่ต้องปรับ

- Card description และชื่อภาษาไทย
- Prompt Lab labels, inputs, select, textarea, selected stack และ privacy note
- Copy/Add/Save/Reset/หมวดหมู่/เมนู/Modal/Settings/Manage buttons
- Search field, custom technique form และรายละเอียดใน dialog
- Hero/body background, panels, cards, borders และ focus states

## Component Boundary

- เพิ่ม `CopyButton` สำหรับสถานะ copy/copy success/error
- Theme และ scale อยู่ใน CSS tokens เพื่อลดค่าขนาดที่กระจายหลายจุด
- ไม่เปลี่ยน schema, IndexedDB, Prompt composer หรือ Backup format

## Testing และเกณฑ์ยอมรับ

- Test กด Copy แล้วแสดง `Copied` พร้อม Check และกลับสู่ค่าเดิม
- Test clipboard error ไม่แสดงสถานะสำเร็จ
- ภาษาไทยใน UI ใช้ตัวแปรฟอนต์ Prompt
- Input และ Button มี computed design token ไม่น้อยกว่า 13–14px ตามบทบาท
- Hover/active/focus/reduced-motion มี CSS state ครบ
- Unit tests, TypeScript, ESLint, production build และ server render ผ่าน
- Desktop และ mobile ไม่เกิดข้อความล้นหรือปุ่มตัด

## ไม่รวมในรอบนี้

- เปลี่ยน layout หลักหรือโครง 3 คอลัมน์
- เพิ่มสี accent นอก grayscale
- เปลี่ยนข้อมูล 60 เทคนิคหรือ logic ของ Prompt Builder
- เพิ่ม animation หนัก, WebGL หรือวิดีโอพื้นหลัง
