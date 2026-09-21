# Soy-Dee — Product Spec

## ทำอะไร (What)
เว็บแอปแบบ mobile-first สำหรับติดตามและประเมินพฤติกรรมสุขภาพส่วนบุคคล ให้ผู้ใช้บันทึก **อาหาร**, **กิจกรรม/ออกกำลังกาย**, และ **การนอน** รายวัน แล้วดูสรุปผลผ่านแดชบอร์ด (BMI, BMR, TDEE) ที่มี mascot กิ้งก่า (gecko) เดินไปมาตามการ์ดสถิติ

Repo นี้คือ **ฝั่ง Frontend เท่านั้น** — HTML/CSS/JS ล้วน ไม่มี framework ไม่มี build step คู่กับ Backend REST API แยก repository ชื่อ `Soy-Dee_API` (Go + MySQL)

## ทำไม (Why)
ช่วยให้ผู้ใช้ทั่วไปเห็นภาพรวมสุขภาพของตัวเอง (น้ำหนัก/ค่าดัชนีมวลกาย/พลังงานที่ใช้) แบบต่อเนื่องรายวัน แทนการจดแยกกันคนละที่ และให้ระบบช่วยประเมิน/แจ้งเตือนผ่านสี traffic-light (เขียว/เหลือง/แดง) ว่าพฤติกรรมวันนั้นอยู่ในเกณฑ์ไหน

## ทำที่ไหน (Where)
- **Frontend (repo นี้):** `C:\Users\acer\OneDrive - Rajamangala University of Technology Isan\Desktop\Mini-Project\Soy-Dee` — static site เปิดผ่าน Live Server/`npx serve`
- **Backend:** `C:\Users\acer\OneDrive - Rajamangala University of Technology Isan\Desktop\Mini-Project\Soy-Dee_API` — Go API รันที่ `http://localhost:8080`, ฐานข้อมูล MySQL
- Frontend เรียก backend ผ่าน `http://localhost:8080/api/v1` ตามที่ hardcode ไว้ใน [assets/js/shared/api.js:10](assets/js/shared/api.js#L10) — ต้องรันทั้งสองฝั่งพร้อมกันบนเครื่อง dev เดียวกัน

## ทำอย่างไร (How)

### Tech Stack
- HTML5 / CSS3 / Vanilla JavaScript (ES6+) — ไม่มี framework, ไม่มี bundler
- Fetch wrapper กลาง `SoyDeeAPI` ([assets/js/shared/api.js](assets/js/shared/api.js)) จัดการ JWT session, auto-refresh token, error handling ทุกหน้าใช้ตัวเดียวกัน
- i18n engine เขียนเอง ([assets/js/shared/i18n.js](assets/js/shared/i18n.js)) — สแกน `data-i18n` แปลไทย/อังกฤษ
- Dark/Light theme switch
- Backend: Go + chi router, MySQL, JWT (access + refresh token)

### สถาปัตยกรรม
```
Browser (HTML/CSS/JS)
   │  fetch + JWT (Authorization: Bearer)
   ▼
Go REST API (chi router, /api/v1/*)
   │  database/sql
   ▼
MySQL
```

### โครงสร้างไฟล์หลัก
```
index.html                          หน้า redirect เข้า views/auth/welcome.html
views/
  auth/    welcome.html, login.html, register.html
  user/    index.html (dashboard), food-record.html, activity-record.html,
           sleep-record.html, profile.html
  admin/   admin.html
assets/
  js/pages/    logic เฉพาะหน้า (1 ไฟล์ต่อ 1 หน้า)
  js/shared/   api.js, app.js, i18n.js, nav.js, datepicker.js — ใช้ร่วมกันทุกหน้า
  css/pages/   style เฉพาะหน้า
  css/shared/  style.css, nav.css, profile.css, datepicker.css
```

### กลไกสำคัญ
- **Auto token refresh แบบไม่ block UI** ([api.js:89-113](assets/js/shared/api.js#L89-L113)): request ที่โดน `401 TOKEN_EXPIRED` จะ refresh token แล้ว retry อัตโนมัติ 1 ครั้ง ใช้ promise เดียวกันกันการยิง refresh ซ้ำเวลามีหลาย request ค้างพร้อมกัน ถ้า refresh token หมดอายุด้วย จะ clear session แล้วเด้งไป login
- **Role-based guard** ([api.js:206-223](assets/js/shared/api.js#L206-L223)): `guardMember()` / `guardAdmin()` เรียกก่อน paint ในแต่ละหน้า เพื่อกันผู้ใช้ผิด role หลุดเข้าหน้าที่ไม่ใช่ของตัวเอง
- **Gecko mascot เดินตามการ์ด**: คำนวณตำแหน่งใหม่ทุกครั้งที่ความกว้างการ์ดเปลี่ยนจากข้อมูลจริง ไม่ hardcode ตำแหน่ง
- **Traffic-light อาหาร**: บันทึกอาหารต่อวันแยกตามหมวด ประเมินสีเขียว/เหลือง/แดงตามเกณฑ์หมวดอาหาร

### API endpoints ที่ frontend เรียกใช้ (อ้างอิงจาก `assets/js/pages/*.js`)
| Endpoint | Method | ใช้ที่ |
|---|---|---|
| `/auth/register` | POST | register.js |
| `/auth/login/member`, `/auth/login/admin` | POST | register.js, login.js |
| `/auth/refresh` | POST | api.js (internal) |
| `/auth/logout` | POST | api.js |
| `/members/:id/profile` | GET/PUT | profile.js, index.js |
| `/members/:id/body-stats`, `/body-stats/latest` | POST/GET | profile.js, index.js |
| `/members/:id/bmr/calculate`, `/bmr/history` | POST/GET | profile.js, index.js |
| `/members/:id/dashboard` | GET | index.js |
| `/members/:id/report?from&to` | GET | report.js (สรุปรายงานรายช่วงวัน ≤366 วัน: overview + body/food/activity/sleep) |
| `/members/:id/avatar` | POST (form-data) | profile.js |
| `/members/:id/password` | PUT | profile.js |
| `/members/:id/food-records` | GET/POST/PUT/DELETE | food-record.js |
| `/members/:id/activity-records` | GET/POST/PUT/DELETE | activity-record.js |
| `/members/:id/sleep-records` | GET/POST/PUT/DELETE | sleep-record.js |
| `/food-categories` | GET | food-record.js |
| `/activities` | GET | activity-record.js |
| `/admin/food-categories`, `/admin/activities` | GET/POST/PUT/DELETE | admin.js |

### วิธีรัน
```bash
# 1) Backend (repo แยก Soy-Dee_API)
go run ./cmd/api        # http://localhost:8080

# 2) Frontend (repo นี้)
npx serve .              # หรือเปิด views/auth/welcome.html ด้วย Live Server
```
ต้องรัน backend ก่อนเสมอ เพราะทุกหน้าเรียก API ผ่าน `http://localhost:8080/api/v1`

## ทำเมื่อไหร่ (When)
- เริ่มโปรเจค: commit แรก "Initial commit: Soy-Dee frontend" (2026-08-10 ตาม log)
- อยู่ระหว่างพัฒนาต่อเนื่อง (ดู `git log`/`git status` สำหรับสถานะล่าสุด — ไฟล์นี้เป็น snapshot ไม่ track การเปลี่ยนแปลงย้อนหลัง)

## ทำเพื่อใคร (Who)
- **ผู้ใช้ทั่วไป (member):** บันทึก/ดูข้อมูลสุขภาพของตัวเอง — อาหาร กิจกรรม การนอน โปรไฟล์
- **แอดมิน (admin):** จัดการหมวดอาหารและประเภทกิจกรรมในระบบผ่านแผงแอดมิน (CRUD)
- Role แยกสิทธิ์ตั้งแต่ตอน login/register — แต่ละ role มี guard และหน้า redirect ของตัวเอง (`guardMember` / `guardAdmin`)

## อื่นๆ
- **Multi-language:** ไทย/อังกฤษ ผ่าน i18n engine ที่เขียนเอง โดยคงหน่วย/คำย่อเฉพาะทาง (BMI, BMR, kcal) ไว้ไม่ให้แปลผิดความหมาย
- **Theme:** สลับ dark/light ได้จากหน้าโปรไฟล์
- **Session storage:** เก็บ token/role/user ใน `localStorage` (keys: `soydee_token`, `soydee_refresh_token`, `soydee_expires_at`, `soydee_role`, `soydee_user`)
- **ข้อจำกัดที่รู้อยู่แล้ว:** API base URL hardcode เป็น `localhost:8080` ใน [api.js:10](assets/js/shared/api.js#L10) — ต้องแก้ค่านี้เองถ้า deploy จริงหรือย้าย backend
