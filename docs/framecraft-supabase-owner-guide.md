# คู่มือเจ้าของ FRAME / CRAFT — Supabase Cloud

คู่มือนี้ใช้สำหรับดูแลเว็บไซต์ FRAME / CRAFT หลังย้ายข้อมูลขึ้น Supabase โดยออกแบบให้ทำตามได้ทีละขั้น และไม่ต้องส่งรหัสผ่านหรือ Secret ให้ผู้อื่น

## 1. ภาพรวมว่าข้อมูลอยู่ที่ไหน

- `techniques` — เทคนิค Production ที่เผยแพร่ให้ผู้ชมทั่วไปอ่านได้
- `media` — ข้อมูลกำกับรูปภาพ เช่น เทคนิคเจ้าของภาพ ขนาด และตำแหน่งไฟล์
- `saved_prompts` — Prompt ส่วนตัวของ Owner
- `favorites` — รายการโปรดส่วนตัวของ Owner
- `user_settings` — ภาษา โหมด และแพลตฟอร์มเริ่มต้นของ Owner
- `owner_profiles` — รายชื่อ User ID ที่มีสิทธิ์จัดการคลัง
- `sync_receipts` — หลักฐานว่ารายการในคิวเคยถูกประมวลผลแล้ว ป้องกันการเขียนซ้ำ
- Storage bucket `technique-images` — ไฟล์รูปอ้างอิง
- IndexedDB ในเบราว์เซอร์ — Cache, ข้อมูลออฟไลน์, คิว Sync, Conflict และข้อมูลเดิมสำหรับย้อนกลับ

ข้อมูลสาธารณะอ่านได้โดยไม่ต้องล็อกอิน แต่การเพิ่ม แก้ไข ลบ และอัปโหลดถูกควบคุมด้วย RLS ให้เฉพาะ User ID ใน `owner_profiles`

## 2. สิ่งที่ห้ามส่งให้ผู้อื่น

ห้ามส่งหรือใส่ค่าเหล่านี้ใน Git, Screenshot, แชต หรือโค้ดหน้าเว็บ:

- Database password
- `service_role` key หรือ Secret key
- Google OAuth Client Secret
- Access token, Refresh token, OTP และลิงก์ Reset Password
- ไฟล์ `.env.local`

ค่าที่ใช้ในหน้าเว็บได้มีเพียง:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ที่ขึ้นต้นด้วย `sb_publishable_`

Publishable key ยังต้องทำงานร่วมกับ RLS เสมอ ไม่ใช่กุญแจสำหรับข้ามสิทธิ์

## 3. ตรวจสถานะโปรเจกต์

1. เข้า Supabase Dashboard
2. เลือกองค์กร `Blackwell`
3. เลือกโปรเจกต์ `Website Camera Guide Project`
4. หน้า Project Overview ต้องแสดง `Healthy`
5. หากเป็น Free Plan และถูก Pause ให้กด `Resume project`
6. รอจนสถานะกลับเป็น `Healthy` ก่อนเปิดเว็บไซต์หรือย้ายข้อมูล

Free Plan อาจ Pause เมื่อมีกิจกรรมน้อยเป็นเวลาประมาณ 7 วัน แต่เจ้าของสามารถ Resume โปรเจกต์เดิมได้จาก Dashboard ภายในช่วงเวลาที่ Supabase กำหนด ข้อมูลไม่ได้ย้ายกลับมาเก็บใน GPT หรือ Codex

## 4. ตรวจข้อมูลใน Table Editor

ไปที่ `Database > Table Editor` แล้วตรวจตารางต่อไปนี้:

1. `owner_profiles` ต้องมี User ID ของ Owner เพียงคนที่อนุมัติ
2. `techniques` หลัง Migration ควรมี 60 รายการ
3. `media` ควรมีจำนวนเท่ากับรูปที่ย้ายขึ้น Cloud
4. `saved_prompts`, `favorites`, `user_settings` เป็นข้อมูลส่วนตัวและอาจยังว่างก่อนใช้งาน
5. `sync_receipts` จะเพิ่มขึ้นเมื่อระบบ Sync สำเร็จ

ห้ามแก้ `id`, `version`, `user_id`, `storage_path` หรือ `deleted_at` ด้วยมือ หากยังไม่เข้าใจผลกระทบ

## 5. ตรวจรูปใน Storage

1. ไปที่ `Storage`
2. เปิด bucket `technique-images`
3. โครงสร้างไฟล์ควรเป็น `{OWNER_USER_ID}/{TECHNIQUE_ID}/{MEDIA_ID}.webp`
4. ผู้ชมเปิด URL รูปได้ เพราะเป็นรูปประกอบคลังสาธารณะ
5. การ Upload, Replace และ Delete ยังต้องผ่าน RLS และสิทธิ์ Owner
6. รูปรองรับ JPG, PNG, WebP และต้องไม่เกิน 10 MB

อย่าเปลี่ยนชื่อโฟลเดอร์หรือย้ายไฟล์ด้วยมือ เพราะ `media.storage_path` ต้องตรงกับตำแหน่งใน Storage

## 6. เข้าสู่ระบบ Owner

1. เปิดเว็บไซต์ FRAME / CRAFT
2. กดเมนูรูปเฟือง `ตั้งค่าและสำรอง`
3. กรอกอีเมลและรหัสผ่านของ Owner ด้วยตัวเอง
4. กด `เข้าสู่ระบบ`
5. ผลที่ถูกต้อง:
   - แสดงข้อความ `เชื่อมต่อในฐานะเจ้าของ`
   - เมนู `จัดการคลัง` ปรากฏ
   - ปุ่ม `เพิ่มมุมภาพ` ปรากฏ
   - แสดงสถานะ Cloud และจำนวนรายการรอ Sync

ถ้าขึ้น `บัญชีนี้ไม่มีสิทธิ์จัดการ Library` แปลว่าเข้าสู่ระบบสำเร็จ แต่ User ID นั้นไม่ได้อยู่ใน `owner_profiles`

## 7. ลืมรหัสผ่าน

1. เปิดหน้า `ตั้งค่าและสำรอง`
2. กรอกอีเมล Owner
3. กด `ลืมรหัสผ่าน`
4. เปิดอีเมลจาก Supabase และใช้ลิงก์ครั้งเดียว
5. ห้ามส่งต่อลิงก์ Reset ให้ผู้อื่น

หมายเหตุ: เว็บไซต์มีคำขอส่งอีเมล Reset แล้ว ส่วนหน้าตั้งรหัสผ่านใหม่ต้องทดสอบกับ Redirect URL ของ Production ก่อนใช้งานจริง

## 8. เชื่อม Google กับ Owner เดิม

1. เข้าสู่ระบบด้วยอีเมล/รหัสผ่านของ Owner ก่อน
2. กด `เชื่อม Google`
3. เลือกบัญชี Google ของเจ้าของและอนุญาต
4. ระบบต้อง Redirect กลับมายังเว็บไซต์เดิม
5. ไปที่ `Authentication > Users` และตรวจว่าเป็น User ID เดิม ไม่ใช่ User ใหม่

อย่าลบบัญชีอีเมลเดิมก่อนตรวจว่า Google Identity เชื่อมกับ User ID เดิมแล้ว

## 9. Backup ก่อน Migration

1. เข้าสู่ระบบ Owner
2. ไปที่ `ตั้งค่าและสำรอง`
3. ในส่วน `ย้ายข้อมูลขึ้น Cloud` ตรวจจำนวนเทคนิค รูป Prompt และการตั้งค่า
4. กด `ดาวน์โหลด Backup และเริ่มย้ายข้อมูล`
5. เบราว์เซอร์ต้องดาวน์โหลดไฟล์ `framecraft-before-cloud-YYYY-MM-DD.zip`
6. เปิด ZIP และตรวจว่ามี `manifest.json`, `techniques.json`, `prompts.json`, `settings.json`, `media.json`
7. เก็บไฟล์ไว้ในพื้นที่ส่วนตัวอย่างน้อย 1 ชุด

ระบบจะไม่ลบ IndexedDB หลัง Migration เพื่อให้ย้อนกลับได้

## 10. Migration และการตรวจผล

1. หลัง Backup ระบบจะอัปโหลดไฟล์รูป
2. สร้างข้อมูลเทคนิคก่อนข้อมูล media เพื่อไม่ติด Foreign Key
3. อัปโหลด Prompt และการตั้งค่าส่วนตัว
4. อ่านข้อมูลกลับจาก Cloud
5. เปรียบเทียบจำนวนและ ID แบบตรงกันทุกตัว
6. จะแสดง `ย้ายข้อมูลสำเร็จ` ต่อเมื่ออ่านกลับตรงทั้งหมด

ถ้าขึ้น `ตรวจข้อมูล Cloud ไม่ตรง กรุณาลองใหม่`:

1. อย่าล้างข้อมูลเว็บ
2. อย่าลบ IndexedDB
3. ตรวจสถานะ Supabase ว่า Healthy
4. ตรวจ Table Editor และ Storage
5. กด `ลองใหม่` ได้ เพราะ Migration ใช้ ID เดิมและออกแบบให้รันซ้ำได้

## 11. Sync และ Offline

- `Cloud Connected` — เชื่อมต่อแล้ว ไม่มีข้อผิดพลาดที่ต้องแจ้ง
- `Syncing` — กำลังส่งคิวขึ้น Cloud
- `Offline — waiting to sync` — ไม่มีอินเทอร์เน็ต ข้อมูลใหม่ยังอยู่ใน IndexedDB
- `Needs review` — Cloud มีเวอร์ชันใหม่กว่าที่เครื่องนี้รู้จัก ระบบไม่เขียนทับเงียบ ๆ

เมื่อกลับมาออนไลน์ ระบบจะเริ่มส่งคิวตามลำดับเดิม ควรรอจน `รอซิงก์ 0 รายการ` ก่อนปิดแท็บหลังแก้ไขข้อมูลจำนวนมาก

## 12. ตรวจจากเครื่องที่สอง

1. เปิดเว็บไซต์ใน Browser หรืออุปกรณ์อีกเครื่อง
2. ก่อนล็อกอิน ต้องเห็นเทคนิคและรูปสาธารณะ
3. ต้องไม่เห็น `จัดการคลัง`, `เพิ่มมุมภาพ`, Import, Delete หรือ Upload
4. ล็อกอิน Owner
5. ตรวจ Prompt, Favorites และ Settings ส่วนตัว
6. เพิ่มรายการทดสอบ 1 รายการในเครื่องแรก
7. รอ Sync เป็น 0 แล้วเปิดใหม่ในเครื่องที่สอง
8. ลบรายการทดสอบเมื่อยืนยันเสร็จ

## 13. Import และ Rollback

- `Merge` รวมข้อมูลโดยใช้ ID และเวลาอัปเดต
- `Replace` ดาวน์โหลด Snapshot เดิมก่อน แล้วแทนข้อมูล Local ทั้งหมด
- Import เป็นสิทธิ์ Owner เท่านั้น
- ก่อน Rollback ให้เก็บ Backup ปัจจุบันอีกชุดเสมอ
- หาก Cloud มีปัญหา เว็บไซต์ยังเปิด Cache/Starter Data ได้ แต่ห้ามล้าง Site Data จนกว่าจะกู้คืนเสร็จ

## 14. ตรวจ Usage ของ Free Plan

ไปที่หน้าองค์กรหรือโปรเจกต์ แล้วเปิด `Usage` / `Billing` เพื่อตรวจ:

- Database size
- Storage size
- Egress
- Monthly Active Users
- จำนวนโปรเจกต์ Free ที่กำลัง Active

Free Plan ไม่มี Automatic Backup แบบรายวัน จึงต้องเก็บ Backup ZIP ของ FRAME / CRAFT เอง โดยเฉพาะก่อน Migration, Import แบบ Replace และการแก้ข้อมูลจำนวนมาก

## 15. Checklist ก่อนเผยแพร่เวอร์ชันใหม่

- [ ] Supabase Healthy
- [ ] `.env.local` ไม่อยู่ใน Git
- [ ] ไม่มี Database password, service role หรือ Google Secret ในโค้ด/Build/Log
- [ ] Anonymous อ่านเทคนิคและรูปได้
- [ ] Anonymous เขียนตาราง เรียก RPC และ Upload ไม่ได้
- [ ] Owner Login สำเร็จและ User ID ตรงกับ `owner_profiles`
- [ ] Backup ZIP เปิดได้
- [ ] Migration อ่านกลับตรงทุก ID
- [ ] Close-Up แสดงรูปสะอาดทั้ง Card และ Detail
- [ ] Offline edit กลับมา Sync ได้
- [ ] เครื่องที่สองเห็นข้อมูลตรงกัน
- [ ] Mobile และ Desktop ใช้งานได้
- [ ] ได้รับอนุมัติจากเจ้าของก่อน Deploy Public

## เอกสารอ้างอิงทางการ

- Supabase Project Pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Supabase Storage Access Control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Storage Buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Identity Linking: https://supabase.com/docs/guides/auth/auth-identity-linking
- Supabase Password Reset: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- Supabase Pricing: https://supabase.com/pricing
