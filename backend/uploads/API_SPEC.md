# API_SPEC.md
## ระบบติดตามและประเมินพฤติกรรมสุขภาพส่วนบุคคล (Health Tracking Web App)
**Back-end:** Go 1.25.6 · **Database:** MySQL 10.4.32 · **รูปแบบ:** RESTful JSON API

เวอร์ชันเอกสาร: 1.0 · อัปเดตล่าสุดตามโครงสร้างฐานข้อมูล `Datasic.sql` (9 ตาราง) และ DFD Level 1 (8 กระบวนการ)

---

## 1. ภาพรวม (Overview)

| หัวข้อ | รายละเอียด |
|---|---|
| Base URL (dev) | `http://localhost:8080/api/v1` |
| รูปแบบข้อมูล | `application/json` (UTF-8) ทั้ง request/response |
| การยืนยันตัวตน | JWT Bearer Token ผ่าน header `Authorization: Bearer <token>` |
| รูปแบบวันที่ | `YYYY-MM-DD` (DATE), `YYYY-MM-DDTHH:mm:ssZ` (DATETIME/TIMESTAMP), `HH:mm:ss` (TIME) |
| การแบ่งหน้า | Query params `?page=1&limit=20` (ค่าเริ่มต้น limit=20, สูงสุด 100) |

### 1.1 บทบาทผู้ใช้ (Roles)
- **admin** — อ้างอิงตาราง `system_data` จัดการข้อมูลพื้นฐาน (ประเภทอาหาร/กิจกรรม) และดูรายงานภาพรวมทุกสมาชิก
- **member** — อ้างอิงตาราง `member_profile` ผู้ใช้งานทั่วไป บันทึกและดูข้อมูลสุขภาพของตนเอง

### 1.2 มาตรฐานรูปแบบ Response

**สำเร็จ:**
```json
{
  "success": true,
  "data": { },
  "message": "ดำเนินการสำเร็จ"
}
```

**ผิดพลาด:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "รายละเอียดข้อผิดพลาด"
  }
}
```

### 1.3 HTTP Status Code มาตรฐาน

| Code | ความหมาย |
|---|---|
| 200 OK | สำเร็จ (GET/PUT/PATCH/DELETE) |
| 201 Created | สร้างข้อมูลใหม่สำเร็จ (POST) |
| 400 Bad Request | ข้อมูลไม่ถูกต้อง/ไม่ครบ (validation) |
| 401 Unauthorized | ไม่ได้ล็อกอิน / token หมดอายุ / ไม่ถูกต้อง |
| 403 Forbidden | ไม่มีสิทธิ์เข้าถึง (เช่น member พยายามเข้าหน้า admin) |
| 404 Not Found | ไม่พบข้อมูล |
| 409 Conflict | ข้อมูลซ้ำ (เช่น username ซ้ำ) |
| 422 Unprocessable Entity | ข้อมูลถูกต้องตามรูปแบบแต่ตรรกะไม่ผ่าน |
| 500 Internal Server Error | ข้อผิดพลาดฝั่งเซิร์ฟเวอร์ |

### 1.4 รหัส Error มาตรฐาน (`error.code`)
`VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `DUPLICATE_USERNAME`, `INTERNAL_ERROR`

---

## 2. Mapping: กระบวนการ (DFD) → ตาราง → Endpoint Group

| # | กระบวนการ | ตารางหลักที่เกี่ยวข้อง | Endpoint Group |
|---|---|---|---|
| 1 | ตรวจสอบสิทธิ์ | `system_data`, `member_profile` | `/auth` |
| 2 | จัดการข้อมูลพื้นฐาน (Admin) | `food_category`, `activity_master` | `/admin/food-categories`, `/admin/activities` |
| 3 | ลงทะเบียน | `member_profile`, `member_body_stats` | `/auth/register` |
| 4 | คำนวณพลังงานพื้นฐาน | `member_bmr_history`, `member_body_stats` | `/members/{id}/bmr` |
| 5 | บันทึกการบริโภคอาหาร | `daily_food_record`, `food_category` | `/members/{id}/food-records` |
| 6 | บันทึกกิจกรรม/ออกกำลังกาย | `daily_activity_record`, `activity_master` | `/members/{id}/activity-records` |
| 7 | บันทึกพฤติกรรมการนอน | `daily_sleep_record` | `/members/{id}/sleep-records` |
| 8 | รายงานทั่วไป (Dashboard) | ทุกตาราง (aggregate) | `/members/{id}/dashboard`, `/admin/reports` |

---

## 3. กระบวนการที่ 1 — Authentication (`/auth`)

### 3.1 `POST /auth/login/member`
เข้าสู่ระบบสำหรับสมาชิกทั่วไป

**Request Body**
```json
{
  "username": "user_soydee",
  "password": "P@ssw0rd123"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "expires_in": 3600,
    "member": {
      "mb_id": 12,
      "mb_user_name": "user_soydee",
      "mb_full_name": "สมชาย ใจดี",
      "mb_gender": 1,
      "mb_profile_pic": "/uploads/profile/12.jpg"
    }
  },
  "message": "เข้าสู่ระบบสำเร็จ"
}
```
**Errors:** `400 VALIDATION_ERROR` (ขาด username/password) · `401 INVALID_CREDENTIALS`

### 3.2 `POST /auth/login/admin`
เข้าสู่ระบบสำหรับผู้ดูแลระบบ (อ้างอิง `system_data`)

**Request Body**
```json
{ "sys_username": "admin", "sys_password": "AdminP@ss1" }
```
**Response 200:** เหมือน 3.1 แต่ payload `admin: { sys_id, sys_username }` และ token มี claim `role: "admin"`

### 3.3 `POST /auth/logout`
🔒 ต้องมี token — เพิกถอน token ฝั่ง client (และ/หรือ blacklist ฝั่ง server)
**Response 200:** `{ "success": true, "message": "ออกจากระบบสำเร็จ" }`

### 3.4 `POST /auth/refresh`
ต่ออายุ token ด้วย refresh token
**Request:** `{ "refresh_token": "..." }` → **Response 200:** token ชุดใหม่

---

## 4. กระบวนการที่ 3 — Registration (`/auth/register`)

### 4.1 `POST /auth/register`
ลงทะเบียนสมาชิกใหม่ พร้อมข้อมูลกายภาพเบื้องต้น (เขียนลง `member_profile` และ `member_body_stats` ในธุรกรรมเดียวกัน)

**Request Body**
```json
{
  "mb_user_name": "user_soydee",
  "mb_password": "P@ssw0rd123",
  "mb_full_name": "สมชาย ใจดี",
  "mb_gender": 1,
  "mb_birth_date": "1998-08-08",
  "body_stats": {
    "mbs_weight": 68.5,
    "mbs_height": 172.0,
    "mbs_activity_level": 1.55,
    "mbs_target": 1
  }
}
```

**Validation Rules**
- `mb_user_name`: จำเป็น, unique, 4–100 ตัวอักษร
- `mb_password`: จำเป็น, ≥ 8 ตัวอักษร (จะถูก hash ด้วย bcrypt ก่อนบันทึกลง `mb_password_hash`)
- `mb_gender`: `1`=ชาย, `2`=หญิง
- `mbs_target`: `1`=ลดน้ำหนัก, `2`=เพิ่มกล้ามเนื้อ, `3`=รักษาน้ำหนัก

**Response 201**
```json
{
  "success": true,
  "data": { "mb_id": 12 },
  "message": "ลงทะเบียนสำเร็จ"
}
```
**Errors:** `400 VALIDATION_ERROR` · `409 DUPLICATE_USERNAME`

### 4.2 `GET /members/{id}/profile` 🔒
ดูข้อมูลโปรไฟล์สมาชิก (จับคู่หน้า `profile.html` แท็บ "บัญชี")

### 4.3 `PUT /members/{id}/profile` 🔒
แก้ไขข้อมูลโปรไฟล์ (`mb_full_name`, `mb_user_name`, `mb_gender`, `mb_birth_date`, `mb_profile_pic`)

### 4.4 `PATCH /members/{id}/password` 🔒
เปลี่ยนรหัสผ่าน (จับคู่ modal "เปลี่ยนรหัสผ่าน" ใน `profile.js`)

**Request Body**
```json
{ "current_password": "OldP@ss1", "new_password": "NewP@ss1", "confirm_password": "NewP@ss1" }
```
**Errors:** `400 VALIDATION_ERROR` (รหัสใหม่ไม่ตรงกัน) · `401 INVALID_CREDENTIALS` (รหัสเดิมผิด)

### 4.5 `POST /members/{id}/avatar` 🔒
อัปโหลดรูปโปรไฟล์ (`multipart/form-data`, field `avatar`) → คืน URL บันทึกลง `mb_profile_pic`

---

## 5. กระบวนการที่ 2 — จัดการข้อมูลพื้นฐาน (Admin Only 🔒👑)

### 5.1 ประเภทอาหาร `/admin/food-categories`
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/admin/food-categories` | รายการทั้งหมด (รองรับ `?traffic_light=1`) |
| GET | `/admin/food-categories/{id}` | รายละเอียดตาม `fd_id` |
| POST | `/admin/food-categories` | เพิ่มประเภทอาหารใหม่ |
| PUT | `/admin/food-categories/{id}` | แก้ไข |
| DELETE | `/admin/food-categories/{id}` | ลบ (ถูก block ถ้ามี `daily_food_record` อ้างอิงอยู่ → คืน `409 Conflict`) |

**Request Body (POST/PUT)**
```json
{
  "fd_name": "ผักและผลไม้",
  "fd_traffic_light": 1,
  "fd_images": "/uploads/food-category/veggie.png"
}
```
`fd_traffic_light`: `1`=เขียว, `2`=เหลือง, `3`=แดง

### 5.2 ประเภทกิจกรรม `/admin/activities`
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/admin/activities` | รายการทั้งหมด |
| GET | `/admin/activities/{id}` | รายละเอียดตาม `act_id` |
| POST | `/admin/activities` | เพิ่มกิจกรรมใหม่ |
| PUT | `/admin/activities/{id}` | แก้ไข |
| DELETE | `/admin/activities/{id}` | ลบ (block ถ้ามี `daily_activity_record` อ้างอิงอยู่) |

**Request Body (POST/PUT)**
```json
{
  "act_name": "วิ่งจ๊อกกิ้ง",
  "act_images": "/uploads/activity/jogging.png",
  "act_category": 1,
  "act_has_distance": true,
  "act_intensity": 3
}
```
> `act_category` (ไม่บังคับ): 1=คาร์ดิโอ 2=ฟิตเนส 3=กีฬา 4=กิจวัตรประจำวัน 5=อื่นๆ — หน้าเพิ่มรายการกิจกรรมของ member ใช้จัดกลุ่มตัวเลือก
> `act_has_distance` (ไม่บังคับ): `true` = กิจกรรมนี้บันทึกระยะทางได้ (หน้า member แสดงช่องระยะทาง)
> `act_intensity` (ไม่บังคับ): ระดับการใช้แรง 1=เบา 2=ปานกลาง 3=หนัก 4=หนักมาก — หน้าบันทึกกิจกรรมใช้กำหนดสีของกิจกรรม (เขียว/เหลือง/ส้ม/แดง)
> ถ้าไม่ส่ง: POST ใช้ค่าเริ่มต้น `5` / `false` / `2`, PUT คงค่าเดิมในฐานข้อมูล — ทั้งสามฟิลด์ถูกส่งกลับใน response ของ `GET /activities` และ `GET /admin/activities`

> หมายเหตุ: endpoint แบบ **read-only** (ไม่ต้อง admin) สำหรับให้หน้า member ดึงตัวเลือกไปใช้ตอนบันทึก คือ `GET /food-categories` และ `GET /activities` (ไม่มี prefix `/admin`) — ใช้ใน §7 และ §8

---

## 6. กระบวนการที่ 4 — คำนวณพลังงานพื้นฐาน (`/members/{id}/bmr`) 🔒

### 6.1 `POST /members/{id}/bmr/calculate`
รับข้อมูลกายภาพล่าสุด คำนวณ BMI, BMR (Mifflin-St Jeor), TDEE ฝั่ง Go แล้วบันทึกลง `member_bmr_history` (อ้างอิง `mbs_id` ล่าสุดหรือที่ระบุ)

**Request Body**
```json
{
  "mbs_id": 45,
  "mbh_record_date": "2026-08-09"
}
```

**Logic การคำนวณ (สรุป)**
- `BMI = weight(kg) / (height(m))^2`
- ผลประเมิน (`mbh_eval_result`): `1`=ผอม (BMI<18.5), `2`=ปกติ (18.5–22.9), `3`=ท้วม (23–24.9), `4`=อ้วน (≥25)
- `BMR` (Mifflin-St Jeor):
  - ชาย: `10×weight + 6.25×height - 5×age + 5`
  - หญิง: `10×weight + 6.25×height - 5×age - 161`
  - (`age` คำนวณจาก `mb_birth_date`)
- `TDEE = BMR × activity_level` (`mbs_activity_level` จาก `member_body_stats`)
- `TDEE เป้าหมาย` (`mbh_tdee_target`) ปรับตาม `mbs_target`: ลดน้ำหนัก → `TDEE - 500`, เพิ่มกล้ามเนื้อ → `TDEE + 300`, รักษาน้ำหนัก → `TDEE`

**Response 201**
```json
{
  "success": true,
  "data": {
    "mbh_id": 88,
    "mbh_bmi": 23.15,
    "mbh_eval_result": 3,
    "mbh_bmr": 1580.25,
    "mbh_tdee": 2449.39,
    "mbh_tdee_target": 1949.39
  },
  "message": "คำนวณสำเร็จ"
}
```
**Errors:** `422 Unprocessable Entity` (ไม่มีข้อมูล `member_body_stats` ให้คำนวณ)

### 6.2 `GET /members/{id}/bmr/history`
ประวัติการคำนวณทั้งหมด รองรับ `?from=YYYY-MM-DD&to=YYYY-MM-DD` และ pagination

### 6.3 `GET /members/{id}/bmr/latest`
ผลคำนวณล่าสุด (ใช้แสดงในหน้า BMI Gauge ของ dashboard)

### 6.4 Body Stats — `/members/{id}/body-stats`
| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/members/{id}/body-stats` | ประวัติน้ำหนัก/ส่วนสูงทั้งหมด |
| POST | `/members/{id}/body-stats` | เพิ่มบันทึกใหม่ (น้ำหนักอัปเดต ฯลฯ) |
| GET | `/members/{id}/body-stats/latest` | ค่าล่าสุด |

---

## 7. กระบวนการที่ 5 — บันทึกการบริโภคอาหาร (`/members/{id}/food-records`) 🔒

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/members/{id}/food-records?date=2026-08-09` | รายการอาหารตามวันที่ระบุ (default = วันนี้) |
| GET | `/members/{id}/food-records/{dfd_id}` | รายละเอียดรายการเดียว |
| POST | `/members/{id}/food-records` | เพิ่มบันทึกอาหาร |
| PUT | `/members/{id}/food-records/{dfd_id}` | แก้ไขบันทึก |
| DELETE | `/members/{id}/food-records/{dfd_id}` | ลบบันทึก |
| GET | `/food-categories` | ตัวเลือกประเภทอาหาร (dropdown) — read-only, ไม่ต้อง admin |

**Request Body (POST/PUT)**
```json
{
  "dfd_date": "2026-08-09",
  "dfd_time": "12:30:00",
  "dfd_meal_type": 2,
  "dfd_food_name": "ข้าวผัดกะเพราไก่ไข่ดาว",
  "dfd_image": "/uploads/food/2026-08-09-001.jpg",
  "fd_id": 3
}
```
`dfd_meal_type`: `1`=มื้อเช้า, `2`=มื้อกลางวัน, `3`=มื้อเย็น, `4`=มื้อว่าง

**Response 201**
```json
{ "success": true, "data": { "dfd_id": 301 }, "message": "บันทึกอาหารสำเร็จ" }
```

---

## 8. กระบวนการที่ 6 — บันทึกกิจกรรม/ออกกำลังกาย (`/members/{id}/activity-records`) 🔒

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/members/{id}/activity-records?date=2026-08-09` | รายการกิจกรรมตามวันที่ |
| GET | `/members/{id}/activity-records/{dact_id}` | รายละเอียดรายการเดียว |
| POST | `/members/{id}/activity-records` | เพิ่มบันทึกกิจกรรม |
| PUT | `/members/{id}/activity-records/{dact_id}` | แก้ไขบันทึก |
| DELETE | `/members/{id}/activity-records/{dact_id}` | ลบบันทึก |
| GET | `/activities` | ตัวเลือกประเภทกิจกรรม (dropdown) — read-only |

**Request Body (POST/PUT)**
```json
{
  "dact_date": "2026-08-09",
  "dact_duration_min": 45,
  "dact_distance_km": 5.25,
  "act_id": 5
}
```
> `dact_distance_km` (ไม่บังคับ, `DECIMAL(6,2)` หน่วยกิโลเมตร, 0.01–999.99, ส่ง `null` หรือไม่ส่งได้) — รับได้เฉพาะกิจกรรมที่ `act_has_distance = true`; กิจกรรมอื่นที่ส่งค่ามา → `400` และ `act_id` ที่ไม่มีอยู่ → `400`
> `dact_duration_min` เป็นชนิด `INT` ตามสคีมาจริง (ไม่ใช่ `TIME` ตามที่เอกสารเวอร์ชันก่อนหน้าระบุผิด) — ส่งเป็นจำนวนนาทีตรงๆ (เช่น 45 นาที = `45`)

**Response 201**
```json
{ "success": true, "data": { "dact_id": 152 }, "message": "บันทึกกิจกรรมสำเร็จ" }
```

---

## 9. กระบวนการที่ 7 — บันทึกพฤติกรรมการนอนหลับ (`/members/{id}/sleep-records`) 🔒

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/members/{id}/sleep-records?date=2026-08-09` | บันทึกการนอนตามวันที่ |
| GET | `/members/{id}/sleep-records/{dslp_id}` | รายละเอียดรายการเดียว |
| POST | `/members/{id}/sleep-records` | เพิ่มบันทึกการนอน (คำนวณชั่วโมงรวม+คุณภาพฝั่ง Go) |
| PUT | `/members/{id}/sleep-records/{dslp_id}` | แก้ไขบันทึก |
| DELETE | `/members/{id}/sleep-records/{dslp_id}` | ลบบันทึก |

**Request Body (POST/PUT)**
```json
{
  "dslp_date": "2026-08-09",
  "dslp_start_time": "2026-08-08T23:30:00Z",
  "dslp_end_time": "2026-08-09T06:45:00Z"
}
```

**Logic การประเมิน (คำนวณฝั่ง Go ก่อนบันทึก)**
- `dslp_total_hours = end_time - start_time` (ชั่วโมง, ทศนิยม 2 ตำแหน่ง)
- `dslp_eval_result`: `1`=น้อยไป (< 6 ชม.), `2`=พอดี (6–9 ชม.), `3`=มากไป (> 9 ชม.)
- `dslp_quality_score`: `1`=แย่ (<5 ชม. หรือ >10 ชม.), `2`=ปานกลาง (5–6 หรือ 9–10 ชม.), `3`=ดี (6–9 ชม.)

**Response 201**
```json
{
  "success": true,
  "data": {
    "dslp_id": 77,
    "dslp_total_hours": 7.25,
    "dslp_eval_result": 2,
    "dslp_quality_score": 3
  },
  "message": "บันทึกข้อมูลการนอนสำเร็จ"
}
```

---

## 10. กระบวนการที่ 8 — รายงานทั่วไป / Dashboard

### 10.1 `GET /members/{id}/dashboard` 🔒
สรุปภาพรวมสุขภาพสำหรับหน้า Dashboard ของสมาชิก (ค่า BMI ล่าสุด, พลังงานเข้า/ออกวันนี้, สรุปการนอนคืนล่าสุด, สรุปกิจกรรม 7 วันย้อนหลัง)

**Response 200**
```json
{
  "success": true,
  "data": {
    "latest_bmi": { "value": 23.15, "eval_result": 3 },
    "latest_bmr": { "bmr": 1580.25, "tdee": 2449.39, "tdee_target": 1949.39 },
    "today_food_summary": { "meal_count": 3, "by_traffic_light": { "green": 2, "yellow": 1, "red": 0 } },
    "today_activity_summary": { "activity_count": 1, "total_duration_min": 45 },
    "last_sleep": { "date": "2026-08-09", "total_hours": 7.25, "quality_score": 3 },
    "weekly_activity_minutes": [30, 0, 45, 60, 0, 20, 45]
  },
  "message": "ดึงข้อมูลสรุปสำเร็จ"
}
```

### 10.2 `GET /admin/reports` 🔒👑
รายงานตามเงื่อนไขสำหรับผู้ดูแลระบบ

**Query Parameters**
| พารามิเตอร์ | คำอธิบาย |
|---|---|
| `type` | `food` \| `activity` \| `sleep` \| `bmi` \| `members` (จำเป็น) |
| `from`, `to` | ช่วงวันที่ `YYYY-MM-DD` |
| `mb_id` | กรองเฉพาะสมาชิกรายบุคคล (ไม่ระบุ = ทุกคน) |
| `page`, `limit` | การแบ่งหน้า |

**ตัวอย่าง** `GET /admin/reports?type=bmi&from=2026-08-01&to=2026-08-09`
```json
{
  "success": true,
  "data": {
    "type": "bmi",
    "range": { "from": "2026-08-01", "to": "2026-08-09" },
    "summary": { "ผอม": 5, "ปกติ": 40, "ท้วม": 12, "อ้วน": 8 },
    "items": [
      { "mb_id": 12, "mb_full_name": "สมชาย ใจดี", "mbh_bmi": 23.15, "mbh_eval_result": 3, "mbh_record_date": "2026-08-09" }
    ]
  },
  "message": "ดึงรายงานสำเร็จ"
}
```

### 10.3 `GET /admin/members` 🔒👑
รายชื่อสมาชิกทั้งหมดพร้อมสถานะล่าสุด (ค้นหาด้วย `?search=`, แบ่งหน้าได้)

### 10.4 `GET /admin/members/{id}` 🔒👑
รายละเอียดสมาชิกรายบุคคล (ใช้ดูประวัติทุกด้านจากฝั่ง admin)

---

## 11. สรุปตาราง Endpoint ทั้งหมด

| Method | Endpoint | สิทธิ์ | กระบวนการ |
|---|---|---|---|
| POST | `/auth/login/member` | Public | 1 |
| POST | `/auth/login/admin` | Public | 1 |
| POST | `/auth/logout` | 🔒 | 1 |
| POST | `/auth/refresh` | 🔒 | 1 |
| POST | `/auth/register` | Public | 3 |
| GET/PUT | `/members/{id}/profile` | 🔒 | 3 |
| PATCH | `/members/{id}/password` | 🔒 | 3 |
| POST | `/members/{id}/avatar` | 🔒 | 3 |
| GET/POST/PUT/DELETE | `/admin/food-categories[/{id}]` | 🔒👑 | 2 |
| GET/POST/PUT/DELETE | `/admin/activities[/{id}]` | 🔒👑 | 2 |
| GET | `/food-categories`, `/activities` | 🔒 | 5, 6 |
| GET/POST | `/members/{id}/body-stats[/latest]` | 🔒 | 4 |
| POST | `/members/{id}/bmr/calculate` | 🔒 | 4 |
| GET | `/members/{id}/bmr/history`, `/bmr/latest` | 🔒 | 4 |
| GET/POST/PUT/DELETE | `/members/{id}/food-records[/{id}]` | 🔒 | 5 |
| GET/POST/PUT/DELETE | `/members/{id}/activity-records[/{id}]` | 🔒 | 6 |
| GET/POST/PUT/DELETE | `/members/{id}/sleep-records[/{id}]` | 🔒 | 7 |
| GET | `/members/{id}/dashboard` | 🔒 | 8 |
| GET | `/admin/reports` | 🔒👑 | 8 |
| GET | `/admin/members[/{id}]` | 🔒👑 | 8 |

🔒 = ต้องแนบ JWT (member หรือ admin) · 🔒👑 = ต้องเป็น role admin เท่านั้น

---

## 12. Authorization & Access Rules

1. Endpoint ภายใต้ `/members/{id}/...` ตรวจสอบว่า `id` ใน path ต้องตรงกับ `mb_id` ใน JWT claim ของผู้ที่ล็อกอินอยู่ (ยกเว้น role `admin` ที่เข้าดูข้อมูลสมาชิกใดก็ได้ผ่าน `/admin/members/{id}`) — ไม่ตรง → `403 FORBIDDEN`
2. Endpoint ภายใต้ `/admin/...` ต้องมี JWT claim `role: "admin"` เท่านั้น — ไม่ใช่ → `403 FORBIDDEN`
3. Token หมดอายุ → `401 TOKEN_EXPIRED`, ต้องเรียก `/auth/refresh` หรือ login ใหม่

## 13. หมายเหตุการออกแบบ (Design Notes)

- ทุก endpoint ที่ "แก้ไข/ลบ" ระเบียนของสมาชิก ต้องตรวจสอบ ownership (`mb_id`) ก่อนเสมอ เพื่อกันสมาชิกคนอื่นเข้าถึงข้อมูลข้ามบัญชี
- ฟิลด์คำนวณทั้งหมด (BMI, BMR, TDEE, ชั่วโมงนอน, คุณภาพการนอน) **คำนวณฝั่ง Go เท่านั้น** ห้าม client ส่งค่าที่คำนวณแล้วมาบันทึกตรงๆ เพื่อความถูกต้องของข้อมูล
- `dact_duration_min` เป็น `INT` ในสคีมาจริง (ตรวจสอบแล้วกับฐานข้อมูล) — ส่ง/รับเป็นจำนวนนาทีตรงๆ ทั้ง request และ response's `duration_minutes`
- `fd_id` ใน `daily_food_record` เป็น nullable (`ON DELETE SET NULL`) — รองรับกรณีลบประเภทอาหารออกจากระบบ แต่ยังคงประวัติการกินไว้
- แนะนำ rate limiting บน `/auth/login/*` เพื่อป้องกัน brute-force (ไม่ได้ระบุใน schema แต่เป็น best practice)
