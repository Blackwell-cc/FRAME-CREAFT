# FRAME / CRAFT

เว็บไซต์ Production Reference ส่วนตัวสำหรับเก็บมุมกล้อง ขนาดภาพ การเคลื่อนกล้อง แสง องค์ประกอบ เลนส์ และ Camera Settings พร้อมประกอบ Prompt สำหรับ AI Image/Video แบบกำหนดผลลัพธ์ได้

## ฟังก์ชันหลัก

- เทคนิคพร้อมใช้ 60 รายการ แบ่งเป็น 7 หมวด พร้อมค้นหาไทย/อังกฤษ
- Prompt Builder สำหรับ Generic Image, Midjourney, Flux, Generic Video, Runway, Kling และ Veo
- Favorite, Saved Prompt และระบบจัดการเทคนิคส่วนตัว
- เพิ่ม/แก้ไข/ทำสำเนา/ซ่อน/คืนค่า/ลบ พร้อมรูปอ้างอิงและ Video Reference URL
- เก็บข้อมูลใน IndexedDB ของเบราว์เซอร์ ไม่ต้องสมัครสมาชิก
- Export/Import ZIP รวมข้อมูล การตั้งค่า และรูปอ้างอิง รองรับ Merge/Replace
- UI ภาษาไทย/อังกฤษ และ responsive สำหรับ desktop/mobile

## เริ่มใช้งานในเครื่อง

ต้องใช้ Node.js 22.13 ขึ้นไป

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## ตรวจสอบคุณภาพ

```bash
npm run test:unit
npx tsc --noEmit
npm run lint
npm test
```

ข้อมูลของผู้ใช้จะอยู่เฉพาะในเบราว์เซอร์ จึงควร Export Backup ก่อนล้างข้อมูลเว็บไซต์หรือย้ายเครื่อง โครง repository แยกจาก UI ไว้แล้วเพื่อรองรับ Supabase ในเวอร์ชันถัดไป
