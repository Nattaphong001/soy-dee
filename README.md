# Soy-Dee 🦎

ระบบติดตามและประเมินพฤติกรรมสุขภาพส่วนบุคคล — mobile web app ให้ผู้ใช้บันทึกอาหาร กิจกรรม และการนอน แล้วดูสรุปผลผ่านแดชบอร์ดที่มี "กิ้งก่า" (gecko) เป็น mascot เดินไปมาตามการ์ดสถิติต่างๆ

> โปรเจคนี้เป็นฝั่ง **Frontend** เท่านั้น พัฒนาเป็น Vanilla HTML/CSS/JS ล้วน ไม่ใช้ framework คู่กับ Backend REST API แยกคนละ repository (Go + MySQL)

## Tech Stack

**Frontend**
- HTML5, CSS3, Vanilla JavaScript (ES6+) — ไม่ใช้ framework/build tool
- Fetch API wrapper กลาง (`assets/js/shared/api.js`) จัดการ JWT session, auto refresh token, error handling
- Multi-language (ไทย/อังกฤษ) ด้วย i18n engine ที่เขียนเอง
- Dark/Light theme switch

**Backend** (แยก repository)
- Go (Golang) + [chi router](https://github.com/go-chi/chi)
- MySQL
- JWT authentication (access + refresh token)

## Features

- **สมัครสมาชิก / เข้าสู่ระบบ** — แยกสิทธิ์ผู้ใช้ทั่วไปและแอดมิน (role-based)
- **แดชบอร์ดสุขภาพ** — BMI, BMR, TDEE พร้อมเทียบผลกับครั้งล่าสุด และ gecko mascot ที่ขยับตำแหน่งตามการ์ดสถิติแบบไดนามิก
- **บันทึกอาหาร** — CRUD รายการอาหารต่อวัน พร้อมระบบ traffic-light (เขียว/เหลือง/แดง) ตามหมวดอาหาร
- **บันทึกกิจกรรม** — CRUD กิจกรรม/การออกกำลังกายต่อวัน
- **บันทึกการนอน** — CRUD ข้อมูลการนอน คำนวณคุณภาพการนอนฝั่ง server
- **โปรไฟล์** — แก้ไขข้อมูลส่วนตัว/ร่างกาย, เปลี่ยนรหัสผ่าน, สลับธีม, สลับภาษา
- **แผงแอดมิน** — จัดการหมวดอาหารและประเภทกิจกรรมในระบบ (CRUD)

## สถาปัตยกรรม

```
Browser (HTML/CSS/JS)
   │  fetch + JWT (Authorization: Bearer)
   ▼
Go REST API (chi router, /api/v1/*)
   │  database/sql
   ▼
MySQL
```

หน้าเว็บทุกหน้าเรียก API ผ่าน `SoyDeeAPI.request()` ตัวเดียว ซึ่งจัดการแนบ token, ต่อ query string, และ retry อัตโนมัติเมื่อ access token หมดอายุ (ใช้ refresh token แลก token ใหม่แบบโปร่งใสไม่ให้ผู้ใช้รู้ตัว) ถ้า refresh token ก็หมดอายุด้วยจะเคลียร์ session แล้วเด้งไปหน้า login ทันที

## จุดที่ท้าทาย

- **Auto token refresh แบบไม่ block UI** — คำขอที่โดน `401 TOKEN_EXPIRED` จะถูก refresh token แล้ว retry ให้อัตโนมัติแค่ครั้งเดียว โดยใช้ promise เดียวกันกันการยิง refresh ซ้ำซ้อนเวลามีหลาย request ค้างพร้อมกัน
- **Gecko mascot เดินตามการ์ด** — ตำแหน่งกิ้งก่าคำนวณใหม่ทุกครั้งที่ความกว้างการ์ดเปลี่ยนจากข้อมูลจริง (เช่น ความยาวชื่อ/ตัวเลขไม่เท่ากัน) ให้เดินตามขอบการ์ดได้แม่นยำโดยไม่ hardcode ตำแหน่ง
- **i18n โดยไม่ใช้ library** — เขียนเอนจินแปลภาษากลางที่ scan `data-i18n` ให้ใช้ร่วมกันได้ทุกหน้า โดยยังคงหน่วย/คำย่อเฉพาะทาง (BMI, BMR, kcal ฯลฯ) ไว้ไม่ให้ถูกแปลผิดความหมาย

## วิธีรันโปรเจค

**1) Backend** (repo แยก — ดู README ของ Soy-Dee_API)

```bash
go run ./cmd/api
```

ค่า default ของ API รันที่ `http://localhost:8080`

**2) Frontend**

เปิด `views/auth/welcome.html` ด้วย Live Server (VSCode extension) หรือ static server ใดก็ได้ เช่น:

```bash
npx serve .
```

> ต้องรัน backend ให้ทำงานอยู่ก่อน เพราะหน้าเว็บเรียก API ที่ `http://localhost:8080/api/v1` ตรงตามที่ตั้งไว้ใน `assets/js/shared/api.js`
