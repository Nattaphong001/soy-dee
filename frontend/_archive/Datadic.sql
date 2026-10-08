-- ==============================================================================
-- Database Schema for Health & Fitness Tracking System (Soy-Dee)
-- ยึดโครงสร้างตาม Data Dictionary ล่าสุด — ฉบับแก้ไข v2
--
-- แก้ไขจากต้นฉบับ Datasic.sql โดยเทียบกับฐานข้อมูลจริง (soydee, MariaDB 10.4.32)
-- รายการที่แก้:
--   1) dact_duration_min: TIME → INT (หน่วยนาที) ให้ตรงกับฐานข้อมูลจริงและการใช้งานจริง
--   2) เพิ่มคอลัมน์ dact_detail (มีอยู่จริงในฐานข้อมูล แต่ไม่เคยถูกบันทึกใน Data Dictionary เดิม)
--   3) เพิ่มคอลัมน์ dfd_amount (มีอยู่จริงในฐานข้อมูล แต่ไม่เคยถูกบันทึกใน Data Dictionary เดิม)
--   4) dslp_eval_result: VARCHAR(20) → TINYINT(1) ให้ตรงกับฐานข้อมูลจริงและความหมาย 1/2/3
--   5) เพิ่ม CHARACTER SET utf8mb4 / COLLATE utf8mb4_unicode_ci ทุกตาราง (กันข้อความไทยเพี้ยน)
--   6) เพิ่ม UNIQUE KEY บนชื่อผู้ใช้งาน (member_profile, system_data) ตามที่ใช้งานจริง
--   7) เพิ่ม ON UPDATE CASCADE ให้ทุก Foreign Key ให้ตรงกับฐานข้อมูลจริง
--   8) แก้คำอธิบาย mbs_activity_level ให้ตรงความหมายจริง (ตัวคูณ TDEE ไม่ใช่ความถี่ต่อสัปดาห์)
--   9) เพิ่ม CHECK constraint ป้องกันค่านอกช่วงตามพจนานุกรมค่าคงที่ของระบบ
--   10) เพิ่ม UNIQUE(mb_id, dslp_date) บน daily_sleep_record — นโยบาย 1 วัน 1 แถว
--       (ฝั่ง Go: หน้าจอต้องเรียก PUT แทน POST ถ้าวันนั้นมีบันทึกอยู่แล้ว)
-- ==============================================================================

-- --------------------------------------------------------
-- 1. ตารางข้อมูลผู้ดูแลระบบ (System Data)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_data (
    sys_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสข้อมูลผู้ดูแลระบบ',
    sys_username VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (ต้องไม่ซ้ำ)',
    sys_password VARCHAR(255) NOT NULL COMMENT 'รหัสผ่าน (จัดเก็บแบบเข้ารหัส เช่น bcrypt)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้างบัญชี',
    UNIQUE KEY uq_sys_username (sys_username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางเก็บข้อมูลบัญชีผู้ดูแลระบบ';

-- --------------------------------------------------------
-- 2. ตารางข้อมูลสมาชิก (member_profile)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_profile (
    mb_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสสมาชิก',
    mb_user_name VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (ต้องไม่ซ้ำ)',
    mb_password_hash VARCHAR(255) NOT NULL COMMENT 'รหัสผ่านที่เข้ารหัสแล้ว',
    mb_gender TINYINT COMMENT 'เพศ (1=ชาย, 2=หญิง)',
    mb_full_name VARCHAR(100) NOT NULL COMMENT 'ชื่อ-สกุล',
    mb_birth_date DATE COMMENT 'วัน เดือน ปีเกิด',
    mb_profile_pic VARCHAR(255) COMMENT 'รูปโปรไฟล์',
    mb_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สมัครสมาชิก',
    mb_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขข้อมูลล่าสุด',
    UNIQUE KEY uq_mb_user_name (mb_user_name),
    CONSTRAINT chk_mb_gender CHECK (mb_gender IN (1,2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางเก็บข้อมูลโปรไฟล์สมาชิกทั่วไป';

-- --------------------------------------------------------
-- 3. ตารางประเภทอาหาร (food_category)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_category (
    fd_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสประเภทอาหาร',
    fd_name VARCHAR(100) NOT NULL COMMENT 'ชื่อประเภท',
    fd_traffic_light TINYINT NOT NULL DEFAULT 2 COMMENT 'เกณฑ์สีโภชนาการ (1=เขียว, 2=เหลือง, 3=แดง)',
    fd_images VARCHAR(255) COMMENT 'รูปภาพประเภทอาหาร',
    CONSTRAINT chk_fd_light CHECK (fd_traffic_light IN (1,2,3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางข้อมูลหลัก (Master) ประเภทอาหารและเกณฑ์สีโภชนาการ';

-- --------------------------------------------------------
-- 4. ตารางประเภทกิจกรรม (activity_master)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_master (
    act_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสประเภทกิจกรรม',
    act_name VARCHAR(100) NOT NULL COMMENT 'ชื่อกิจกรรม',
    act_images VARCHAR(255) COMMENT 'รูปภาพประเภทกิจกรรม'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางข้อมูลหลัก (Master) ประเภทกิจกรรมออกกำลังกาย';

-- --------------------------------------------------------
-- 5. ตารางประวัติร่างกายผู้ใช้ (member_body_stats)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_body_stats (
    mbs_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสประวัติร่างกายผู้ใช้',
    mbs_weight DECIMAL(5,2) COMMENT 'น้ำหนัก (กก.)',
    mbs_height DECIMAL(5,2) COMMENT 'ส่วนสูง (ซม.)',
    mbs_activity_level DECIMAL(3,2) COMMENT 'ค่าคูณระดับกิจกรรม สำหรับคำนวณ TDEE (เช่น 1.20-1.90)',
    mbs_target TINYINT COMMENT 'เป้าหมาย (1=ลดน้ำหนัก, 2=เพิ่มกล้ามเนื้อ, 3=รักษาน้ำหนัก)',
    mbs_recorded_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกข้อมูล',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก',
    FOREIGN KEY (mb_id) REFERENCES member_profile(mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_mbs_target CHECK (mbs_target IN (1,2,3)),
    CONSTRAINT chk_mbs_weight CHECK (mbs_weight > 0 AND mbs_weight < 400),
    CONSTRAINT chk_mbs_height CHECK (mbs_height > 50 AND mbs_height < 300)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางประวัติข้อมูลร่างกายของผู้ใช้ (น้ำหนัก/ส่วนสูง/เป้าหมาย)';

-- --------------------------------------------------------
-- 6. ตารางประวัติพลังงานพื้นฐานผู้ใช้ (member_bmr_history)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_bmr_history (
    mbh_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสประวัติพลังงานพื้นฐานผู้ใช้',
    mbh_record_date DATE NOT NULL COMMENT 'วันที่บันทึกและวิเคราะห์',
    mbh_bmi DECIMAL(4,2) COMMENT 'ค่าดัชนีมวลกาย',
    mbh_eval_result TINYINT COMMENT 'ผลประเมินเกณฑ์ BMI (1=ผอม, 2=ปกติ, 3=ท้วม, 4=อ้วน)',
    mbh_bmr DECIMAL(7,2) COMMENT 'ค่าอัตราการเผาผลาญพื้นฐาน',
    mbh_tdee DECIMAL(7,2) COMMENT 'พลังงานรวมที่ร่างกายเผาผลาญต่อวัน',
    mbh_tdee_target DECIMAL(7,2) COMMENT 'พลังงานเป้าหมายรวมที่ร่างกายเผาผลาญต่อวัน',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก',
    mbs_id INT NOT NULL COMMENT 'รหัสประวัติร่างกายผู้ใช้',
    FOREIGN KEY (mb_id) REFERENCES member_profile(mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (mbs_id) REFERENCES member_body_stats(mbs_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_mbh_eval CHECK (mbh_eval_result IN (1,2,3,4))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางประวัติผลการคำนวณ BMI/BMR/TDEE ของผู้ใช้';

-- --------------------------------------------------------
-- 7. ตารางข้อมูลอาหารประจําวัน (daily_food_record)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_food_record (
    dfd_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสบันทึกอาหารประจำวัน',
    dfd_date DATE NOT NULL COMMENT 'วันที่บันทึก',
    dfd_time TIME NOT NULL COMMENT 'เวลาที่กิน',
    dfd_meal_type TINYINT COMMENT 'มื้ออาหาร (1=มื้อเช้า, 2=มื้อกลางวัน, 3=มื้อเย็น, 4=มื้อว่าง)',
    dfd_food_name VARCHAR(100) COMMENT 'ชื่ออาหาร',
    dfd_amount VARCHAR(50) COMMENT 'ปริมาณ/จำนวนที่กิน เช่น 1 จาน, 200 กรัม',
    dfd_image VARCHAR(255) COMMENT 'รูปภาพอาหาร',
    dfd_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่บันทึกรายการ',
    dfd_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขข้อมูลล่าสุด',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก',
    fd_id INT COMMENT 'รหัสประเภทอาหาร',
    FOREIGN KEY (mb_id) REFERENCES member_profile(mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (fd_id) REFERENCES food_category(fd_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_dfd_meal CHECK (dfd_meal_type IN (1,2,3,4)),
    KEY idx_dfd_mb_date (mb_id, dfd_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางบันทึกการบริโภคอาหารประจำวันของสมาชิก';

-- --------------------------------------------------------
-- 8. ข้อมูลกิจกรรมประจําวัน (daily_activity_record)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_activity_record (
    dact_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสบันทึกกิจกรรมประจำวัน',
    dact_date DATE NOT NULL COMMENT 'วันที่ทำกิจกรรม',
    dact_duration_min INT COMMENT 'ระยะเวลาที่ทำกิจกรรม (หน่วยนาที)',
    dact_detail VARCHAR(255) COMMENT 'รายละเอียดกิจกรรมที่ผู้ใช้กรอกเพิ่ม เช่น วิ่ง 5 กม.',
    dact_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกรายการ',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก',
    act_id INT NOT NULL COMMENT 'รหัสประเภทกิจกรรม',
    FOREIGN KEY (mb_id) REFERENCES member_profile(mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (act_id) REFERENCES activity_master(act_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_dact_duration CHECK (dact_duration_min > 0 AND dact_duration_min <= 1440),
    KEY idx_dact_mb_date (mb_id, dact_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางบันทึกการทำกิจกรรม/ออกกำลังกายประจำวันของสมาชิก';

-- --------------------------------------------------------
-- 9. ข้อมูลการนอนหลับประจําวัน (daily_sleep_record)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_sleep_record (
    dslp_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสบันทึกการนอนหลับ',
    dslp_date DATE NOT NULL COMMENT 'วันที่บันทึกการนอน',
    dslp_start_time DATETIME NOT NULL COMMENT 'วันและเวลาที่เริ่มนอน',
    dslp_end_time DATETIME NOT NULL COMMENT 'วันและเวลาที่ตื่นนอน',
    dslp_total_hours DECIMAL(4,2) COMMENT 'จำนวนชั่วโมงที่นอนหลับรวม (คำนวณฝั่งเซิร์ฟเวอร์จาก start/end เท่านั้น)',
    dslp_eval_result TINYINT(1) COMMENT 'ผลประเมินการนอน คำนวณโดยระบบจากจำนวนชั่วโมง (1=น้อยไป <7ชม., 2=พอดี 7-9ชม., 3=มากไป >9ชม.)',
    dslp_quality_score TINYINT COMMENT 'ประเมินคุณภาพการนอน ผู้ใช้เลือกเอง (1=แย่, 2=ปานกลาง, 3=ดี)',
    dslp_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกรายการ',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก',
    FOREIGN KEY (mb_id) REFERENCES member_profile(mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_dslp_order CHECK (dslp_end_time > dslp_start_time),
    CONSTRAINT chk_dslp_hours CHECK (dslp_total_hours > 0 AND dslp_total_hours <= 24),
    CONSTRAINT chk_dslp_eval CHECK (dslp_eval_result IN (1,2,3)),
    CONSTRAINT chk_dslp_quality CHECK (dslp_quality_score IN (1,2,3)),
    UNIQUE KEY uq_dslp_mb_date (mb_id, dslp_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางบันทึกพฤติกรรมการนอนหลับประจำวันของสมาชิก';