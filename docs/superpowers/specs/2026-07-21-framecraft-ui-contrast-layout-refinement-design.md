# FRAME / CRAFT UI Contrast & Layout Refinement

## เป้าหมาย

แก้ปัญหาความอ่านง่ายและ interaction จำนวน 5 จุด โดยรักษาเอกลักษณ์ Optical Monochrome ของเว็บไซต์ และไม่เปลี่ยนโครงสร้างข้อมูลหรือความสามารถของ Prompt Builder

## ขอบเขต

### 1. Toolbar และข้อความสรุป

- แยก Search Toolbar และ Library Summary เป็นคนละแถวอย่างชัดเจน
- เพิ่มช่องว่างแนวตั้งเพื่อไม่ให้กรอบ Search หรือปุ่ม Add บังข้อความสรุป
- ต้องไม่ซ้อนกันทั้ง Desktop, Tablet และ Mobile
- Chapter Navigation ยังคงวางต่อจาก Summary และทำงานแบบ Sticky เหมือนเดิม

### 2. Dropdown Contrast ทั่วเว็บไซต์

- ช่อง `select` ใช้พื้น Charcoal และข้อความ Off-white
- รายการ `option` ใช้พื้น Charcoal/Dark Gray และข้อความ Off-white
- กำหนด `color-scheme: dark` เพื่อให้ native dropdown ของระบบปฏิบัติการเลือกชุดสีที่อ่านได้
- ใช้กฎเดียวกันกับ Prompt Panel, Settings, Import Mode และฟอร์มเพิ่ม/แก้ไข Technique

### 3. Hover Contrast ของปุ่มและไอคอน

- ปุ่มพื้นเข้มเมื่อ Hover: ตัวอักษรและไอคอนเป็นสีขาว พร้อมยกขึ้นเล็กน้อยและมี Optical Glow
- ปุ่มพื้นขาวเมื่อ Hover: ตัวอักษรและไอคอนเป็นสีดำ พร้อม Glow สีขาว
- ไอคอน SVG ใช้ `currentColor` จึงต้องเปลี่ยนตาม foreground ของปุ่ม
- ปุ่มที่ Active ใน Rail และ Mode Toggle ต้องยังเห็นไอคอนชัดเมื่อ Hover
- Reduced Motion ต้องปิดการเคลื่อนไหว แต่ยังคง contrast ที่อ่านได้

### 4. ฟอนต์หัวข้อภาษาไทย

- หัวข้อภาษาไทยใน Utility View, Settings, Dialog และหัวข้อรองใช้ Prompt
- หัวข้อ Display ภาษาอังกฤษ เช่น `DIRECT THE FRAME` และ `SHOT SIZES` ยังคงใช้ฟอนต์ Display เดิม
- แก้ CSS shorthand ที่กำหนด `font-family: var(--display)` ให้หัวข้อไทยโดยไม่ตั้งใจ
- ช่องกรอก ปุ่ม Label และข้อความทั่วไปยังใช้ Prompt ตามระบบเดิม

### 5. Home Camera Mark

- เปลี่ยน `FC` ซ้ายบนเป็นไอคอนกล้องวิดีโอเส้นบางจากชุด Lucide เพื่อให้เข้ากับ Rail เดิม
- ใช้พื้น Off-white และไอคอน Pitch Black
- เมื่อกดให้เปลี่ยน View เป็น Library และเลื่อนไปบนสุด
- ใช้ Smooth Scroll ตามปกติ และใช้ Instant Scroll เมื่อผู้ใช้เปิด Reduced Motion
- Accessible name ยังคงสื่อว่าเป็นปุ่มกลับหน้าแรกของ FRAME / CRAFT

## สาเหตุที่พบ

- Summary อยู่ชิดใต้ Toolbar มากเกินไป ขณะที่องค์ประกอบ Toolbar มีความสูงและเงาที่ล้ำพื้นที่แนวตั้ง
- Native dropdown บน Windows เปิดเมนูพื้นสว่าง แต่ `option` สืบทอดข้อความสีสว่างจาก Dark Theme
- กฎ Hover กลางกำหนด foreground เป็นสีขาวกับทุกปุ่ม แม้ปุ่มนั้นมีพื้นสีขาว
- หัวข้อไทยบางส่วนใช้ `font` shorthand ที่ล็อกไปยัง Display face
- Rail Mark เดิมเปลี่ยน View อย่างเดียวและไม่มีคำสั่ง Scroll to Top

## โครงสร้างการแก้ไข

- `FrameCraftApp.tsx`: เพิ่ม Home handler และ Camera icon
- `framecraft.css`: เพิ่ม layout, select/option contrast, inverse hover contract และ Thai heading typography
- Tests: เพิ่ม regression tests สำหรับ Home behavior และ design-contract assertions

ไม่สร้าง Custom Dropdown เพราะ native control เพียงพอและให้ keyboard/accessibility ที่เสถียรกว่า

## เกณฑ์ยอมรับ

1. Library Summary ไม่ถูก Toolbar บังที่ Desktop และ Mobile
2. ทุก Dropdown อ่านตัวเลือกได้ชัดทั้งสถานะปิดและเปิด
3. ไอคอนบนปุ่มพื้นขาวยังเป็นสีดำเมื่อ Hover
4. หัวข้อไทยที่ระบุคำนวณได้เป็น Prompt ขณะที่ English Display Heading ไม่เปลี่ยน
5. ปุ่มกล้องกลับ Library และพาหน้าไป `scrollY = 0`
6. Unit tests, TypeScript, ESLint, production build และ rendered HTML tests ผ่าน
7. ตรวจด้วยเบราว์เซอร์บน Production จริงหลังเผยแพร่

## การเผยแพร่

บันทึกเป็นเวอร์ชัน Sites ใหม่และเผยแพร่ไปยัง Public URL เดิม หลังผ่านการตรวจทั้งหมด โดยไม่เปลี่ยน URL หรือสิทธิ์การเข้าถึง
