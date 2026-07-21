# FRAME / CRAFT — Production Reference & Prompt Builder Design

วันที่อนุมัติแนวคิด: 21 กรกฎาคม 2026
สถานะ: Design ได้รับการอนุมัติครบทุกส่วน รอผู้ใช้ตรวจเอกสารฉบับรวม

## 1. ภาพรวมผลิตภัณฑ์

FRAME / CRAFT คือเว็บไซต์ส่วนตัวสำหรับเก็บ ค้นหา และจัดการความรู้ด้าน Production พร้อมระบบประกอบ Prompt สำหรับ AI Image และ AI Video เว็บไซต์ต้องใช้เป็น Reference สำหรับกองถ่ายจริงได้ด้วย ไม่จำกัดเฉพาะงาน AI

ผลิตภัณฑ์ใช้แนวทาง Local-first: ข้อมูลผู้ใช้และรูปภาพเก็บในเบราว์เซอร์ ใช้งานหลักได้โดยไม่ต้องสมัครสมาชิกหรือเชื่อมต่อฐานข้อมูลออนไลน์ และเตรียม Data Layer ให้เพิ่ม Supabase สำหรับ Login และการซิงก์ข้ามอุปกรณ์ในระยะต่อไป

เว็บไซต์ตัวอย่างที่ใช้ศึกษาเป็นเพียง Reference ด้านแนวคิดการจัดหมวดความรู้ เว็บไซต์นี้ต้องใช้โครงสร้างข้อมูล งานออกแบบ และโค้ดของตนเอง

## 2. เป้าหมาย

1. ให้ผู้ใช้ค้นหาเทคนิค Production และนำไปใช้ได้รวดเร็ว
2. มี Starter Library ประมาณ 60 รายการพร้อมใช้งานตั้งแต่เปิดครั้งแรก
3. เพิ่ม แก้ไข Duplicate ซ่อน และจัดการรายการส่วนตัวได้
4. ประกอบ Prompt จาก Shot, Angle, Lens, Movement, Lighting และ Composition ได้แบบ Real-time
5. รองรับทั้ง AI Image และ AI Video พร้อม Platform Preset
6. เก็บข้อมูลและรูปภาพในเครื่อง พร้อม Export/Import ที่กู้คืนได้ครบ
7. ใช้งานบน Desktop, Tablet และ Mobile
8. แยก UI ออกจาก Storage Implementation เพื่อเพิ่ม Supabase Adapter ภายหลัง

## 3. สิ่งที่ไม่รวมในเวอร์ชันแรก

- ระบบสมัครสมาชิกและ Login
- การซิงก์ข้อมูลข้ามอุปกรณ์
- การแชร์ Library กับผู้ใช้อื่น
- Conflict Resolution ระหว่าง Local และ Cloud
- การเรียก AI API เพื่อเขียนหรือปรับ Prompt
- การอัปโหลดไฟล์วิดีโอเข้าเว็บไซต์
- ระบบ Shot List, Storyboard, Budget หรือ Production Scheduling เต็มรูปแบบ
- Native Mobile Application

## 4. Design Direction

### 4.1 Mood & Tone

ใช้แนวทาง **Monochrome Cinematic Console** ให้ความรู้สึกเป็นเครื่องมือ Production มืออาชีพ สงบ เข้ม และมีความเป็นภาพยนตร์

### 4.2 Color System

- Pitch Black: พื้นหลังหลัก
- Near Black และ Charcoal: Panel, Card และการแบ่งระดับข้อมูล
- Dark Gray ถึง Mid Gray: Border, Metadata และข้อความรอง
- Off-white ถึง Pure White: ข้อความสำคัญ Active State และ Primary Action
- ไม่ใช้สี Accent แบบแดง ทอง หรือ Teal ใน Design System หลัก
- สร้างลำดับสายตาด้วยความสว่าง Contrast น้ำหนักตัวอักษร เส้น และพื้นที่ว่าง

### 4.3 Visual Texture

- Film grain บางมากและต้องไม่ลดความชัดของข้อความ
- Gradient ดำ–เทา–ขาวใช้กับภาพ Hero, ภาพตัวอย่างชั่วคราว และ Hover State
- ภาพตัวอย่างคงสีต้นฉบับได้ แต่ UI รอบภาพต้องเป็น Monochrome
- Animation สั้นและมีจุดประสงค์ เช่น Panel slide, Card lift และ Copy confirmation
- รองรับ `prefers-reduced-motion`

### 4.4 Typography

- Display Typeface: ตัวพิมพ์หนา ทรง Condensed สำหรับ Hero และ Section Title
- UI Typeface: Sans-serif ที่อ่านภาษาไทยและอังกฤษชัดเจน
- Metadata และ Technical Value: Monospace
- ค่าเริ่มต้นของ UI เป็นภาษาไทย ชื่อเทคนิคคงศัพท์อังกฤษ และ Prompt เป็นภาษาอังกฤษ
- มีตัวสลับ UI และคำอธิบายระหว่างไทยกับอังกฤษ

## 5. Information Architecture

### 5.1 Desktop Layout

หน้า Desktop แบ่งเป็น 3 พื้นที่:

1. **Navigation Rail ด้านซ้าย** — เมนูหลักและสถานะหน้าปัจจุบัน
2. **Main Content ตรงกลาง** — Search, Filters, Library Grid และเนื้อหาหลัก
3. **Prompt Panel ด้านขวา** — Selected Stack, Platform Preset, Live Preview และ Action

### 5.2 Main Screens

#### Library

- แสดง Starter และ Custom Techniques ใน Grid
- Search จากชื่อ คำอธิบาย Tag Mood Prompt Keyword และคำย่อ
- Filter ตาม Category, Mood, Source Type และ Favorite
- Sort ตามชื่อ หมวด วันที่แก้ไข และรายการที่ใช้ล่าสุด
- เพิ่มรายการเข้าสู่ Prompt Builder จากการ์ดได้ทันที

#### Technique Detail

- แสดงภาพตัวอย่าง ข้อมูลภาษาไทย/อังกฤษ และ Metadata
- แสดง Production Use, Recommended Lens/Settings และข้อควรระวัง
- แสดง Image Prompt และ Video Prompt
- เปิด Video Reference URL ในแท็บใหม่
- Favorite, Duplicate, Edit, Hide และ Add to Prompt

#### Prompt Lab

- มีพื้นที่กรอก Subject, Action และ Environment
- เลือกองค์ประกอบจาก Library หรือ Dropdown
- สลับ Image/Video และ Platform Preset
- แสดง Prompt Preview และแก้ไขข้อความสุดท้ายได้
- Copy, Save, Duplicate และ Reset

#### Favorites

- แยก Saved Techniques และ Saved Prompts
- Search, Filter และนำกลับไปใช้ใน Prompt Lab ได้

#### Manage Library

- เพิ่ม แก้ไข Duplicate ซ่อน และลบ Custom Technique
- Starter Technique แก้ไขผ่านการ Duplicate เป็น Custom Version
- Starter Technique ซ่อนและคืนค่าได้ แต่ไม่ลบต้นฉบับถาวร

#### Backup & Settings

- Export และ Import Backup
- Restore Starter Library
- ตั้งค่า Default Language, Default Mode และ Default Platform
- แสดงจำนวน Records, Media Size และพื้นที่จัดเก็บโดยประมาณ

### 5.3 Responsive Behavior

- Tablet ลดขนาด Rail และย่อ Prompt Panel ได้
- Mobile ใช้ Bottom Navigation
- Prompt Panel บน Mobile เปิดเป็น Drawer หรือ Full-screen Route
- Library Grid ลดเป็น 2 คอลัมน์และ 1 คอลัมน์ตามพื้นที่
- ปุ่มหลักต้องมี Touch Target อย่างน้อย 44×44 px

## 6. Starter Library

Starter Library มีประมาณ 60 รายการ แบ่งเป็น:

| Category | จำนวนเป้าหมาย |
|---|---:|
| Shot Size & Framing | 10 |
| Camera Angle | 9 |
| Camera Movement | 10 |
| Lighting | 10 |
| Composition | 9 |
| Lens & Focal Length | 7 |
| Camera Settings & Motion | 5 |

จำนวนแต่ละหมวดปรับได้เล็กน้อยระหว่างจัดทำเนื้อหา แต่ยอดรวมต้องอยู่ระหว่าง 55–65 รายการ และทั้ง 7 หมวดต้องมีเนื้อหา

เนื้อหาต้องเขียนขึ้นใหม่สำหรับ FRAME / CRAFT ภาพประกอบต้องเป็นภาพที่ผู้ใช้เป็นเจ้าของ ภาพที่มีสิทธิ์ใช้งาน หรือภาพที่สร้างขึ้นใหม่ พร้อมเก็บ Source/Credit เมื่อจำเป็น

## 7. Data Model

### 7.1 Technique

แต่ละ Technique มีข้อมูลดังนี้:

- `id`: UUID
- `slug`: รหัสสำหรับ URL และการค้นหา
- `schemaVersion`: เวอร์ชันโครงสร้างข้อมูล
- `sourceType`: `seed` หรือ `custom`
- `seedVersion`: เวอร์ชันของ Starter Data ถ้าเป็น Seed
- `category`: หนึ่งใน 7 หมวดหลัก
- `titleEn`, `titleTh`
- `abbreviation`
- `descriptionEn`, `descriptionTh`
- `useCasesEn`, `useCasesTh`
- `effectEn`, `effectTh`
- `warningsEn`, `warningsTh`
- `tags`: รายการคำค้น
- `moods`: รายการอารมณ์ภาพ
- `recommendedLenses`: ช่วงเลนส์หรือคำแนะนำ
- `cameraSettings`: ค่าเทคนิคที่เกี่ยวข้อง
- `imageKeywords`: Prompt Tokens สำหรับภาพนิ่ง
- `videoKeywords`: Prompt Tokens สำหรับวิดีโอ
- `genericImagePrompt`
- `genericVideoPrompt`
- `platformOverrides`: Override เฉพาะแพลตฟอร์มเมื่อจำเป็น
- `mediaId`: รูปหลัก
- `videoReferenceUrl`: URL ภายนอก
- `credit`: Source และ License Note
- `isFavorite`, `isHidden`
- `createdAt`, `updatedAt`, `lastUsedAt`

### 7.2 Media

- `id`
- `techniqueId`
- `blob`
- `mimeType`
- `width`, `height`, `byteSize`
- `altTh`, `altEn`
- `createdAt`, `updatedAt`

รองรับ JPG, PNG และ WebP ระบบต้องตรวจชนิดไฟล์ ลดขนาดสำหรับการแสดงผล และเก็บเป็น Blob ใน IndexedDB

### 7.3 Saved Prompt

- `id`
- `name`
- `mode`: `image` หรือ `video`
- `platformPresetId`
- `subject`, `action`, `environment`
- `selectedTechniqueIds`
- `builderValues`
- `generatedPrompt`
- `editedPrompt`
- `negativePrompt`
- `isFavorite`
- `createdAt`, `updatedAt`, `lastUsedAt`

### 7.4 Settings

- `language`: `th` หรือ `en`
- `defaultMode`: `image` หรือ `video`
- `defaultPlatformPresetId`
- `reducedMotionOverride`
- `backupReminderAt`
- `schemaVersion`

## 8. Prompt Builder

### 8.1 Core Behavior

Prompt Builder ใช้ Deterministic Template ไม่เรียก AI API และทำงาน Offline ได้ การเปลี่ยนค่าใดๆ ต้องอัปเดต Preview แบบ Real-time โดยไม่บันทึกจนกว่าผู้ใช้กด Save

ลำดับ Prompt กลาง:

```text
[shot size] + [subject/action] + [environment] +
[camera angle] + [lens] + [camera movement] +
[lighting] + [composition] + [mood/color grade] +
[platform parameters]
```

### 8.2 Image Mode

- Subject, Action และ Environment
- Shot Size
- Camera Angle
- Lens/Focal Length
- Lighting
- Composition
- Mood/Color Grade
- Aspect Ratio
- Negative Prompt

### 8.3 Video Mode

รวมข้อมูลจาก Image Mode และเพิ่ม:

- Subject Movement
- Camera Movement
- Duration
- Speed/Pacing
- FPS และ Shutter Style
- Start Frame Description
- End Frame Description
- Loop และ Transition Direction

### 8.4 Platform Presets

เวอร์ชันแรกมี:

- Generic Image
- Midjourney
- Flux
- Generic Video
- Runway
- Kling
- Veo

Preset มีหน้าที่จัดลำดับถ้อยคำ แปลงคำที่จำเป็น และเติม Parameter ที่รองรับ ผู้ใช้แก้ไข Final Prompt ได้เสมอ Platform-specific behavior ต้องแยกเป็น Module เพื่ออัปเดตได้โดยไม่แก้ Core Composer

### 8.5 Privacy

Prompt, Library และ Settings ไม่ออกจากเครื่อง การเชื่อมต่อภายนอกจะเกิดขึ้นเมื่อผู้ใช้กดลิงก์ไปแพลตฟอร์ม AI หรือ Video Reference เท่านั้น ลิงก์ภายนอกต้องเปิดด้วยค่าความปลอดภัยที่ป้องกันหน้าใหม่เข้าถึงหน้าต้นทาง

## 9. Architecture

ใช้ React + TypeScript และ Vite เป็น Frontend Application

```text
React UI
   ↓
Feature Services / Domain Logic
   ↓
Repository Interfaces
   ├── Local Adapters → IndexedDB / Dexie
   └── Cloud Adapters → Supabase ใน Phase 2
```

### 9.1 Feature Boundaries

- `library`: Search, Filter, Detail และ CRUD
- `prompt-builder`: Composer, Presets และ Builder State
- `favorites`: Favorite Techniques และ Saved Prompts
- `media`: Image Validation, Resize และ Blob Lifecycle
- `backup`: Export, Import, Validation และ Snapshot
- `settings`: Language และ Default Values
- `storage`: Repository Interfaces, Local Adapters และ Migrations

แต่ละ Feature ต้องมี Public Interface ชัดเจนและไม่เข้าถึง IndexedDB โดยตรงนอก Storage Layer

### 9.2 Repository Interfaces

Repository ขั้นต่ำประกอบด้วย:

```text
list()
getById(id)
create(record)
update(id, changes)
delete(id)
search(query, filters)
```

Media Repository เพิ่ม `putBlob`, `getBlob` และ `deleteBlob` ส่วน Backup Service ใช้ Repository Interfaces ทั้งหมด ไม่อ่านฐานข้อมูลโดยตรง

### 9.3 Local Database

- IndexedDB จัดเก็บ Techniques, Media, Saved Prompts และ Settings
- Dexie ใช้เป็น Wrapper และ Migration Layer
- Starter Seed โหลดเฉพาะเมื่อยังไม่มีสถานะ Initial Seed
- การเปลี่ยน Schema ต้องมี Migration แบบมีเวอร์ชันและทดสอบข้อมูลเวอร์ชันก่อนหน้า

### 9.4 Supabase Upgrade Path

Phase 2 เพิ่ม Supabase Adapter ที่ทำตาม Repository Interfaces เดิม พร้อม:

- Authentication
- Postgres Tables
- Storage Buckets
- Row Level Security
- Sync Status และ Conflict Resolution

Phase 2 ไม่เปลี่ยน Public Contract ของ UI และ Domain Services โดยไม่จำเป็น

## 10. Backup & Restore

Export เป็น ZIP ชุดเดียว เช่น:

```text
framecraft-backup-2026-07-21.zip
├── manifest.json
├── techniques.json
├── prompts.json
├── settings.json
└── media/
    ├── image-001.webp
    └── image-002.webp
```

`manifest.json` ระบุ App Version, Schema Version, Export Time, Record Counts และ Media Checksums

ก่อน Import ระบบต้อง:

1. ตรวจ ZIP Structure และ Manifest
2. ตรวจ Schema Version
3. ตรวจรูปแบบ Records และ Media References
4. แสดง Preview จำนวนข้อมูล
5. ให้เลือก Merge, Replace หรือ Cancel
6. สร้าง Snapshot ก่อน Replace
7. เขียนข้อมูลแบบ Atomic เท่าที่ IndexedDB Transaction รองรับ
8. หากเกิดข้อผิดพลาดให้ Rollback และคงข้อมูลเดิม

Merge ใช้ `id` เป็นหลัก หาก `id` ซ้ำให้ Record ที่ `updatedAt` ใหม่กว่าเป็นผู้ชนะและแสดงสรุป Conflict หลัง Import

## 11. Error Handling & Recovery

- ลบข้อมูลต้องมี Confirmation และ Undo สำหรับการลบทั่วไป
- Starter Technique คืนค่าได้และไม่ลบต้นฉบับถาวร
- Invalid Video URL แสดงข้อความและไม่เปิดลิงก์
- Clipboard Failure แสดงทางเลือกให้เลือกข้อความและ Copy เอง
- Storage Quota Error แสดงขนาดข้อมูล แนะนำ Export และระบุ Media ที่ใช้พื้นที่มาก
- Image Decode Error ไม่บันทึก Blob ที่ใช้ไม่ได้
- Import Error ยกเลิกทั้งชุดและแสดงสาเหตุที่ผู้ใช้แก้ได้
- Unsupported Schema Version ไม่เขียนข้อมูลและแนะนำให้อัปเดตแอป
- External Link Failure ไม่กระทบข้อมูลภายใน

ข้อความผิดพลาดทุกกรณีต้องอธิบายว่าเกิดอะไรขึ้นและผู้ใช้ควรทำอะไรต่อ โดยไม่แสดง Stack Trace ใน UI

## 12. Performance & Offline Behavior

- ข้อมูลข้อความและฟังก์ชันหลักใช้งาน Offline ได้หลังโหลดแอปสำเร็จครั้งแรก
- รูปภาพใช้ Lazy Loading และ Object URL Lifecycle ที่ไม่รั่วหน่วยความจำ
- Search และ Filter ใช้ Index ที่เหมาะสมใน IndexedDB
- Prompt Preview คำนวณใหม่เฉพาะเมื่อ Input ที่เกี่ยวข้องเปลี่ยน
- Starter Library 55–65 รายการต้องเปิดและค้นหาได้ทันทีบนมือถือทั่วไป
- UI ต้องมี Empty, Loading, Success และ Error State ชัดเจน

## 13. Accessibility

- Contrast ของข้อความและ Control ต้องผ่าน WCAG AA
- ทุก Action ใช้งานด้วย Keyboard ได้
- Focus State ต้องมองเห็นชัดแม้ใช้ Monochrome
- Icon-only Button มี Accessible Name
- รูปทุกภาพมี Alt Text ภาษาไทยและอังกฤษ
- Drawer และ Dialog จัดการ Focus Trap และคืน Focus เมื่อปิด
- Animation เคารพ `prefers-reduced-motion`

## 14. Testing Strategy

### Unit Tests

- Prompt Composer และลำดับ Tokens
- Platform Preset Transformations
- Validation ของ Technique, URL และ Media
- Database Migrations
- Merge Conflict Rule

### Repository Tests

- Create, Read, Update, Delete และ Search
- Favorite, Hide และ Restore Seed
- Blob Lifecycle

### Integration Tests

- Export แล้ว Import กลับต้องได้ Record, Settings และ Media ครบ
- Replace Import ต้องสร้าง Snapshot
- Import ผิดพลาดต้อง Rollback
- Seed Data ต้องโหลดครั้งเดียว

### End-to-End Tests

- Library → เลือก Technique → สร้าง Prompt → Copy → Save
- เพิ่ม Custom Technique พร้อมรูป → Search → Edit → Export
- Mobile Navigation และ Prompt Drawer
- Language Toggle
- Restore Starter Library

### Manual Verification

- Desktop, Tablet และ Mobile
- Keyboard-only Navigation
- Contrast และ Focus
- Offline Reload
- Storage Quota และ Broken Media Scenarios

## 15. Acceptance Criteria

เวอร์ชันแรกถือว่าเสร็จเมื่อ:

1. Starter Library มี 55–65 รายการครบ 7 หมวด
2. ผู้ใช้เพิ่ม แก้ไข Duplicate ซ่อน ค้นหา Filter และ Favorite Technique ได้
3. ผู้ใช้อัปโหลดภาพปกและแนบ Video Reference URL ได้
4. Prompt Builder รองรับ Image และ Video Mode
5. Platform Preset ทั้ง 7 แบบสร้าง Output ได้และแก้ Final Prompt ได้
6. Copy และ Save Prompt ทำงาน
7. Export/Import ZIP กู้คืนข้อมูลและภาพได้ครบ
8. UI ภาษาไทยเป็น Default และสลับคำอธิบายอังกฤษได้
9. Desktop, Tablet และ Mobile ใช้งาน Workflow หลักได้
10. Automated Tests สำหรับ Composer, Repository, Migration และ Backup ผ่าน
11. Accessibility และ Error States ตามเอกสารได้รับการตรวจ
12. Production Build สำเร็จและ Deploy บน Netlify ได้

## 16. Delivery Phases

### Phase 1 — Local-first MVP

- Application Shell และ Monochrome Design System
- IndexedDB/Dexie Repositories
- Starter Library
- Library CRUD, Search, Filter และ Favorites
- Prompt Builder และ Platform Presets
- Media, Backup, Settings และ Responsive UI
- Testing และ Netlify Deployment

### Phase 2 — Cloud Sync

- Supabase Authentication
- Cloud Repository Adapters
- Database, Storage และ RLS
- Local-to-cloud Migration
- Sync Status และ Conflict Resolution

Phase 2 เริ่มหลัง Phase 1 ใช้งานจริงและยืนยันความต้องการซิงก์ข้ามอุปกรณ์แล้ว
