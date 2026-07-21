import type { Technique, TechniqueCategory } from "./types";

type SeedDefinition = readonly [
  slug: string,
  titleEn: string,
  titleTh: string,
  abbreviation: string,
  descriptionTh: string,
  useCasesTh: string,
  effectTh: string,
  warningTh: string,
  lens: string,
  keywords: string,
  moods: string,
];

const shotSizes: SeedDefinition[] = [
  ["extreme-wide-shot", "Extreme Wide Shot", "ภาพกว้างมาก", "EWS", "ให้พื้นที่และสเกลของฉากเป็นตัวเล่าเรื่อง โดยตัวแบบมีขนาดเล็กมาก", "เปิดสถานที่ แสดงความยิ่งใหญ่ หรือความโดดเดี่ยว", "สร้างสเกล ระยะห่าง และความรู้สึกว่ามนุษย์เป็นส่วนเล็กของโลก", "ตัวแบบอาจเล็กเกินไปบนมือถือ ควรแยกรูปทรงออกจากฉาก", "14–24mm", "extreme wide shot, tiny subject, vast environment", "epic,isolated"],
  ["wide-shot", "Wide Shot", "ภาพกว้าง", "WS", "เห็นตัวแบบเต็มตัวพร้อมพื้นที่รอบข้างเพื่ออธิบายตำแหน่งและการเคลื่อนไหว", "Establishing, blocking และฉาก Action", "ทำให้ผู้ชมเข้าใจภูมิศาสตร์ของฉาก", "ระวังฉากหลังรบกวนตัวแบบ", "20–35mm", "wide shot, full body, environmental context", "open,dynamic"],
  ["full-shot", "Full Shot", "ภาพเต็มตัว", "FS", "เห็นร่างกายตั้งแต่ศีรษะถึงเท้าโดยตัวแบบยังเป็นจุดสนใจหลัก", "แฟชั่น การแสดง ท่าทาง และ Body Language", "รักษาสมดุลระหว่างคนกับสถานที่", "อย่าตัดปลายเท้าและเว้น Headroom ให้พอดี", "35–50mm", "full shot, head to toe, body language", "confident,clear"],
  ["medium-long-shot", "Medium Long Shot", "ภาพปานกลางค่อนกว้าง", "MLS", "เฟรมตั้งแต่เข่าหรือกลางต้นขาขึ้นไป เห็นท่าทางและบริบท", "บทสนทนาที่มี Action และงาน Presenter", "ให้ความเป็นธรรมชาติและยังอ่านภาษากายได้", "ระวังตัดตรงข้อพับเข่า", "35–50mm", "medium long shot, knees up, contextual portrait", "natural,observant"],
  ["cowboy-shot", "Cowboy Shot", "ภาพคาวบอย", "CS", "เฟรมช่วงกลางต้นขาขึ้นไป เดิมใช้เพื่อให้เห็นซองปืนของตัวละคร", "Hero shot, fashion และฉากที่มือมีความสำคัญ", "ดูมั่นใจและพร้อมลงมือ", "จัดตำแหน่งมือไม่ให้ชนขอบเฟรม", "40–65mm", "cowboy shot, mid thigh framing, heroic posture", "heroic,ready"],
  ["medium-shot", "Medium Shot", "ภาพปานกลาง", "MS", "เฟรมตั้งแต่เอวขึ้นไป เป็นระยะมาตรฐานสำหรับบทสนทนาและ Presenter", "สัมภาษณ์ บทสนทนา และงานองค์กร", "ใกล้พอเห็นอารมณ์และกว้างพอเห็นมือ", "ระวังตัดข้อมือหรือศอก", "50–70mm", "medium shot, waist up, conversational framing", "balanced,friendly"],
  ["medium-close-up", "Medium Close-Up", "ภาพปานกลางใกล้", "MCU", "เฟรมจากอกหรือไหล่ขึ้นไป เน้นสีหน้าโดยยังมีพื้นที่หายใจ", "สัมภาษณ์ รีวิวสินค้า และฉากอารมณ์", "สร้างความใกล้ชิดโดยไม่กดดันเกินไป", "ควบคุม Headroom และ Eyeline ให้คงที่", "70–100mm", "medium close-up, chest up, expressive face", "intimate,focused"],
  ["close-up", "Close-Up", "ภาพใกล้", "CU", "ใบหน้าหรือวัตถุเติมพื้นที่ส่วนใหญ่ของเฟรมเพื่อเน้นรายละเอียด", "ช่วงอารมณ์สำคัญ Beauty และ Product Detail", "ดึงผู้ชมเข้าใกล้ความรู้สึกของตัวแบบ", "Focus และผิวหน้าต้องแม่นเพราะความผิดพลาดเห็นชัด", "85–135mm", "cinematic close-up, facial detail, shallow depth", "intimate,emotional"],
  ["extreme-close-up", "Extreme Close-Up", "ภาพใกล้มาก", "ECU", "เลือกเพียงรายละเอียดเล็ก เช่น ดวงตา ปาก หรือกลไกของวัตถุ", "เพิ่มความตึงเครียด Reveal และ Macro Detail", "ทำให้รายละเอียดธรรมดาดูทรงพลัง", "Depth of field บางมาก ต้องควบคุม Focus", "100mm macro", "extreme close-up, isolated detail, macro texture", "intense,mysterious"],
  ["insert-shot", "Insert Shot", "ภาพแทรก", "INS", "ภาพใกล้ของข้อมูลหรือการกระทำที่จำเป็นต่อความเข้าใจของฉาก", "มือกดปุ่ม หน้าจอ เอกสาร และ Product Feature", "ให้ข้อมูลและสร้างจังหวะการตัดต่อ", "ต้องรักษา Continuity ของมือ แสง และทิศทาง", "50–100mm", "insert shot, meaningful detail, visual information", "precise,informative"],
];

const angles: SeedDefinition[] = [
  ["eye-level", "Eye-Level", "ระดับสายตา", "EL", "วางกล้องใกล้ระดับตาของตัวแบบเพื่อมุมมองที่เป็นกลาง", "สัมภาษณ์ บทสนทนา และงานที่ต้องการความจริงใจ", "ผู้ชมรู้สึกเท่าเทียมและเข้าถึงง่าย", "ระดับตาที่คลาดเล็กน้อยอาจเปลี่ยนความรู้สึกโดยไม่ตั้งใจ", "50–85mm", "eye-level angle, neutral perspective", "honest,natural"],
  ["high-angle", "High Angle", "มุมกด", "HA", "กล้องอยู่สูงกว่าตัวแบบและมองลงมา", "แสดงความเปราะบาง ภูมิศาสตร์ หรือการถูกควบคุม", "ทำให้ตัวแบบดูเล็กและเปิดพื้นที่รอบตัว", "อย่าใช้กับ Portrait โดยไม่ตรวจสัดส่วนใบหน้า", "35–85mm", "high angle shot, camera looking down", "vulnerable,observed"],
  ["low-angle", "Low Angle", "มุมเสย", "LA", "กล้องอยู่ต่ำกว่าตัวแบบและมองขึ้นไป", "Hero, Leader, Architecture และ Product Reveal", "เพิ่มอำนาจ สเกล และความโดดเด่น", "เลนส์กว้างระยะใกล้อาจบิดสัดส่วนใบหน้า", "24–50mm", "low angle perspective, heroic framing", "powerful,heroic"],
  ["dutch-angle", "Dutch Angle", "มุมเอียง", "DA", "เอียงแกนกล้องให้เส้นขอบฟ้าไม่ตรง", "ความไม่มั่นคง ความสับสน หรือพลังงานจัด", "สร้างแรงตึงและทำให้โลกดูผิดปกติ", "ใช้มากเกินไปจะดูเป็นลูกเล่น", "24–50mm", "dutch angle, canted frame, tilted horizon", "uneasy,chaotic"],
  ["overhead-shot", "Overhead Shot", "มุมบนตรง", "OH", "กล้องอยู่เหนือฉากและมองลงตั้งฉาก", "อาหาร โต๊ะทำงาน Blocking และ Graphic Layout", "เปลี่ยนพื้นที่ให้เป็นรูปทรงและ Pattern", "ต้องจัดทุกขอบเฟรมเพราะเห็นฉากทั้งหมด", "24–50mm", "direct overhead shot, top-down composition", "graphic,ordered"],
  ["birds-eye-view", "Bird's-Eye View", "มุมสูงแบบนกมอง", "BEV", "มุมสูงมากที่เห็นภูมิประเทศหรือการเคลื่อนที่เป็นภาพรวม", "เมือง ฝูงชน รถ และ Landscape", "เน้น Pattern, Scale และระบบของพื้นที่", "ตัวแบบหลักอาจหายไปหากไม่มี Contrast", "16–35mm", "bird's-eye view, aerial perspective", "vast,systemic"],
  ["worms-eye-view", "Worm's-Eye View", "มุมต่ำติดพื้น", "WEV", "กล้องอยู่เกือบติดพื้นและมองขึ้นอย่างชัดเจน", "กีฬา Architecture และฉากเหนือจริง", "ขยายความสูงและสร้างความรู้สึก Monumental", "ป้องกันเลนส์และตรวจสิ่งรบกวนบนพื้น", "14–24mm", "worm's-eye view, ground-level perspective", "monumental,surreal"],
  ["over-the-shoulder", "Over-the-Shoulder", "ข้ามไหล่", "OTS", "ใช้ไหล่หรือศีรษะของคนหนึ่งเป็น Foreground มองไปยังอีกคน", "บทสนทนา การสอน และการดูหน้าจอ", "เชื่อมตัวละครและสร้างมิติของพื้นที่", "รักษา Eyeline และ 180-degree rule", "50–100mm", "over-the-shoulder shot, foreground shoulder", "connected,conversational"],
  ["point-of-view", "Point of View", "มุมมองตัวละคร", "POV", "กล้องแทนสายตาของตัวละครให้ผู้ชมเห็นสิ่งเดียวกัน", "Immersive action, Reveal และ Experience Demo", "ทำให้ผู้ชมรู้สึกอยู่ในเหตุการณ์", "Movement ต้องสอดคล้องกับร่างกายและไม่เวียนหัว", "24–35mm", "first-person point of view, immersive perspective", "immersive,subjective"],
];

const movements: SeedDefinition[] = [
  ["pan", "Pan", "แพนกล้อง", "PAN", "หมุนกล้องซ้ายหรือขวาจากจุดตั้งเดิม", "ติดตามตัวแบบ เปิดเผยข้อมูล และเชื่อมสองจุด", "ควบคุมทิศทางสายตาและจังหวะ", "แพนเร็วเกินไปทำให้ภาพกระตุก", "35–70mm", "smooth pan, horizontal camera rotation", "observant,fluid"],
  ["tilt", "Tilt", "ทิลต์กล้อง", "TILT", "หมุนกล้องขึ้นหรือลงจากจุดตั้งเดิม", "Reveal ความสูง สินค้า หรือร่างกาย", "สร้างการค้นพบในแนวตั้ง", "ตั้งหัวกล้องและ Balance ให้ไหลลื่น", "35–70mm", "slow tilt, vertical camera reveal", "revealing,elegant"],
  ["dolly-in", "Dolly In", "ดอลลี่เข้า", "D-IN", "เคลื่อนกล้องเข้าใกล้ตัวแบบโดย Perspective เปลี่ยนจริง", "เพิ่มความสนใจ ช่วงตระหนักรู้ และ Product Hero", "เพิ่มความใกล้ชิดและแรงดึงดูด", "วางรางหรือเส้นทางให้เรียบและรักษา Focus", "35–85mm", "slow dolly in, camera moves toward subject", "focused,intense"],
  ["dolly-out", "Dolly Out", "ดอลลี่ออก", "D-OUT", "เคลื่อนกล้องถอยห่างเพื่อเปิดบริบทหรือสร้างระยะ", "Ending, Isolation และ Reveal Environment", "ลดความใกล้ชิดและขยายโลกของฉาก", "ตรวจเส้นทางด้านหลังและ Focus Pull", "35–85mm", "dolly out, camera pulls away", "reflective,isolated"],
  ["tracking-shot", "Tracking Shot", "แทร็กตาม", "TRACK", "กล้องเคลื่อนตามตัวแบบในทิศทางเดียวกัน", "เดิน วิ่ง รถ และ Workflow Demo", "สร้างพลังต่อเนื่องและทำให้ผู้ชมร่วมเดินทาง", "รักษาระยะและความเร็วให้สัมพันธ์กับตัวแบบ", "24–50mm", "smooth tracking shot, camera follows subject", "dynamic,immersive"],
  ["truck-shot", "Truck / Crab", "เคลื่อนกล้องด้านข้าง", "TRUCK", "กล้องเคลื่อนซ้ายหรือขวาโดยไม่หมุนแกน", "Reveal Layer, Product Lineup และ Passage", "สร้าง Parallax และมิติของฉาก", "ต้องมี Foreground เพื่อให้เห็นผลการเคลื่อน", "24–50mm", "lateral truck shot, strong parallax", "dimensional,smooth"],
  ["crane-shot", "Crane / Jib", "เครนหรือจิ๊บ", "JIB", "กล้องเคลื่อนขึ้นลงหรือโค้งผ่านพื้นที่ด้วยแขนกล", "Opening, Finale, Crowd และ Architecture", "เปลี่ยน Scale และ Perspective อย่างสง่างาม", "ซ้อม Clearance และจุดจบของ Movement", "18–50mm", "sweeping crane shot, elevated camera move", "grand,elegant"],
  ["gimbal-shot", "Gimbal Walk", "เดินกล้องด้วยกิมบอล", "GIM", "กล้องเคลื่อนอย่างนุ่มผ่านพื้นที่โดย Operator เดินตาม", "Tour, Event, Real Estate และ Follow Shot", "ให้ความต่อเนื่องและใกล้ชิดโดยไม่สั่น", "อย่าปรับ Smooth จน Movement ดูลอย", "18–35mm", "stabilized gimbal shot, fluid walking camera", "immersive,polished"],
  ["handheld", "Handheld", "ถือกล้อง", "HH", "การสั่นเล็กน้อยจากมือสร้างสัมผัสของเหตุการณ์จริง", "Documentary, Urgency และ Intimate Drama", "เพิ่มความสดและความไม่แน่นอน", "ควบคุมระดับการสั่นให้เหมาะกับเนื้อหา", "24–50mm", "subtle handheld camera, natural human movement", "urgent,real"],
  ["arc-shot", "Arc Shot", "เคลื่อนโค้งรอบตัวแบบ", "ARC", "กล้องเคลื่อนเป็นส่วนโค้งหรือวงรอบตัวแบบ", "Hero Reveal, Relationship และ Product Orbit", "เพิ่มมิติและทำให้ช่วงเวลารู้สึกสำคัญ", "รักษารัศมี ความเร็ว และฉากหลังให้ต่อเนื่อง", "24–50mm", "slow arc shot, camera orbits subject", "heroic,romantic"],
];

const lighting: SeedDefinition[] = [
  ["soft-key-light", "Soft Key Light", "ไฟหลักนุ่ม", "KEY", "แหล่งไฟขนาดใหญ่ทำให้เงาไล่ระดับและผิวดูเป็นธรรมชาติ", "Portrait, Interview และ Beauty", "ให้ความน่าเชื่อถือและเข้าถึงง่าย", "วางไฟใกล้เกินไปอาจทำให้ฉากแบน", "50–100mm", "large soft key light, gentle shadow transition", "soft,honest"],
  ["hard-light", "Hard Light", "แสงแข็ง", "HARD", "แหล่งไฟขนาดเล็กสร้างขอบเงาชัดและ Texture สูง", "Fashion, Noir และ Graphic Portrait", "เพิ่ม Drama และความคมของรูปทรง", "ควบคุม Highlight บนผิวและฉาก", "35–85mm", "hard directional light, crisp shadows", "bold,graphic"],
  ["three-point-lighting", "Three-Point Lighting", "ไฟสามจุด", "3PT", "ใช้ Key, Fill และ Back Light เพื่อควบคุมรูปทรงอย่างเป็นระบบ", "Interview, Studio และ Commercial", "แยกตัวแบบจากฉากและอ่านใบหน้าชัด", "อย่าให้ทุกไฟแรงเท่ากันจนภาพไร้มิติ", "50–100mm", "three-point lighting, key fill and rim", "clean,professional"],
  ["rim-light", "Rim / Back Light", "ไฟขอบหรือไฟหลัง", "RIM", "ไฟจากด้านหลังสร้างเส้นสว่างรอบตัวแบบ", "Silhouette, Product และ Night Scene", "เพิ่ม Separation และมิติ", "ป้องกัน Flare และ Highlight ล้น", "50–135mm", "bright rim light, edge separation", "dramatic,defined"],
  ["low-key-lighting", "Low-Key Lighting", "แสงโลว์คีย์", "LOW", "ใช้สัดส่วนเงามากและ Fill ต่ำเพื่อภาพ Contrast สูง", "Drama, Luxury และ Mystery", "สร้างความลึกและบรรยากาศพรีเมียม", "เงาต้องยังมีรายละเอียดที่จำเป็น", "35–100mm", "low-key lighting, deep controlled shadows", "mysterious,premium"],
  ["high-key-lighting", "High-Key Lighting", "แสงไฮคีย์", "HIGH", "ภาพสว่าง เงาน้อย และ Contrast ต่ำ", "Beauty, Lifestyle และ Clean Commercial", "ให้ความสด เป็นมิตร และโปร่ง", "ระวังพื้นผิวขาวสูญเสียรายละเอียด", "50–100mm", "high-key lighting, bright clean exposure", "bright,friendly"],
  ["chiaroscuro", "Chiaroscuro", "คิอารอสคูโร", "CHI", "แสงและเงาแบ่งรูปทรงอย่างชัดเจนเหมือนงานจิตรกรรม", "Character Portrait, Noir และ Fine Art", "ทำให้ใบหน้าและวัตถุดูเป็นประติมากรรม", "วัดแสงที่ Highlight และจัดเงาอย่างตั้งใจ", "50–100mm", "chiaroscuro lighting, sculpted light and shadow", "dramatic,artful"],
  ["golden-hour", "Golden Hour", "แสงโกลเดนอะวร์", "GH", "แสงอาทิตย์ต่ำให้สีอุ่น เงายาว และความนุ่มตามธรรมชาติ", "Lifestyle, Travel และ Emotional Scene", "สร้างความอบอุ่นและ Nostalgia", "เวลาถ่ายสั้นและ Exposure เปลี่ยนเร็ว", "35–85mm", "golden hour side light, warm low sun", "warm,nostalgic"],
  ["practical-lighting", "Practical Lighting", "แสงจากอุปกรณ์ในฉาก", "PRAC", "ใช้โคมไฟ หน้าจอ เทียน หรือป้ายที่เห็นอยู่ในเฟรมเป็นแรงจูงใจของแสง", "Interior, Night และ Motivated Lighting", "ทำให้โลกของฉากน่าเชื่อถือ", "ควบคุม Color Temperature และไม่ให้หลอด Overexpose", "24–85mm", "motivated practical lights visible in scene", "believable,atmospheric"],
  ["volumetric-light", "Volumetric Light", "ลำแสงในหมอก", "VOL", "แสงมองเห็นเป็นลำเมื่อผ่านหมอก ฝุ่น หรือควัน", "Concert, Mystery และ Epic Interior", "เพิ่ม Depth และ Atmosphere", "ใช้ Haze อย่างปลอดภัยและไม่มากจนภาพขุ่น", "24–85mm", "volumetric light beams through subtle haze", "atmospheric,epic"],
];

const compositions: SeedDefinition[] = [
  ["rule-of-thirds", "Rule of Thirds", "กฎสามส่วน", "R3", "วางจุดสำคัญบนเส้นหรือจุดตัดของตารางสามคูณสาม", "Portrait, Landscape และงานทั่วไป", "สมดุลแต่ยังมีพลังและพื้นที่หายใจ", "อย่าใช้ Grid แทนการพิจารณา Visual Weight", "ทุกช่วงเลนส์", "rule of thirds composition, intentional negative space", "balanced,dynamic"],
  ["centered-composition", "Centered Composition", "จัดกึ่งกลาง", "CTR", "วางตัวแบบบนแกนกลางเพื่อความนิ่งและชัดเจน", "Hero, Architecture และ Direct Address", "ให้ความรู้สึกมั่นคง เป็นทางการ หรือทรงพลัง", "ฉากหลังต้องสมมาตรหรือมีเหตุผลรองรับ", "24–100mm", "perfectly centered composition, strong central axis", "formal,powerful"],
  ["symmetry", "Symmetry", "สมมาตร", "SYM", "จัดองค์ประกอบสองฝั่งให้มีน้ำหนักและรูปทรงสัมพันธ์กัน", "Architecture, Product และ Stylized Scene", "สร้างระเบียบ ความพรีเมียม และความตั้งใจ", "ความเอียงเพียงเล็กน้อยจะเห็นชัด", "18–50mm", "symmetrical frame, balanced geometry", "ordered,premium"],
  ["leading-lines", "Leading Lines", "เส้นนำสายตา", "LINE", "ใช้ถนน ผนัง แสง หรือทิศทางการมองนำสายตาไปยังจุดสำคัญ", "Architecture, Travel และ Product", "เพิ่ม Depth, Direction และ Focus", "ตรวจไม่ให้เส้นนำสายตาออกนอกเฟรม", "18–50mm", "strong leading lines toward subject", "directed,deep"],
  ["frame-within-frame", "Frame Within a Frame", "กรอบซ้อนกรอบ", "FWF", "ใช้ประตู หน้าต่าง หรือ Foreground สร้างกรอบภายในภาพ", "Portrait, Voyeuristic และ Architecture", "เพิ่มชั้นภาพและบังคับสายตา", "กรอบไม่ควรแย่งความสนใจจากตัวแบบ", "35–85mm", "frame within a frame, foreground architecture", "intimate,layered"],
  ["negative-space", "Negative Space", "พื้นที่ว่าง", "NEG", "เว้นพื้นที่ที่มีรายละเอียดน้อยรอบตัวแบบอย่างตั้งใจ", "Title Card, Advertising และ Isolation", "สร้างความสงบ Scale และพื้นที่สำหรับข้อความ", "พื้นที่ว่างต้องมีน้ำหนักสมดุลกับตัวแบบ", "35–100mm", "generous negative space, clean breathing room", "minimal,isolated"],
  ["depth-layering", "Depth Layering", "การแบ่งชั้นความลึก", "DEPTH", "จัด Foreground, Midground และ Background ให้แยกกันชัด", "Cinema, Documentary และ Product", "ทำให้ภาพแบนกลายเป็นโลกที่มีมิติ", "แต่ละชั้นต้องไม่บังข้อมูลสำคัญ", "24–70mm", "foreground midground background layers, cinematic depth", "immersive,rich"],
  ["diagonal-composition", "Diagonal Composition", "องค์ประกอบแนวทแยง", "DIAG", "ใช้เส้นหรือการวางตัวแบบตามแนวทแยงเพื่อเพิ่มแรงเคลื่อน", "Action, Fashion และ Dynamic Product", "ให้ความรู้สึกเคลื่อนไหวและไม่หยุดนิ่ง", "ระวังเฟรมเสียสมดุลโดยไม่มีจุดพักสายตา", "24–70mm", "diagonal composition, energetic visual flow", "energetic,bold"],
  ["golden-ratio", "Golden Ratio", "สัดส่วนทองคำ", "PHI", "จัดองค์ประกอบตามสัดส่วนและเส้นโค้งที่นำสายตาอย่างเป็นธรรมชาติ", "Fine Art, Landscape และ Editorial", "ให้ความกลมกลืนและการไหลของสายตา", "ควรใช้เป็นแนวคิด ไม่จำเป็นต้องตรงสูตรทุกจุด", "35–85mm", "golden ratio composition, organic visual flow", "harmonious,elegant"],
];

const lenses: SeedDefinition[] = [
  ["ultra-wide-lens", "Ultra-Wide Lens", "เลนส์กว้างมาก", "14–20", "เก็บมุมมองกว้างและขยายความต่างของระยะใกล้ไกล", "Architecture, Tight Space และ Epic Environment", "สร้าง Scale, Perspective และความเคลื่อนไหว", "ขอบภาพบิดและใบหน้าระยะใกล้ผิดสัดส่วน", "14–20mm", "ultra-wide lens, exaggerated perspective", "expansive,dynamic"],
  ["wide-lens", "Wide Lens", "เลนส์กว้าง", "24–35", "ให้บริบทมากและยังควบคุม Distortion ได้ง่ายกว่า Ultra-wide", "Documentary, Gimbal และ Environmental Portrait", "ทำให้ผู้ชมรู้สึกอยู่ใกล้เหตุการณ์", "รักษาระดับกล้องเพื่อลดเส้นล้ม", "24–35mm", "wide-angle lens, immersive environmental perspective", "immersive,open"],
  ["normal-lens", "Normal Lens", "เลนส์ระยะปกติ", "40–55", "มุมมองใกล้เคียงการรับรู้ของมนุษย์และไม่เน้น Distortion", "Narrative, Street และ Everyday Product", "ให้ภาพเป็นธรรมชาติและซื่อสัตย์", "อาจดูธรรมดาหากองค์ประกอบไม่ชัด", "40–55mm", "normal lens, natural perspective", "natural,honest"],
  ["portrait-lens", "Portrait Lens", "เลนส์พอร์ตเทรต", "85", "บีบ Perspective เล็กน้อยและแยกฉากหลังได้ดี", "Portrait, Interview และ Beauty", "ให้สัดส่วนใบหน้าสวยและภาพดูพรีเมียม", "ต้องมีระยะถอยและ Focus แม่น", "75–100mm", "85mm portrait lens, flattering compression", "intimate,premium"],
  ["telephoto-lens", "Telephoto Lens", "เลนส์เทเล", "135+", "ดึงฉากไกลให้ใกล้และบีบระยะระหว่างชั้นภาพ", "Sports, Wildlife และ Compressed Landscape", "สร้าง Isolation และ Background Compression", "Camera Shake และอากาศร้อนมีผลชัด", "135–300mm", "telephoto compression, isolated subject", "focused,compressed"],
  ["macro-lens", "Macro Lens", "เลนส์มาโคร", "MACRO", "โฟกัสใกล้เพื่อแสดงรายละเอียดเล็กในอัตราขยายสูง", "Product, Texture, Food และ Nature", "เปลี่ยนรายละเอียดให้เป็นโลกใหม่", "Depth of field บางและต้องการแสงมาก", "90–105mm macro", "macro lens, extreme fine detail", "precise,tactile"],
  ["anamorphic-lens", "Anamorphic Lens", "เลนส์อนามอร์ฟิก", "ANA", "บันทึกภาพกว้างด้วย Optical Character, Oval Bokeh และ Horizontal Flare", "Narrative, Music Video และ Premium Commercial", "ให้ลายเซ็นภาพยนตร์และความกว้างของเฟรม", "Focus และ Close Focus ยากกว่าเลนส์ทรงกลม", "40–100mm anamorphic", "anamorphic lens, oval bokeh, subtle horizontal flare", "cinematic,dreamlike"],
];

const settings: SeedDefinition[] = [
  ["shallow-depth", "Shallow Depth of Field", "ชัดตื้น", "DOF-S", "ใช้รูรับแสงกว้างและระยะสัมพันธ์เพื่อให้ฉากหลังละลาย", "Portrait, Product และ Focus Control", "แยกตัวแบบและเพิ่มความใกล้ชิด", "Focus หลุดง่ายเมื่อคนหรือกล้องเคลื่อน", "50–135mm", "shallow depth of field, selective focus", "intimate,soft"],
  ["deep-focus", "Deep Focus", "ชัดลึก", "DOF-D", "รักษารายละเอียดตั้งแต่ Foreground ถึง Background", "Architecture, Ensemble Blocking และ Landscape", "เปิดให้ผู้ชมเลือกมองหลายชั้นในภาพ", "ต้องการแสงหรือ ISO มากขึ้นเมื่อหรี่รูรับแสง", "18–35mm", "deep focus, foreground to background sharpness", "clear,immersive"],
  ["motion-blur", "Motion Blur", "ภาพเคลื่อนไหวเบลอ", "MB", "ใช้ Shutter ช้าให้การเคลื่อนทิ้งร่องรอยในเฟรม", "Speed, Dance และ Abstract Action", "สื่อพลัง เวลา และทิศทาง", "รักษาจุดอ้างอิงบางส่วนให้คมเพื่ออ่านภาพได้", "24–85mm", "intentional motion blur, directional movement", "energetic,dreamlike"],
  ["crisp-motion", "Crisp Motion", "หยุดการเคลื่อนไหว", "FAST", "ใช้ Shutter เร็วเพื่อหยุด Action และเก็บรายละเอียด", "Sports, Splash และ Product Action", "ให้ความแม่นและความรู้สึกเหนือเวลา", "ต้องชดเชยแสงด้วยรูรับแสงหรือ ISO", "35–200mm", "fast shutter, crisp frozen motion", "precise,powerful"],
  ["cinematic-shutter", "180° Shutter Motion", "โมชั่นแบบชัตเตอร์ 180 องศา", "180°", "ตั้ง Shutter ใกล้สองเท่าของ Frame Rate เพื่อ Motion Blur ที่คุ้นตา", "Narrative, Commercial และ Video ทั่วไป", "ให้การเคลื่อนไหวเป็นธรรมชาติแบบภาพยนตร์", "แสงกลางวันต้องใช้ ND Filter เพื่อรักษารูรับแสง", "ทุกช่วงเลนส์", "natural cinematic motion blur, 180-degree shutter", "cinematic,natural"],
];

const categoryGroups: Array<[TechniqueCategory, SeedDefinition[]]> = [
  ["shot-size", shotSizes],
  ["camera-angle", angles],
  ["camera-movement", movements],
  ["lighting", lighting],
  ["composition", compositions],
  ["lens", lenses],
  ["camera-settings", settings],
];

const createdAt = "2026-07-21T00:00:00.000Z";

function titleToId(category: TechniqueCategory, slug: string) {
  const prefix: Record<TechniqueCategory, string> = {
    "shot-size": "shot",
    "camera-angle": "angle",
    "camera-movement": "move",
    lighting: "light",
    composition: "comp",
    lens: "lens",
    "camera-settings": "setting",
  };
  return `${prefix[category]}-${slug === "extreme-wide-shot" ? "extreme-wide" : slug}`;
}

export const starterTechniques: Technique[] = categoryGroups.flatMap(
  ([category, definitions]) =>
    definitions.map(
      ([slug, titleEn, titleTh, abbreviation, descriptionTh, useCasesTh, effectTh, warningsTh, lens, keywords, moods]) => ({
        id: titleToId(category, slug),
        slug,
        schemaVersion: 1 as const,
        sourceType: "seed" as const,
        category,
        titleEn,
        titleTh,
        abbreviation,
        descriptionEn: `${titleEn} is a production technique used to control perspective, attention, and visual storytelling.`,
        descriptionTh,
        useCasesTh,
        effectTh,
        warningsTh,
        tags: keywords.split(", ").map((value) => value.trim()),
        moods: moods.split(","),
        recommendedLenses: [lens],
        cameraSettings: category === "camera-settings" ? [titleEn] : [],
        imageKeywords: keywords.split(", ").map((value) => value.trim()),
        videoKeywords: [`${keywords.split(",")[0].trim()} with controlled cinematic motion`],
        genericImagePrompt: keywords,
        genericVideoPrompt: `${keywords}, controlled cinematic motion`,
        isFavorite: false,
        isHidden: false,
        createdAt,
        updatedAt: createdAt,
      }),
    ),
);

export const categoryLabels: Record<TechniqueCategory, { th: string; en: string }> = {
  "shot-size": { th: "ระยะภาพ", en: "Shot Size" },
  "camera-angle": { th: "มุมกล้อง", en: "Camera Angle" },
  "camera-movement": { th: "การเคลื่อนกล้อง", en: "Camera Movement" },
  lighting: { th: "แสง", en: "Lighting" },
  composition: { th: "องค์ประกอบ", en: "Composition" },
  lens: { th: "เลนส์", en: "Lens" },
  "camera-settings": { th: "ค่ากล้อง", en: "Camera Settings" },
};
