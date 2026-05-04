# 🏸 QueueBad — ระบบเรียงคิวแบดมินตัน

> **"แพ้เป็นพระ ชนะเป็นมั้ย"** — จัดการคิวผู้เล่นและสนามแบดมินตันแบบเรียลไทม์

---

## ภาพรวม

QueueBad เป็นเว็บแอปสำหรับจัดการคิวแบดมินตันภายในกลุ่ม รองรับหลายสนามพร้อมกัน มีระบบจับเวลาแมตช์ และบันทึกประวัติการเล่น ออกแบบมาให้ใช้งานได้ง่ายทั้งบนมือถือและเดสก์ท็อป

---

## ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---|---|
| **จัดการคิว** | เพิ่ม/ลบผู้เล่น, สุ่มลำดับคิว, ป้องกันชื่อซ้ำ |
| **จัดการสนาม** | เพิ่ม/ลบสนามได้อิสระ, เริ่มต้น 3 สนาม |
| **จับเวลาแมตช์** | นับเวลาแต่ละแมตช์แบบ real-time |
| **จบเกม & ต่อคิว** | ส่งผู้เล่นกลับคิวอัตโนมัติหลังจบเกม |
| **ประวัติการเล่น** | บันทึกผลย้อนหลัง 50 แมตช์ |
| **Dark Mode** | สลับธีมสว่าง/มืด บันทึกการตั้งค่า |
| **QR Code** | แชร์ลิงก์ให้เพื่อนสแกนเข้าร่วม |
| **Drag & Drop** | จัดลำดับคิวด้วยการลากได้เลย |
| **บันทึกอัตโนมัติ** | ข้อมูลทั้งหมดบันทึกใน localStorage |

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ไม่มี framework)
- **Storage:** `localStorage` (ทำงานได้แม้ไม่มีอินเทอร์เน็ต)
- **Database (optional):** [Supabase](https://supabase.com) — สำหรับ sync ข้อมูลแบบ real-time
- **Drag & Drop:** [SortableJS](https://sortablejs.com)
- **QR Code:** [qrcode.js](https://www.npmjs.com/package/qrcode)
- **Fonts:** Google Fonts (Prompt, Lexend, Inter)
- **Deploy:** [Cloudflare Pages](https://pages.cloudflare.com) via Wrangler

---

## โครงสร้างโปรเจก

```
QueueBad/
├── index.html              # หน้าหลักของแอป
├── app.js                  # Logic หลัก (State, Queue, Courts, History)
├── style.css               # สไตล์หลัก
├── kinetic-theme.css       # Kinetic theme
├── wrangler.jsonc          # Config สำหรับ Cloudflare Pages
├── js/
│   ├── App.js              # Entry point
│   ├── main.js             # Bootstrap
│   ├── utils.js            # Utility functions
│   ├── managers/           # Business logic (Queue, Court, History)
│   ├── models/             # Data models
│   └── ui/                 # UI components
└── styles/
    ├── theme-dark.css       # Dark mode
    ├── theme-light.css      # Light mode
    ├── 01-base.css
    ├── 02-components.css
    ├── 03-overlays-responsive.css
    ├── 04-queue-courts-menu.css
    └── 05-admin-swap.css
```

---

## วิธีใช้งาน

### เริ่มต้นใช้งานทันที (ไม่ต้อง install อะไร)

เปิดไฟล์ `index.html` ในเบราว์เซอร์ได้เลย หรือเข้าผ่าน URL ที่ deploy ไว้

### รัน Local ด้วย Wrangler (Cloudflare)

```bash
npm install -g wrangler
wrangler pages dev .
```

---

## วิธีการเล่น

1. **เพิ่มผู้เล่น** — พิมพ์ชื่อในช่องแล้วกด Enter หรือกดปุ่ม "เพิ่ม"
2. **ส่งลงสนาม** — กดปุ่ม "ส่งลงสนาม" เมื่อมีผู้เล่นครบ 4 คนและมีสนามว่าง
3. **จบเกม** — กด "จบเกม" เพื่อล้างสนาม หรือ "จบ & ต่อคิว" เพื่อส่งผู้เล่นกลับคิวอัตโนมัติ
4. **สุ่มลำดับ** — กดปุ่ม "สุ่มคิว" เพื่อสุ่มลำดับผู้เล่นในคิว
5. **เพิ่มสนาม** — กดปุ่ม "เพิ่มสนาม" ที่มุมล่างขวาได้เลย

---

## Deploy บน Cloudflare Pages

1. Fork หรือ clone repo นี้
2. เข้า [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → Create a project
3. เชื่อมต่อ GitHub repo และเลือก branch `main`
4. Build settings: ไม่ต้องตั้งค่า build command (static site)
5. Deploy!

หรือใช้ Wrangler CLI:

```bash
wrangler pages deploy .
```

---

## License

MIT License — ใช้งานและแก้ไขได้อิสระ
