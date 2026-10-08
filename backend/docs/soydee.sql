-- =========================================================
-- ระบบติดตามและประเมินพฤติกรรมสุขภาพส่วนบุคคล (Health Tracking System)
-- Database: soydee (ฉบับแก้ไข)
-- แก้ไข: คอมเมนต์ภาษาไทย, ลำดับคอลัมน์/คีย์, ชนิดข้อมูล, UNIQUE KEY
-- =========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `soydee` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `soydee`;

-- ปิดการตรวจสอบ Foreign Key ชั่วคราว เพื่อให้ DROP/CREATE ตารางที่มีความสัมพันธ์กัน
-- ทำงานได้โดยไม่ติด error #1451 (ไม่ว่าจะ DROP ตามลำดับใดก็ตาม)
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- ตารางที่ 1: system_data (ข้อมูลผู้ดูแลระบบ)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `system_data`;
CREATE TABLE `system_data` (
  `sys_id` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสผู้ดูแลระบบ (Primary Key)',
  `sys_username` VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (ต้องไม่ซ้ำ)',
  `sys_password` VARCHAR(255) NOT NULL COMMENT 'รหัสผ่าน (จัดเก็บแบบเข้ารหัส เช่น bcrypt)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้างบัญชีผู้ดูแลระบบ',
  PRIMARY KEY (`sys_id`),
  UNIQUE KEY `uq_sys_username` (`sys_username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางเก็บข้อมูลบัญชีผู้ดูแลระบบ';

-- ---------------------------------------------------------
-- ตารางที่ 2: member_profile (ข้อมูลสมาชิกทั่วไป)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `member_profile`;
CREATE TABLE `member_profile` (
  `mb_id` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสสมาชิก (Primary Key)',
  `mb_user_name` VARCHAR(100) NOT NULL COMMENT 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบ (ต้องไม่ซ้ำ)',
  `mb_password_hash` VARCHAR(255) NOT NULL COMMENT 'รหัสผ่านที่เข้ารหัสแล้ว',
  `mb_full_name` VARCHAR(100) NOT NULL COMMENT 'ชื่อ-นามสกุลจริงของสมาชิก',
  `mb_gender` TINYINT(1) DEFAULT NULL COMMENT 'เพศ (1=ชาย, 2=หญิง)',
  `mb_birth_date` DATE DEFAULT NULL COMMENT 'วันเดือนปีเกิด',
  `mb_profile_pic` VARCHAR(255) DEFAULT NULL COMMENT 'พาธ/ชื่อไฟล์รูปโปรไฟล์',
  `mb_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สมัครสมาชิก',
  `mb_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขข้อมูลล่าสุด',
  PRIMARY KEY (`mb_id`),
  UNIQUE KEY `uq_mb_user_name` (`mb_user_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางเก็บข้อมูลโปรไฟล์สมาชิกทั่วไป';

-- ---------------------------------------------------------
-- ตารางที่ 3: food_category (ประเภทอาหาร)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `food_category`;
CREATE TABLE `food_category` (
  `fd_id` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสประเภทอาหาร (Primary Key)',
  `fd_name` VARCHAR(100) NOT NULL COMMENT 'ชื่อประเภทอาหาร',
  `fd_traffic_light` TINYINT(1) DEFAULT NULL COMMENT 'เกณฑ์สีโภชนาการ (1=เขียว, 2=เหลือง, 3=แดง)',
  `fd_images` VARCHAR(255) DEFAULT NULL COMMENT 'พาธ/ชื่อไฟล์รูปประเภทอาหาร',
  PRIMARY KEY (`fd_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางข้อมูลหลัก (Master) ประเภทอาหารและเกณฑ์สีโภชนาการ';

-- ---------------------------------------------------------
-- ตารางที่ 4: activity_master (ประเภทกิจกรรม)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `activity_master`;
CREATE TABLE `activity_master` (
  `act_id` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสประเภทกิจกรรม (Primary Key)',
  `act_name` VARCHAR(100) NOT NULL COMMENT 'ชื่อประเภทกิจกรรม',
  `act_images` VARCHAR(255) DEFAULT NULL COMMENT 'พาธ/ชื่อไฟล์รูปประเภทกิจกรรม',
  PRIMARY KEY (`act_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางข้อมูลหลัก (Master) ประเภทกิจกรรมออกกำลังกาย';

-- ---------------------------------------------------------
-- ตารางที่ 5: member_body_stats (ประวัติร่างกายผู้ใช้)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `member_body_stats`;
CREATE TABLE `member_body_stats` (
  `mbs_id` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสประวัติร่างกายของผู้ใช้ (Primary Key)',
  `mb_id` INT(11) NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
  `mbs_weight` DECIMAL(5,2) DEFAULT NULL COMMENT 'น้ำหนัก (กก.)',
  `mbs_height` DECIMAL(5,2) DEFAULT NULL COMMENT 'ส่วนสูง (ซม.)',
  `mbs_activity_level` DECIMAL(3,2) DEFAULT NULL COMMENT 'ค่าคูณระดับกิจกรรม สำหรับคำนวณ TDEE (เช่น 1.20-1.90)',
  `mbs_target` TINYINT(1) DEFAULT NULL COMMENT 'เป้าหมาย (1=ลดน้ำหนัก, 2=เพิ่มกล้ามเนื้อ, 3=รักษาน้ำหนัก)',
  `mbs_recorded_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกข้อมูล',
  PRIMARY KEY (`mbs_id`),
  KEY `fk_mbs_mb_id` (`mb_id`),
  CONSTRAINT `fk_mbs_mb_id` FOREIGN KEY (`mb_id`) REFERENCES `member_profile` (`mb_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางประวัติข้อมูลร่างกายของผู้ใช้ (น้ำหนัก/ส่วนสูง/เป้าหมาย)';

-- ---------------------------------------------------------
-- ตารางที่ 6: member_bmr_history (ประวัติการคำนวณพลังงานพื้นฐาน)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `member_bmr_history`;
CREATE TABLE `member_bmr_history` (
  `mbh_id` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสประวัติการคำนวณพลังงานของผู้ใช้ (Primary Key)',
  `mb_id` INT(11) NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
  `mbs_id` INT(11) NOT NULL COMMENT 'รหัสประวัติร่างกายที่ใช้คำนวณ (Foreign Key -> member_body_stats)',
  `mbh_record_date` DATE NOT NULL COMMENT 'วันที่คำนวณและวิเคราะห์ผล',
  `mbh_bmi` DECIMAL(4,2) DEFAULT NULL COMMENT 'ค่าดัชนีมวลกาย (BMI)',
  `mbh_eval_result` TINYINT(1) DEFAULT NULL COMMENT 'ผลประเมินเกณฑ์ BMI (1=ผอม, 2=ปกติ, 3=ท้วม, 4=อ้วน)',
  `mbh_bmr` DECIMAL(7,2) DEFAULT NULL COMMENT 'ค่าอัตราการเผาผลาญพลังงานพื้นฐาน (BMR)',
  `mbh_tdee` DECIMAL(7,2) DEFAULT NULL COMMENT 'พลังงานที่ร่างกายใช้ทั้งหมดต่อวัน (TDEE)',
  `mbh_tdee_target` DECIMAL(7,2) DEFAULT NULL COMMENT 'พลังงานเป้าหมายต่อวัน ตามเป้าหมายของผู้ใช้',
  PRIMARY KEY (`mbh_id`),
  KEY `fk_mbh_mb_id` (`mb_id`),
  KEY `fk_mbh_mbs_id` (`mbs_id`),
  CONSTRAINT `fk_mbh_mb_id` FOREIGN KEY (`mb_id`) REFERENCES `member_profile` (`mb_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mbh_mbs_id` FOREIGN KEY (`mbs_id`) REFERENCES `member_body_stats` (`mbs_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางประวัติผลการคำนวณ BMI/BMR/TDEE ของผู้ใช้';

-- ---------------------------------------------------------
-- ตารางที่ 7: daily_food_record (บันทึกอาหารประจำวัน)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `daily_food_record`;
CREATE TABLE `daily_food_record` (
  `dfd_id` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสบันทึกอาหารประจำวัน (Primary Key)',
  `mb_id` INT(11) NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
  `fd_id` INT(11) DEFAULT NULL COMMENT 'รหัสประเภทอาหาร (Foreign Key -> food_category)',
  `dfd_date` DATE NOT NULL COMMENT 'วันที่บันทึก',
  `dfd_time` TIME NOT NULL COMMENT 'เวลาที่กิน',
  `dfd_meal_type` TINYINT(1) DEFAULT NULL COMMENT 'มื้ออาหาร (1=เช้า, 2=กลางวัน, 3=เย็น, 4=ว่าง)',
  `dfd_food_name` VARCHAR(100) DEFAULT NULL COMMENT 'ชื่ออาหารที่บันทึก',
  `dfd_image` VARCHAR(255) DEFAULT NULL COMMENT 'พาธ/ชื่อไฟล์รูปอาหาร',
  `dfd_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่บันทึกรายการ',
  `dfd_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไขข้อมูลล่าสุด',
  PRIMARY KEY (`dfd_id`),
  KEY `fk_dfd_mb_id` (`mb_id`),
  KEY `fk_dfd_fd_id` (`fd_id`),
  CONSTRAINT `fk_dfd_mb_id` FOREIGN KEY (`mb_id`) REFERENCES `member_profile` (`mb_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dfd_fd_id` FOREIGN KEY (`fd_id`) REFERENCES `food_category` (`fd_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางบันทึกการบริโภคอาหารประจำวันของสมาชิก';

-- ---------------------------------------------------------
-- ตารางที่ 8: daily_activity_record (บันทึกกิจกรรมประจำวัน)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `daily_activity_record`;
CREATE TABLE `daily_activity_record` (
  `dact_id` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสบันทึกกิจกรรมประจำวัน (Primary Key)',
  `mb_id` INT(11) NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
  `act_id` INT(11) NOT NULL COMMENT 'รหัสประเภทกิจกรรม (Foreign Key -> activity_master)',
  `dact_date` DATE NOT NULL COMMENT 'วันที่ทำกิจกรรม',
  `dact_duration_min` INT(11) DEFAULT NULL COMMENT 'ระยะเวลาที่ทำกิจกรรม (นาที)',
  `dact_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกรายการ',
  PRIMARY KEY (`dact_id`),
  KEY `fk_dact_mb_id` (`mb_id`),
  KEY `fk_dact_act_id` (`act_id`),
  CONSTRAINT `fk_dact_mb_id` FOREIGN KEY (`mb_id`) REFERENCES `member_profile` (`mb_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_dact_act_id` FOREIGN KEY (`act_id`) REFERENCES `activity_master` (`act_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางบันทึกการทำกิจกรรม/ออกกำลังกายประจำวันของสมาชิก';

-- ---------------------------------------------------------
-- ตารางที่ 9: daily_sleep_record (บันทึกการนอนหลับประจำวัน)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `daily_sleep_record`;
CREATE TABLE `daily_sleep_record` (
  `dslp_id` INT(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสบันทึกการนอนหลับ (Primary Key)',
  `mb_id` INT(11) NOT NULL COMMENT 'รหัสสมาชิก (Foreign Key -> member_profile)',
  `dslp_date` DATE NOT NULL COMMENT 'วันที่บันทึกการนอน',
  `dslp_start_time` DATETIME NOT NULL COMMENT 'วันและเวลาที่เริ่มนอน',
  `dslp_end_time` DATETIME NOT NULL COMMENT 'วันและเวลาที่ตื่นนอน',
  `dslp_total_hours` DECIMAL(4,2) DEFAULT NULL COMMENT 'จำนวนชั่วโมงที่นอนหลับรวม',
  `dslp_eval_result` TINYINT(1) DEFAULT NULL COMMENT 'ผลประเมินการนอน (1=น้อยเกินไป, 2=พอดี, 3=มากเกินไป)',
  `dslp_quality_score` TINYINT(1) DEFAULT NULL COMMENT 'คะแนนประเมินคุณภาพการนอน (1=แย่, 2=ปานกลาง, 3=ดี)',
  `dslp_created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกรายการ',
  PRIMARY KEY (`dslp_id`),
  KEY `fk_dslp_mb_id` (`mb_id`),
  CONSTRAINT `fk_dslp_mb_id` FOREIGN KEY (`mb_id`) REFERENCES `member_profile` (`mb_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ตารางบันทึกพฤติกรรมการนอนหลับประจำวันของสมาชิก';

-- เปิดการตรวจสอบ Foreign Key กลับคืน
SET FOREIGN_KEY_CHECKS = 1;

COMMIT;
