-- ==============================================================================
-- Database Schema for Health & Fitness Tracking System (Soy-Dee)
-- ยึดโครงสร้างตาม Data Dictionary ล่าสุด (Datadic.sql) — sync ให้ตรงกับฐานข้อมูล
-- จริง (soydee, MariaDB 10.4.32) 100% ทั้ง type / charset / index / constraint
-- ณ วันที่ 2026-08-25 (ผ่าน migration_fix.sql PART B + การแก้ไขระหว่างงานตรวจ
-- SOYDEE_AI_TASK.md ทั้งหมดแล้ว) — รันไฟล์นี้ไฟล์เดียวบน DB ว่างได้ผลลัพธ์เดียว
-- กับ DB ที่ใช้งานอยู่ตอนนี้เป๊ะ ไม่ต้องพึ่ง 0002_add_food_record_amount.sql อีก
-- (ถูกพับรวมเข้ามาที่นี่แล้ว ไฟล์นั้นลบทิ้งได้)
-- ==============================================================================

-- --------------------------------------------------------
-- 1. ตารางข้อมูลผู้ดูแลระบบ (System Data)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_data (
    sys_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสผู้ดูแลระบบ (Primary Key)',
    sys_username VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (ต้องไม่ซ้ำ)',
    sys_full_name VARCHAR(100) NULL COMMENT 'ชื่อที่แสดงของผู้ดูแลระบบ',
    sys_avatar_pic VARCHAR(255) NULL COMMENT 'พาธรูปโปรไฟล์ของผู้ดูแลระบบ',
    sys_password VARCHAR(255) NOT NULL COMMENT 'รหัสผ่าน (จัดเก็บแบบเข้ารหัส เช่น bcrypt)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้างบัญชีผู้ดูแลระบบ',
    UNIQUE KEY uq_sys_username (sys_username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางเก็บข้อมูลบัญชีผู้ดูแลระบบ';

-- --------------------------------------------------------
-- 2. ตารางข้อมูลสมาชิก (member_profile)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_profile (
    mb_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสสมาชิก (Primary Key)',
    mb_user_name VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (ต้องไม่ซ้ำ)',
    mb_password_hash VARCHAR(255) NOT NULL COMMENT 'รหัสผ่านที่เข้ารหัสแล้ว',
    mb_full_name VARCHAR(100) NOT NULL COMMENT 'ชื่อ-นามสกุลจริงของสมาชิก',
    mb_gender TINYINT(1) DEFAULT NULL COMMENT 'เพศ (1=ชาย, 2=หญิง)',
    mb_birth_date DATE DEFAULT NULL COMMENT 'วันเดือนปีเกิด',
    mb_profile_pic VARCHAR(255) DEFAULT NULL COMMENT 'พาธ/ชื่อไฟล์รูปโปรไฟล์',
    mb_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สมัครสมาชิก',
    mb_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขข้อมูลล่าสุด',
    UNIQUE KEY uq_mb_user_name (mb_user_name),
    CONSTRAINT chk_mb_gender CHECK (mb_gender IN (1,2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางเก็บข้อมูลโปรไฟล์สมาชิกทั่วไป';

-- --------------------------------------------------------
-- 3. ตารางประเภทอาหาร (food_category)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_category (
    fd_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสประเภทอาหาร (Primary Key)',
    fd_name VARCHAR(100) NOT NULL COMMENT 'ชื่อประเภทอาหาร',
    fd_traffic_light TINYINT(1) NOT NULL DEFAULT 2 COMMENT 'เกณฑ์สีโภชนาการ (1=เขียว, 2=เหลือง, 3=แดง)',
    fd_images VARCHAR(255) DEFAULT NULL COMMENT 'พาธ/ชื่อไฟล์รูปประเภทอาหาร',
    CONSTRAINT chk_fd_light CHECK (fd_traffic_light IN (1,2,3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางข้อมูลหลัก (Master) ประเภทอาหารและเกณฑ์สีโภชนาการ';

-- --------------------------------------------------------
-- 4. ตารางประเภทกิจกรรม (activity_master)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_master (
    act_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสประเภทกิจกรรม (Primary Key)',
    act_name VARCHAR(100) NOT NULL COMMENT 'ชื่อประเภทกิจกรรม',
    act_images VARCHAR(255) DEFAULT NULL COMMENT 'พาธ/ชื่อไฟล์รูปประเภทกิจกรรม'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางข้อมูลหลัก (Master) ประเภทกิจกรรมออกกำลังกาย';

-- --------------------------------------------------------
-- 5. ตารางประวัติร่างกายผู้ใช้ (member_body_stats)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_body_stats (
    mbs_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสประวัติร่างกายของผู้ใช้ (Primary Key)',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
    mbs_weight DECIMAL(5,2) DEFAULT NULL COMMENT 'น้ำหนัก (กก.)',
    mbs_height DECIMAL(5,2) DEFAULT NULL COMMENT 'ส่วนสูง (ซม.)',
    mbs_activity_level DECIMAL(3,2) DEFAULT NULL COMMENT 'ค่าคูณระดับกิจกรรม สำหรับคำนวณ TDEE (เช่น 1.20-1.90)',
    mbs_target TINYINT(1) DEFAULT NULL COMMENT 'เป้าหมาย (1=ลดน้ำหนัก, 2=เพิ่มกล้ามเนื้อ, 3=รักษาน้ำหนัก)',
    mbs_recorded_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกข้อมูล',
    CONSTRAINT fk_mbs_mb_id FOREIGN KEY (mb_id) REFERENCES member_profile (mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_mbs_mb_date (mb_id, mbs_recorded_date),
    CONSTRAINT chk_mbs_target CHECK (mbs_target IN (1,2,3)),
    CONSTRAINT chk_mbs_weight CHECK (mbs_weight > 0 AND mbs_weight < 400),
    CONSTRAINT chk_mbs_height CHECK (mbs_height > 50 AND mbs_height < 300)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางประวัติข้อมูลร่างกายของผู้ใช้ (น้ำหนัก/ส่วนสูง/เป้าหมาย)';

-- --------------------------------------------------------
-- 6. ตารางประวัติพลังงานพื้นฐานผู้ใช้ (member_bmr_history)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_bmr_history (
    mbh_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสประวัติการคำนวณพลังงานของผู้ใช้ (Primary Key)',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
    mbs_id INT NOT NULL COMMENT 'รหัสประวัติร่างกายที่ใช้คำนวณ (Foreign Key -> member_body_stats)',
    mbh_record_date DATE NOT NULL COMMENT 'วันที่คำนวณและวิเคราะห์ผล',
    mbh_bmi DECIMAL(4,2) DEFAULT NULL COMMENT 'ค่าดัชนีมวลกาย (BMI)',
    mbh_eval_result TINYINT(1) DEFAULT NULL COMMENT 'ผลประเมินเกณฑ์ BMI (1=ผอม, 2=ปกติ, 3=ท้วม, 4=อ้วน)',
    mbh_bmr DECIMAL(7,2) DEFAULT NULL COMMENT 'ค่าอัตราการเผาผลาญพลังงานพื้นฐาน (BMR)',
    mbh_tdee DECIMAL(7,2) DEFAULT NULL COMMENT 'พลังงานที่ร่างกายใช้ทั้งหมดต่อวัน (TDEE)',
    mbh_tdee_target DECIMAL(7,2) DEFAULT NULL COMMENT 'พลังงานเป้าหมายต่อวัน ตามเป้าหมายของผู้ใช้',
    CONSTRAINT fk_mbh_mb_id FOREIGN KEY (mb_id) REFERENCES member_profile (mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_mbh_mbs_id FOREIGN KEY (mbs_id) REFERENCES member_body_stats (mbs_id) ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_mbh_mb_date (mb_id, mbh_record_date),
    CONSTRAINT chk_mbh_eval CHECK (mbh_eval_result IN (1,2,3,4))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางประวัติผลการคำนวณ BMI/BMR/TDEE ของผู้ใช้';

-- --------------------------------------------------------
-- 7. ตารางข้อมูลอาหารประจําวัน (daily_food_record)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_food_record (
    dfd_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสบันทึกอาหารประจำวัน (Primary Key)',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
    fd_id INT DEFAULT NULL COMMENT 'รหัสประเภทอาหาร (Foreign Key -> food_category)',
    dfd_date DATE NOT NULL COMMENT 'วันที่บันทึก',
    dfd_time TIME NOT NULL COMMENT 'เวลาที่กิน',
    dfd_meal_type TINYINT(1) DEFAULT NULL COMMENT 'มื้ออาหาร (1=เช้า, 2=กลางวัน, 3=เย็น, 4=ว่าง)',
    dfd_food_name VARCHAR(100) DEFAULT NULL COMMENT 'ชื่ออาหารที่บันทึก',
    dfd_amount VARCHAR(50) DEFAULT NULL COMMENT 'ปริมาณ/จำนวนที่กิน เช่น 1 จาน, 200 กรัม',
    dfd_image VARCHAR(255) DEFAULT NULL COMMENT 'พาธ/ชื่อไฟล์รูปอาหาร',
    dfd_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่บันทึกรายการ',
    dfd_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขข้อมูลล่าสุด',
    CONSTRAINT fk_dfd_mb_id FOREIGN KEY (mb_id) REFERENCES member_profile (mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dfd_fd_id FOREIGN KEY (fd_id) REFERENCES food_category (fd_id) ON DELETE SET NULL ON UPDATE CASCADE,
    KEY idx_dfd_mb_date (mb_id, dfd_date),
    CONSTRAINT chk_dfd_meal CHECK (dfd_meal_type IN (1,2,3,4))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางบันทึกการบริโภคอาหารประจำวันของสมาชิก';

-- --------------------------------------------------------
-- 8. ข้อมูลกิจกรรมประจําวัน (daily_activity_record)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_activity_record (
    dact_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสบันทึกกิจกรรมประจำวัน (Primary Key)',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
    act_id INT NOT NULL COMMENT 'รหัสประเภทกิจกรรม (Foreign Key -> activity_master)',
    dact_detail VARCHAR(255) DEFAULT NULL COMMENT 'รายละเอียดกิจกรรมที่ผู้ใช้กรอกเพิ่ม (เช่น วิ่ง 5 กม.)',
    dact_date DATE NOT NULL COMMENT 'วันที่ทำกิจกรรม',
    dact_duration_min INT DEFAULT NULL COMMENT 'ระยะเวลาที่ทำกิจกรรม (นาที) — INT ไม่ใช่ TIME (ดู SOYDEE_AI_TASK.md §5 หน้า5)',
    dact_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกรายการ',
    CONSTRAINT fk_dact_mb_id FOREIGN KEY (mb_id) REFERENCES member_profile (mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- ON DELETE RESTRICT (ไม่ใช่ CASCADE ของเดิม) — ลบประเภทกิจกรรม 1 อัน ห้าม
    -- พาบันทึกกิจกรรมของผู้ใช้ทุกคนหายไปด้วย (migration_fix.sql B6)
    CONSTRAINT fk_dact_act_id FOREIGN KEY (act_id) REFERENCES activity_master (act_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    KEY idx_dact_mb_date (mb_id, dact_date),
    CONSTRAINT chk_dact_duration CHECK (dact_duration_min > 0 AND dact_duration_min <= 1440)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางบันทึกการทำกิจกรรม/ออกกำลังกายประจำวันของสมาชิก';

-- --------------------------------------------------------
-- 9. ข้อมูลการนอนหลับประจําวัน (daily_sleep_record)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_sleep_record (
    dslp_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'รหัสบันทึกการนอนหลับ (Primary Key)',
    mb_id INT NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
    dslp_date DATE NOT NULL COMMENT 'วันที่บันทึกการนอน',
    dslp_start_time DATETIME NOT NULL COMMENT 'วันและเวลาที่เริ่มนอน',
    dslp_end_time DATETIME NOT NULL COMMENT 'วันและเวลาที่ตื่นนอน',
    dslp_total_hours DECIMAL(4,2) DEFAULT NULL COMMENT 'จำนวนชั่วโมงที่นอนหลับรวม (คำนวณฝั่งเซิร์ฟเวอร์จาก start/end เท่านั้น)',
    dslp_eval_result TINYINT(1) DEFAULT NULL COMMENT 'ผลประเมินการนอน คำนวณโดยระบบจากจำนวนชั่วโมง (1=น้อยไป <7ชม., 2=พอดี 7-9ชม., 3=มากไป >9ชม.)',
    dslp_quality_score TINYINT(1) DEFAULT NULL COMMENT 'ประเมินคุณภาพการนอน ผู้ใช้เลือกเอง (1=แย่, 2=ปานกลาง, 3=ดี)',
    dslp_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกรายการ',
    UNIQUE KEY uq_dslp_mb_date (mb_id, dslp_date),
    CONSTRAINT fk_dslp_mb_id FOREIGN KEY (mb_id) REFERENCES member_profile (mb_id) ON DELETE CASCADE ON UPDATE CASCADE,
    KEY idx_dslp_mb_date (mb_id, dslp_date),
    CONSTRAINT chk_dslp_order CHECK (dslp_end_time > dslp_start_time),
    CONSTRAINT chk_dslp_hours CHECK (dslp_total_hours > 0 AND dslp_total_hours <= 24),
    CONSTRAINT chk_dslp_eval CHECK (dslp_eval_result IN (1,2,3)),
    CONSTRAINT chk_dslp_quality CHECK (dslp_quality_score IN (1,2,3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางบันทึกพฤติกรรมการนอนหลับประจำวันของสมาชิก';
