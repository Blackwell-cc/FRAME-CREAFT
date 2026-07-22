# สเปกออกแบบ FRAME / CRAFT Hybrid Prompt Composer

วันที่: 22 กรกฎาคม 2026
สถานะ: ผู้ใช้อนุมัติแนวคิดและพฤติกรรมหลักแล้ว

## 1. เป้าหมาย

ปรับ Prompt Lab ให้สร้าง Prompt ที่ครบถ้วน ใช้งานต่อได้จริง และอธิบายข้อมูลทุกช่องอย่างมีบริบท โดยแก้ปัญหาปัจจุบันดังนี้:

- การ์ดหมวดเดียวกันปรากฏใน Selected หลายใบ แต่ค่าภายในถูกใบล่าสุดเขียนทับ
- Generated Prompt มีข้อความ Default ตายตัวและไม่สามารถลบจนว่างได้
- การนำข้อความจากช่องและการ์ดมาต่อกันยังไม่วิเคราะห์ความสัมพันธ์
- Duration ที่กรอกเป็นตัวเลขออกมาเป็นตัวเลขลอย ๆ โดยไม่มีหน่วยหรือชื่อกำกับ
- Video Mode ยังไม่มีโครงสร้าง Shot Sequence และคำเชื่อมที่เหมาะสม
- ผู้ใช้ยังเลือกภาษาผลลัพธ์ไม่ได้
- ยังไม่มี AI ช่วยตรวจความสมเหตุสมผลหรือปรับ Prompt

ระบบใหม่ต้องให้ Composer หลักทำงานฟรีในเบราว์เซอร์เสมอ และเพิ่ม AI Optimizer เป็นความสามารถเสริมเฉพาะ Owner

## 2. ขอบเขต

### อยู่ในขอบเขต

- กฎการเลือกการ์ดแยกตาม Image และ Video
- Structured Prompt Composer ภาษาไทยและอังกฤษ
- Video Shot Sequencer
- สถานะ Auto, Manual, Stale และ AI Optimized
- Generated Prompt ที่แก้ไขหรือลบจนว่างได้
- คำเตือนก่อนการเปลี่ยนการ์ดเมื่อมี Manual Draft
- Duration แบบตัวเลขและหน่วย seconds
- Completeness Warning สำหรับข้อมูลที่ยังขาด
- AI Prompt Optimizer ผ่าน Supabase Edge Function
- Owner-only authorization, secret management และ failure fallback
- บันทึก Draft, AI Result และสถานะที่เกี่ยวข้องใน Saved Prompt
- Automated Test และ Browser QA ที่เกี่ยวข้อง

### ไม่อยู่ในขอบเขตรอบนี้

- สร้างรูปหรือวิดีโอจาก Prompt ภายใน FRAME / CRAFT
- คิดค่าบริการหรือระบบซื้อเครดิต AI
- ให้ Anonymous ใช้ AI Optimizer
- วิเคราะห์รูปภาพด้วย Vision Model
- ทำ Shot Timeline แบบลากวาง
- รัน Local Model/Ollama จากเว็บไซต์ Public

## 3. สาเหตุของปัญหาปัจจุบัน

### การ์ด Selected กับ PromptInput ไม่ตรงกัน

หน้าเว็บเก็บการ์ดเป็นอาร์เรย์ `selected` แต่ `PromptInput` เก็บค่าหมวดละหนึ่งช่อง เช่น `shotSize: string` เมื่อเลือก Shot Size หลายใบ รายการ Selected จึงมีหลายใบ แต่ `applyTechnique` เขียนทับ `shotSize` ทุกครั้ง ผลลัพธ์เหลือเพียงค่าจากใบล่าสุด

### Generated Prompt ลบจนว่างไม่ได้

Prompt Panel คำนวณข้อความด้วย `outputOverride || generated.prompt` ดังนั้น Empty String ถูกมองว่าไม่มี Override และระบบนำ Generated Prompt เดิมกลับมา

### Default Mood ตายตัว

ค่าเริ่มต้น `mood` มี `deep monochrome color grade, subtle film grain` แม้ผู้ใช้ยังไม่ได้เลือกหรือกรอกข้อมูล จึงทำให้ผลลัพธ์ไม่เคยว่างและดูเหมือนข้อความบังคับ

### ข้อมูลขาด Semantic Label

Composer เดิมนำข้อความมาต่อกันเป็นหลัก แม้ Video Duration มีคำว่า `Duration:` แต่ไม่ได้ Normalize ตัวเลขเป็น seconds และยังไม่มีการวิเคราะห์ว่าการ์ดหลายใบเป็น Shot Sequence หรือเป็นค่าที่ขัดแย้งกัน

## 4. กฎการเลือกการ์ด

### Image Mode

เลือกได้สูงสุดหนึ่งการ์ดต่อหมวดสำหรับ:

- ระยะภาพ
- มุมกล้อง
- การเคลื่อนกล้อง
- เลนส์
- ค่ากล้อง

เลือกได้หลายการ์ดสำหรับ:

- แสง
- องค์ประกอบ

เมื่อกดการ์ดเกินข้อจำกัด:

1. ระบบไม่เพิ่มการ์ด
2. แจ้งชื่อหมวดและรายการที่ถูกเลือกอยู่
3. อธิบายว่าภาพนิ่งหนึ่งภาพไม่ควรมีค่าหลักหลายค่าที่ขัดแย้งกัน
4. แนะนำให้นำการ์ดเดิมออกก่อนเลือกใบใหม่
5. ไม่แทนรายการเดิมอัตโนมัติ

### Video Mode

- เลือกหลายการ์ดได้ทุกหมวด
- รักษาลำดับตามเวลาที่กด Add
- การ์ดระยะภาพเริ่มช็อตใหม่
- การ์ดมุมกล้อง เลนส์ การเคลื่อนกล้อง แสง องค์ประกอบ และค่ากล้องที่ตามหลังจะถูกผูกกับช็อตปัจจุบัน
- เมื่อพบการ์ดระยะภาพใบถัดไป ระบบปิดช็อตเดิมและเริ่มช็อตใหม่
- หากยังไม่มีระยะภาพ การ์ดชุดแรกจะอยู่ใน Implicit Opening Shot และ Composer จะแจ้งว่าควรเลือกระยะภาพ

ตัวอย่างลำดับ:

`Wide Shot → Eye-Level → 35mm → Dolly In → Close-Up → Low Angle → 85mm`

ตีความเป็น:

- Shot 1: Wide Shot, Eye-Level, 35mm, Dolly In
- Shot 2: Close-Up, Low Angle, 85mm

## 5. Structured Prompt Composer

Composer ต้องทำงานในเบราว์เซอร์ ไม่เรียก API และเป็นผลลัพธ์สำรองที่พร้อมใช้เสมอ

### ข้อมูลนำเข้า

- Mode: Image หรือ Video
- Platform preset
- Output language: Thai หรือ English
- Subject
- Action
- Environment
- Selected cards ตามลำดับ
- Aspect ratio
- Duration
- Pacing

### Image Prompt

ลำดับเนื้อหา:

1. คำสั่งสร้างภาพและระยะภาพ
2. ตัวแบบ การกระทำ และสถานที่
3. มุมกล้อง
4. เลนส์
5. การเคลื่อนกล้องในฐานะ Visual Motion Cue ถ้ามี
6. แสงหลายรายการโดยใช้คำเชื่อมที่ไม่ขัดแย้ง
7. องค์ประกอบหลายรายการ
8. ค่ากล้อง
9. Platform directive และ Aspect ratio

ตัวอย่างภาษาอังกฤษ:

> Create a cinematic close-up of a Thai film director reviewing a monitor in a professional production studio, viewed from an eye-level angle and captured with an 85mm portrait lens. Use soft key lighting with subtle rim separation. Compose the subject centrally with controlled negative space. Camera settings: shallow depth of field and natural skin texture.

### Video Prompt

ลำดับเนื้อหา:

1. Duration พร้อมหน่วย
2. ตัวแบบ การกระทำ และสถานที่หลัก
3. Shot Sequence ตามลำดับ
4. Transition และ Camera Movement
5. Continuity directive
6. Pacing
7. Platform directive และ Aspect ratio

ตัวอย่างภาษาอังกฤษ:

> Create an 8-second cinematic video of a Thai film director reviewing a monitor in a professional production studio. Begin with a wide establishing shot at eye level using a 35mm lens. Then transition into a medium shot as the camera slowly dollies forward. Finally cut to a close-up with an 85mm lens to emphasize the director’s reaction. Maintain consistent subject identity, studio lighting, screen direction, and natural motion throughout. Pacing: slow and controlled.

### คำเชื่อม Video

Sequencer เลือกคำเชื่อมตามตำแหน่งและลักษณะการเปลี่ยนภาพ:

- เปิดลำดับ: `Begin with`, `Open on`, `Start with`
- ต่อเนื่อง: `then transition into`, `as the camera moves`, `followed by`
- การตัดชัดเจน: `then cut to`, `shift to`
- ปิดลำดับ: `finally cut to`, `end on`, `conclude with`

ภาษาไทยต้องใช้คำเชื่อมความหมายเดียวกันและเป็นภาษาธรรมชาติ ไม่แปลแบบคำต่อคำ

### Duration

- UI ใช้ช่องตัวเลขและแสดงหน่วย `seconds`
- รับค่าจำนวนเต็มตั้งแต่ 1–600
- ค่า `8` ต้องออกเป็น `Duration: 8 seconds` หรือรูปประโยคที่ระบุ 8 วินาทีชัดเจน
- ค่าที่ว่างไม่แสดง Duration
- ค่าที่อยู่นอกช่วงแสดง Validation และไม่ส่งเข้า AI

### Completeness และ Conflict Warning

Composer ส่งกลับทั้ง Prompt และ Metadata:

- Missing subject
- Missing action
- Missing environment
- Video sequence ไม่มี Shot Size
- ค่ากล้องที่ขัดกับคำอธิบายการ์ด
- Prompt พร้อมใช้งานหรือควรตรวจเพิ่มเติม

Warning ไม่บล็อกการ Copy ยกเว้นข้อมูลผิดรูปแบบ เช่น Duration นอกช่วง

## 6. สถานะ Generated Prompt

ใช้สถานะที่ชัดเจน:

- `auto` — ผลลัพธ์จาก Composer และตรงกับข้อมูลล่าสุด
- `manual` — ผู้ใช้แก้ข้อความเอง รวมถึงแก้เป็น Empty String
- `stale` — ผู้ใช้แก้เองแล้วข้อมูลต้นทางเปลี่ยน
- `ai-preview` — มีผลวิเคราะห์ AI รอการยืนยัน
- `ai-applied` — ผู้ใช้เลือกใช้ผลลัพธ์ AI

ห้ามใช้ Empty String เป็นตัวบอกว่าไม่มี Manual Draft ต้องเก็บสถานะแยกจากค่าข้อความ

### การแก้ข้อความ

- ผู้ใช้แก้หรือลบ Generated Prompt ได้ทันที
- เมื่อลบจนว่าง ระบบไม่เติม Auto Prompt กลับเอง
- มีปุ่ม `คืนค่าผลลัพธ์อัตโนมัติ`

### การเปลี่ยนการ์ดหลังแก้ข้อความ

- การเพิ่มหรือลบการ์ดเมื่อสถานะเป็น Manual, Stale หรือ AI Applied ต้องแสดง Confirmation
- ข้อความต้องระบุว่า Generated Prompt จะถูกสร้างใหม่และ Manual Draft จะถูกแทน
- ยืนยัน: เปลี่ยนการ์ดและสร้าง Prompt ใหม่
- ยกเลิก: ไม่เปลี่ยนการ์ดและเก็บ Manual Draft

### การแก้ช่องข้อมูลหลังแก้ข้อความ

- ไม่แสดง Confirmation ทุกตัวอักษร
- เก็บ Manual Draft เดิม
- เปลี่ยนสถานะเป็น `stale`
- แสดงข้อความ `ข้อมูลมีการเปลี่ยนแปลง`
- ปุ่ม `สร้าง Prompt ใหม่` จะสร้างจากข้อมูลล่าสุดและเปลี่ยนเป็น `auto`
- การเปลี่ยน Platform หรือ Output Language ใช้พฤติกรรมเดียวกับการแก้ช่องข้อมูล: เก็บ Draft เดิมและเปลี่ยนเป็น `stale`
- การเปลี่ยน Image/Video Mode ต้องตรวจ Selection ของโหมดปลายทางก่อน หากมีรายการที่ผิดกฎ ให้แสดงสรุปรายการที่จะถูกนำออกและขอ Confirmation เพียงครั้งเดียว; ยกเลิกแล้วต้องคง Mode, Selection และ Draft เดิมทั้งหมด
- หากยืนยันเปลี่ยน Mode ระบบจึงปรับ Selection ให้ถูกกฎ สร้าง Prompt ใหม่ และเปลี่ยนเป็น `auto`

## 7. ภาษาและ Platform

- เพิ่ม Output Language: `th` และ `en`
- ค่าเริ่มต้นเป็นภาษาอังกฤษเพื่อพร้อมใช้กับเครื่องมือ AI ส่วนใหญ่
- ผู้ใช้เปลี่ยนภาษาได้โดยไม่เปลี่ยนภาษา UI
- Platform preset ยังคง Generic Image, Midjourney, Flux, Generic Video, Runway, Kling และ Veo
- Composer ต้องแยก Platform Directive ออกจากเนื้อหาหลัก เพื่อแก้หรือเพิ่มแพลตฟอร์มภายหลังได้

## 8. AI Prompt Optimizer

### หลักการ

- AI เป็นความสามารถเสริม ไม่ใช่ Dependency ของ Composer
- เรียก AI เฉพาะเมื่อผู้ใช้กด `วิเคราะห์ด้วย AI`
- เปิดใช้เฉพาะ Owner
- AI ไม่เขียนทับ Generated Prompt จนกว่าผู้ใช้กด `ใช้ผลลัพธ์นี้`

### Data Flow

1. Browser สร้าง Structured Draft ด้วย Composer
2. Browser ส่ง Structured Draft, Input, Selected Cards, Shot Breakdown, Platform และ Output Language ไป Supabase Edge Function `analyze-prompt`
3. Edge Function ตรวจ JWT และ `is_framecraft_owner()`
4. Edge Function อ่าน `GEMINI_API_KEY` และ `GEMINI_MODEL` จาก Supabase Secrets
5. Edge Function เรียก Gemini API
6. Gemini ตอบ JSON ตาม Schema
7. Edge Function Validate และส่งข้อมูลที่ปลอดภัยกลับ Browser
8. Browser แสดง AI Preview
9. ผู้ใช้กดใช้หรือยกเลิก

### Request ที่อนุญาต

- PromptInput
- ชื่อและรายละเอียดที่จำเป็นของการ์ด
- Shot Breakdown
- Structured Draft
- Platform
- Output Language

ไม่ส่ง:

- รูปภาพ
- Database password หรือ Secret
- Access/Refresh token ใน Body
- Prompt อื่นในฐานข้อมูล
- ข้อมูล Owner ที่ไม่เกี่ยวข้อง

### AI Response Schema

- `optimizedPrompt: string`
- `shotBreakdown: Array<{ index, description, transition }>` สำหรับ Video
- `improvements: string[]`
- `warnings: string[]`
- `language: "th" | "en"`
- `model: string`

Edge Function ต้องปฏิเสธผลลัพธ์ที่ไม่ตรง Schema และไม่ส่งข้อความดิบที่ไม่ผ่าน Validation ไปหน้าเว็บ

### ความปลอดภัย

- `GEMINI_API_KEY` อยู่ใน Supabase Secret เท่านั้น
- Anonymous และ Viewer เรียก Function ไม่ได้
- Owner JWT ต้องผ่านการตรวจทุก Request
- จำกัดขนาด Request และ Output
- ใช้ Timeout และข้อความ Error ที่ไม่เปิดเผย Secret
- ไม่บันทึก Subject, Action, Environment หรือ Prompt ลง Log

### ค่าใช้จ่ายและ Privacy

- Composer หลักไม่มีค่า API
- Supabase Free Plan มี Edge Function Invocation ตามโควตาปัจจุบัน
- Gemini Free Tier ใช้ได้กับบางโมเดลและ Rate Limit เปลี่ยนได้
- Free Tier อาจใช้ข้อมูลเพื่อปรับปรุงผลิตภัณฑ์ จึงต้องแสดง Privacy Notice และไม่ควรใส่ข้อมูลลูกค้าที่เป็นความลับ
- หากไม่มี API Key, Free Tier ใช้ไม่ได้, โควตาหมด หรือ AI Error ระบบต้องเก็บ Structured Draft เดิม
- ไม่เปิด Billing หรือเปลี่ยน Paid Tier อัตโนมัติ

## 9. UI

### Prompt Panel

เพิ่ม:

- Output Language selector
- Duration number input พร้อม suffix seconds
- Prompt state badge
- Completeness/Conflict messages
- ปุ่ม `สร้าง Prompt ใหม่`
- ปุ่ม `คืนค่าผลลัพธ์อัตโนมัติ`
- ปุ่ม `วิเคราะห์ด้วย AI` เฉพาะ Owner
- AI loading state
- AI Preview dialog
- Shot Breakdown สำหรับ Video

### Selection Warning

ใช้ Dialog หรือ Inline Alert ที่อ่านง่าย ระบุ:

- หมวดที่ถูกจำกัด
- การ์ดที่เลือกอยู่
- การ์ดที่ผู้ใช้พยายามเพิ่ม
- เหตุผลที่ระบบไม่อนุญาต
- วิธีแก้: นำใบเดิมออกก่อน

### Manual Draft Confirmation

ต้องมีข้อความชัดเจนว่าการเปลี่ยนการ์ดจะสร้าง Prompt ใหม่และแทนข้อความที่แก้เอง พร้อมปุ่ม `สร้างใหม่และเปลี่ยนการ์ด` กับ `ยกเลิก`

## 10. การบันทึกและ Cloud Sync

Saved Prompt ต้องเก็บ:

- `schemaVersion` สำหรับแปลงข้อมูลเก่าอย่างแน่นอน โดยเวอร์ชันใหม่นี้ใช้ค่า `2`
- Input ล่าสุด
- Selected technique IDs ตามลำดับ
- Structured Draft
- Edited/Applied Prompt
- Output Language
- Prompt state ตอน Save
- AI metadata ที่ไม่รวม Secret เช่น model และเวลาที่ Optimize

การเปลี่ยน Schema ต้องรองรับ Saved Prompt เดิมโดยกำหนดค่าเริ่มต้น:

- Record ที่ไม่มี `schemaVersion` ให้ถือเป็นเวอร์ชัน `1` และแปลงเป็นเวอร์ชัน `2` ตอนอ่าน โดยไม่เขียนทับต้นฉบับจนกว่าผู้ใช้จะ Save
- ไม่มี Selected IDs ให้ใช้ข้อมูลใน PromptInput เดิม
- Output Language เดิมให้เป็น English
- Prompt state เดิมให้เป็น Manual หาก `editedPrompt` ต่างจาก `generatedPrompt` มิฉะนั้น Auto

ข้อมูลยังบันทึก Local-first และเข้าคิว Cloud เหมือนเดิม

## 11. Error Handling

- Selection เกินกฎ: บล็อกเฉพาะ Action นั้นและอธิบายเหตุผล
- Duration ผิด: แสดง Validation ใกล้ช่องและไม่ส่ง AI
- AI Unauthorized: แจ้งว่าเฉพาะ Owner
- ไม่มี API Key: แจ้งว่ายังไม่ได้เปิด AI Optimizer
- AI Rate Limit: แจ้งว่าโควตาชั่วคราวหมดและให้ใช้ Structured Draft
- AI Timeout/Network: ไม่ลบหรือเปลี่ยน Prompt เดิม
- AI Schema Invalid: ปฏิเสธ Response และแสดง Error แบบปลอดภัย
- Prompt ว่างจาก Manual Edit: ถือเป็นค่าที่ถูกต้อง ไม่ Auto Restore

## 12. Testing Strategy

### Unit Test

- Selection Rules ครบทุกหมวดใน Image Mode
- Image ยอมรับ Lighting และ Composition หลายใบ
- Video รักษาลำดับการ์ด
- Shot Sequencer แบ่งช็อตจาก Shot Size
- Transition ภาษาไทยและอังกฤษ
- Duration 8 เป็น 8 seconds
- Duration validation 1–600
- Missing field warnings
- Empty Manual Draft ไม่ถูก Auto Restore
- Prompt state transitions
- Language output
- Platform directives
- AI response schema validation

### Component/Integration Test

- Warning เมื่อเพิ่ม Image card เกินกฎ
- Confirm ก่อนเปลี่ยนการ์ดหลัง Manual Edit
- Cancel แล้ว Selection และ Prompt เดิมไม่เปลี่ยน
- Field change หลัง Manual Edit เป็น Stale โดยไม่เปิด Dialog ทุกตัวอักษร
- Regenerate กลับเป็น Auto
- AI Preview ไม่เขียนทับก่อน Apply
- AI Error รักษา Prompt เดิม
- Owner เห็น AI button
- Anonymous/Viewer ไม่เห็นหรือเรียก AI ไม่ได้
- Saved Prompt round-trip พร้อมข้อมูลใหม่และ Legacy fallback

### Edge Function/Security Test

- Anonymous ถูกปฏิเสธ
- Viewer ถูกปฏิเสธ
- Owner Request ถูก Validate
- ไม่มี API Key ใน Browser bundle, Git หรือ Log
- Timeout, Rate Limit และ Invalid JSON ถูกจัดการ

### Regression และ Browser QA

- Library, Search, Copy, Add, Modal และ Chapter Navigation
- Close-Up image จาก Supabase
- Backup และ Import
- Migration และ Sync Queue
- Desktop และ Mobile
- Dropdown contrast และปุ่ม hover/click feedback

## 13. เกณฑ์สำเร็จ

- Image Mode ไม่ยอมให้ค่าหลักขัดแย้งกัน
- Video Mode สร้าง Shot Sequence ตามลำดับที่เลือก
- Subject, Action และ Environment ปรากฏอย่างมีความหมาย
- ทุกค่ามี Label/Unit ที่นำไปใช้ต่อได้
- Generated Prompt แก้หรือลบจนว่างได้
- Manual Draft ไม่สูญหายโดยไม่มี Confirmation
- ภาษาไทยและอังกฤษใช้งานได้
- Composer ใช้ได้ฟรีแม้ AI ไม่พร้อม
- AI ช่วยปรับ Prompt โดยไม่เปิดเผย Secret และไม่เขียนทับอัตโนมัติ
- Cloud/Offline/Backup เดิมไม่เสียหาย
- Automated Test, Security Test, Build และ Browser QA ผ่านก่อน Deploy

## 14. เอกสารอ้างอิง

- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase Edge Function Pricing: https://supabase.com/docs/guides/functions/pricing
- Supabase Edge Function Limits: https://supabase.com/docs/guides/functions/limits
- Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API Billing: https://ai.google.dev/gemini-api/docs/billing
