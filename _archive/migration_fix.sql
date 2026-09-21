-- =============================================================================
-- Soy-Dee — migration_fix.sql
-- แก้ปัญหาที่ตรวจพบจาก soydee__1_.sql (MariaDB 10.4.32)
-- =============================================================================
-- วิธีใช้ (สำคัญมาก):
--   1) สำรองฐานข้อมูลก่อนเสมอ:
--      mysqldump -u root -p soydee > soydee_backup_YYYYMMDD.sql
--   2) รัน PART A (ตรวจสอบ) ก่อน แล้วอ่านผลลัพธ์
--   3) ค่อยรัน PART B (แก้ไข) ทีละบล็อก อย่ารันรวดเดียว
-- =============================================================================

USE `soydee`;

-- #############################################################################
-- PART A — ตรวจสอบข้อมูล (อ่านอย่างเดียว ไม่แก้อะไร) รันก่อนเสมอ
-- #############################################################################

-- A1) หมวดอาหารที่ยังไม่กำหนดสี — คาดว่าเจอ 7 แถว
SELECT 'A1_food_no_color' AS check_name, fd_id, fd_name
FROM food_category WHERE fd_traffic_light IS NULL;

-- A2) บันทึกอาหารที่แสดงสีไม่ได้ (fd_id ว่าง หรือหมวดที่อ้างถึงไม่มีสี)
SELECT 'A2_food_record_no_color' AS check_name,
       d.dfd_id, d.dfd_food_name, d.fd_id, c.fd_name, c.fd_traffic_light
FROM daily_food_record d
LEFT JOIN food_category c ON c.fd_id = d.fd_id
WHERE d.fd_id IS NULL OR c.fd_traffic_light IS NULL;

-- A3) ประวัติร่างกายที่ไม่มีผลคำนวณ BMR ตามมา — คาดว่าเจอ 11 แถว
SELECT 'A3_bodystats_without_bmr' AS check_name,
       s.mbs_id, s.mb_id, s.mbs_recorded_date
FROM member_body_stats s
LEFT JOIN member_bmr_history h ON h.mbs_id = s.mbs_id
WHERE h.mbh_id IS NULL
ORDER BY s.mbs_id;

-- A4) ตรวจ BMI / BMR ทุกแถวเทียบสูตรมาตรฐาน (Mifflin-St Jeor)
--     ดูคอลัมน์ bmr_diff — ถ้าไม่ใช่ 0.00 แปลว่าคำนวณผิด (คาดว่า mbh_id=2 ต่าง -35.00)
SELECT 'A4_recalc' AS check_name,
       h.mbh_id, h.mb_id, p.mb_gender, s.mbs_weight, s.mbs_height,
       TIMESTAMPDIFF(YEAR, p.mb_birth_date, h.mbh_record_date)          AS age_correct,
       h.mbh_bmi,
       ROUND(s.mbs_weight / POW(s.mbs_height/100, 2), 2)                AS bmi_correct,
       h.mbh_bmr,
       ROUND(
         10*s.mbs_weight + 6.25*s.mbs_height
         - 5*TIMESTAMPDIFF(YEAR, p.mb_birth_date, h.mbh_record_date)
         + IF(p.mb_gender = 1, 5, -161)
       , 2)                                                             AS bmr_correct,
       ROUND(h.mbh_bmr - (
         10*s.mbs_weight + 6.25*s.mbs_height
         - 5*TIMESTAMPDIFF(YEAR, p.mb_birth_date, h.mbh_record_date)
         + IF(p.mb_gender = 1, 5, -161)
       ), 2)                                                            AS bmr_diff,
       s.mbs_target, h.mbh_tdee, h.mbh_tdee_target
FROM member_bmr_history h
JOIN member_body_stats s ON s.mbs_id = h.mbs_id
JOIN member_profile   p ON p.mb_id  = h.mb_id
ORDER BY h.mbh_id;

-- A5) เคสเป้าหมาย "ลดน้ำหนัก" ที่ยังไม่เคยถูกคำนวณเลย
SELECT 'A5_target_lose_never_tested' AS check_name, COUNT(*) AS rows_found
FROM member_bmr_history h
JOIN member_body_stats s ON s.mbs_id = h.mbs_id
WHERE s.mbs_target = 1;

-- A6) การนอนที่ชั่วโมงรวมไม่ตรงกับเวลาเริ่ม-ตื่น หรือเวลาไม่สมเหตุผล
SELECT 'A6_sleep_bad' AS check_name,
       dslp_id, mb_id, dslp_start_time, dslp_end_time, dslp_total_hours,
       ROUND(TIMESTAMPDIFF(MINUTE, dslp_start_time, dslp_end_time)/60, 2) AS hours_correct
FROM daily_sleep_record
WHERE dslp_end_time <= dslp_start_time
   OR ABS(dslp_total_hours - TIMESTAMPDIFF(MINUTE, dslp_start_time, dslp_end_time)/60) > 0.02
   OR TIMESTAMPDIFF(MINUTE, dslp_start_time, dslp_end_time) > 1440;

-- A7) การนอนที่บันทึกซ้ำวันเดียวกัน (ต้องรู้ก่อนจะเพิ่ม UNIQUE)
SELECT 'A7_sleep_dup_day' AS check_name, mb_id, dslp_date, COUNT(*) AS n
FROM daily_sleep_record GROUP BY mb_id, dslp_date HAVING n > 1;

-- A8) ข้อมูลทดสอบที่ค้างใน master data และตารางสมาชิก
SELECT 'A8_junk_activity' AS check_name, act_id AS id, act_name AS name
FROM activity_master WHERE act_name LIKE 'ทดสอบ%' OR act_name LIKE '%_edited' OR act_name LIKE '%(แก้ไข)%'
UNION ALL
SELECT 'A8_junk_food', fd_id, fd_name
FROM food_category WHERE fd_name LIKE 'ทดสอบ%' OR fd_name LIKE '%_edited'
UNION ALL
SELECT 'A8_junk_member', mb_id, mb_user_name
FROM member_profile WHERE mb_user_name LIKE '%test%' OR mb_user_name LIKE 'smoketest%';

-- A9) บัญชีที่ hash เป็น $2y$ = ถูกยัดเข้าฐานโดยไม่ผ่าน API สมัครสมาชิก
SELECT 'A9_hash_2y_member' AS check_name, mb_id AS id, mb_user_name AS username
FROM member_profile WHERE mb_password_hash LIKE '$2y$%'
UNION ALL
SELECT 'A9_hash_2y_admin', sys_id, sys_username
FROM system_data WHERE sys_password LIKE '$2y$%';

-- A10) username ที่ซ้ำข้ามตาราง member กับ admin
SELECT 'A10_username_cross_dup' AS check_name, p.mb_user_name AS username
FROM member_profile p JOIN system_data s ON s.sys_username = p.mb_user_name;

-- A11) ประวัติร่างกายที่ค่าซ้ำเป๊ะกับแถวก่อนหน้าของคนเดียวกัน
SELECT 'A11_bodystats_duplicate' AS check_name,
       mb_id, mbs_weight, mbs_height, mbs_activity_level, mbs_target,
       COUNT(*) AS n, GROUP_CONCAT(mbs_id ORDER BY mbs_id) AS ids
FROM member_body_stats
GROUP BY mb_id, mbs_weight, mbs_height, mbs_activity_level, mbs_target
HAVING n > 1;


-- #############################################################################
-- PART B — แก้ไข (รันทีละบล็อก หลังตรวจ PART A แล้ว)
-- #############################################################################

-- -----------------------------------------------------------------------------
-- B1) แก้ charset ให้เป็น utf8mb4 ทั้งฐานข้อมูล (แก้ปัญหาคอมเมนต์/ข้อความไทยเพี้ยน)
-- -----------------------------------------------------------------------------
ALTER DATABASE `soydee` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE system_data           CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE member_profile        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE food_category         CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE activity_master       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE member_body_stats     CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE member_bmr_history    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE daily_food_record     CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE daily_activity_record CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE daily_sleep_record    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- แก้คอมเมนต์ที่เพี้ยนเป็น mojibake
ALTER TABLE daily_food_record
  MODIFY `dfd_amount` VARCHAR(50) DEFAULT NULL
  COMMENT 'ปริมาณ/จำนวนที่กิน เช่น 1 จาน, 200 กรัม';


-- -----------------------------------------------------------------------------
-- B2) ล้างข้อมูลทดสอบ [ตัดสินใจแล้ว: เก็บ mb_id=6 ไว้เป็น dev-test account — ห้ามลบ]
--     รายการ id ด้านล่างมาจาก A8 หักลบ id=6 ออกแล้วโดยตั้งใจ
-- -----------------------------------------------------------------------------
-- ลบบันทึกลูกก่อน แล้วค่อยลบ master (กัน FK error)
-- DELETE FROM daily_food_record     WHERE mb_id IN (1,7,8,9,11,12,13,14);
-- DELETE FROM daily_activity_record WHERE mb_id IN (1,7,8,9,11,12,13,14);
-- DELETE FROM daily_sleep_record    WHERE mb_id IN (1,7,8,9,11,12,13,14);
-- DELETE FROM member_bmr_history    WHERE mb_id IN (1,7,8,9,11,12,13,14);
-- DELETE FROM member_body_stats     WHERE mb_id IN (1,7,8,9,11,12,13,14);
-- DELETE FROM member_profile        WHERE mb_id IN (1,7,8,9,11,12,13,14);
-- mb_id=6 (soydee_test01) ไม่อยู่ในรายการนี้ — เก็บไว้ใช้งานต่อ

-- DELETE FROM food_category   WHERE fd_id  = 14;   -- 'ทดสอบอัตโนมัติ'
-- DELETE FROM activity_master WHERE act_id IN (5,6);
-- UPDATE activity_master SET act_name = 'ออกกำลังกาย' WHERE act_id = 1;


-- -----------------------------------------------------------------------------
-- B3) กำหนดสีโภชนาการให้ครบทุกหมวด แล้วบังคับ NOT NULL
--     1 = เขียว, 2 = เหลือง, 3 = แดง
-- -----------------------------------------------------------------------------
UPDATE food_category SET fd_traffic_light = 1 WHERE fd_id = 1;   -- ต้ม
UPDATE food_category SET fd_traffic_light = 2 WHERE fd_id = 2;   -- ผัด (ใช้น้ำมัน)
UPDATE food_category SET fd_traffic_light = 2 WHERE fd_id = 3;   -- แกง (กะทิ/เค็ม)
UPDATE food_category SET fd_traffic_light = 3 WHERE fd_id = 4;   -- ทอด
UPDATE food_category SET fd_traffic_light = 1 WHERE fd_id = 5;   -- นึ่ง
UPDATE food_category SET fd_traffic_light = 1 WHERE fd_id = 6;   -- ย่าง/ปิ้ง
UPDATE food_category SET fd_traffic_light = 1 WHERE fd_id = 7;   -- ยำ/สลัด
UPDATE food_category SET fd_traffic_light = 3 WHERE fd_id = 8;   -- ของหวาน
UPDATE food_category SET fd_traffic_light = 1 WHERE fd_id = 9;   -- เครื่องดื่มไม่หวาน (เดิมเป็น 2 ซึ่งไม่สมเหตุผล)
UPDATE food_category SET fd_traffic_light = 2 WHERE fd_id = 10;  -- หวานน้อย/นม
UPDATE food_category SET fd_traffic_light = 3 WHERE fd_id = 11;  -- หวานจัด
UPDATE food_category SET fd_traffic_light = 2 WHERE fd_id = 12;  -- อื่นๆ

-- เผื่อมีหมวดที่เพิ่มเข้ามาใหม่และยังไม่ได้กำหนดสี
UPDATE food_category SET fd_traffic_light = 2 WHERE fd_traffic_light IS NULL;

ALTER TABLE food_category
  MODIFY `fd_traffic_light` TINYINT(1) NOT NULL DEFAULT 2
  COMMENT 'เกณฑ์สีโภชนาการ (1=เขียว, 2=เหลือง, 3=แดง)';


-- -----------------------------------------------------------------------------
-- B4) [ตัดสินใจแล้ว: ไม่ทำ — §7.2 = "ไม่ต้องการ"] ข้ามบล็อกนี้ทั้งหมด
--     ระบบจะไม่คำนวณพลังงานที่เผาผลาญจากกิจกรรม ไม่ต้องเพิ่ม act_met
-- -----------------------------------------------------------------------------
-- (ไม่มีคำสั่งให้รันในบล็อกนี้)


-- -----------------------------------------------------------------------------
-- B5) เพิ่ม index ที่ Dashboard ต้องใช้ (ตอนนี้ไม่มีเลย query รายวัน/รายสัปดาห์จะช้า)
-- -----------------------------------------------------------------------------
ALTER TABLE daily_food_record     ADD INDEX `idx_dfd_mb_date`  (`mb_id`, `dfd_date`);
ALTER TABLE daily_activity_record ADD INDEX `idx_dact_mb_date` (`mb_id`, `dact_date`);
ALTER TABLE daily_sleep_record    ADD INDEX `idx_dslp_mb_date` (`mb_id`, `dslp_date`);
ALTER TABLE member_body_stats     ADD INDEX `idx_mbs_mb_date`  (`mb_id`, `mbs_recorded_date`);
ALTER TABLE member_bmr_history    ADD INDEX `idx_mbh_mb_date`  (`mb_id`, `mbh_record_date`);


-- -----------------------------------------------------------------------------
-- B6) เปลี่ยน FK ของบันทึกกิจกรรมจาก CASCADE เป็น RESTRICT
--     เหตุผล: ปัจจุบัน admin ลบประเภทกิจกรรม 1 อัน = บันทึกของผู้ใช้ทุกคนหายหมด
-- -----------------------------------------------------------------------------
ALTER TABLE daily_activity_record DROP FOREIGN KEY `fk_dact_act_id`;
ALTER TABLE daily_activity_record
  ADD CONSTRAINT `fk_dact_act_id` FOREIGN KEY (`act_id`)
  REFERENCES `activity_master` (`act_id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- B7) CHECK constraint กันค่านอกช่วง (MariaDB 10.4 รองรับ)
-- -----------------------------------------------------------------------------
ALTER TABLE member_profile
  ADD CONSTRAINT `chk_mb_gender` CHECK (`mb_gender` IN (1,2));

ALTER TABLE member_body_stats
  ADD CONSTRAINT `chk_mbs_target` CHECK (`mbs_target` IN (1,2,3)),
  ADD CONSTRAINT `chk_mbs_weight` CHECK (`mbs_weight` > 0   AND `mbs_weight` < 400),
  ADD CONSTRAINT `chk_mbs_height` CHECK (`mbs_height` > 50  AND `mbs_height` < 300);

ALTER TABLE member_bmr_history
  ADD CONSTRAINT `chk_mbh_eval` CHECK (`mbh_eval_result` IN (1,2,3,4));

ALTER TABLE food_category
  ADD CONSTRAINT `chk_fd_light` CHECK (`fd_traffic_light` IN (1,2,3));

ALTER TABLE daily_food_record
  ADD CONSTRAINT `chk_dfd_meal` CHECK (`dfd_meal_type` IN (1,2,3,4));

ALTER TABLE daily_activity_record
  ADD CONSTRAINT `chk_dact_duration` CHECK (`dact_duration_min` > 0 AND `dact_duration_min` <= 1440);

ALTER TABLE daily_sleep_record
  ADD CONSTRAINT `chk_dslp_order`   CHECK (`dslp_end_time` > `dslp_start_time`),
  ADD CONSTRAINT `chk_dslp_hours`   CHECK (`dslp_total_hours` > 0 AND `dslp_total_hours` <= 24),
  ADD CONSTRAINT `chk_dslp_eval`    CHECK (`dslp_eval_result` IN (1,2,3)),
  ADD CONSTRAINT `chk_dslp_quality` CHECK (`dslp_quality_score` IN (1,2,3));


-- -----------------------------------------------------------------------------
-- B8) [ตัดสินใจแล้ว: §7.5 = "1 วัน 1 แถว"] UNIQUE การนอน
--     A7 ตรวจแล้วไม่มีข้อมูลซ้ำ รันได้เลยไม่ error
--     ฝั่ง Go: หน้าจอต้องเช็คว่าวันนั้นมีแถวอยู่แล้วหรือไม่ ถ้ามีให้เรียก PUT แทน POST (upsert)
-- -----------------------------------------------------------------------------
ALTER TABLE daily_sleep_record ADD UNIQUE KEY `uq_dslp_mb_date` (`mb_id`, `dslp_date`);


-- -----------------------------------------------------------------------------
-- B9) แก้ค่าที่คำนวณผิดในประวัติ (ตรวจผล A4 ก่อน)
--     mbh_id = 2 : BMR ถูกคำนวณด้วยอายุ 28 ปี แทนที่จะเป็น 21 ปี
--     ค่าถูก: BMR 1645.00, TDEE 1645 x 1.55 = 2549.75, target=3 จึงเท่ากับ TDEE
-- -----------------------------------------------------------------------------
-- UPDATE member_bmr_history
-- SET mbh_bmr = 1645.00, mbh_tdee = 2549.75, mbh_tdee_target = 2549.75
-- WHERE mbh_id = 2;
-- [สถานะจริง: รันเข้า soydee แล้ว 2026-08-25 — C4 ยืนยัน 0 mismatch เหลือ comment ไว้เผื่อรัน DB สำเนาอื่นซ้ำ]


-- -----------------------------------------------------------------------------
-- B10) backfill BMR/BMI/TDEE ย้อนหลังให้ 11 แถว member_body_stats ที่ขาดคู่ (C3)
--      ใช้สูตรเดียวกับ A4 เป๊ะ — รันแล้ว 2026-08-25, C3 เหลือ 0
-- -----------------------------------------------------------------------------
INSERT INTO member_bmr_history
  (mbh_record_date, mbh_bmi, mbh_eval_result, mbh_bmr, mbh_tdee, mbh_tdee_target, mb_id, mbs_id)
SELECT
  DATE(s.mbs_recorded_date),
  ROUND(s.mbs_weight / POW(s.mbs_height/100,2), 2),
  CASE
    WHEN s.mbs_weight / POW(s.mbs_height/100,2) < 18.5 THEN 1
    WHEN s.mbs_weight / POW(s.mbs_height/100,2) < 23.0 THEN 2
    WHEN s.mbs_weight / POW(s.mbs_height/100,2) < 25.0 THEN 3
    ELSE 4
  END,
  ROUND(10*s.mbs_weight + 6.25*s.mbs_height - 5*TIMESTAMPDIFF(YEAR,p.mb_birth_date,s.mbs_recorded_date) + IF(p.mb_gender=1,5,-161),2),
  ROUND((10*s.mbs_weight + 6.25*s.mbs_height - 5*TIMESTAMPDIFF(YEAR,p.mb_birth_date,s.mbs_recorded_date) + IF(p.mb_gender=1,5,-161)) * s.mbs_activity_level,2),
  ROUND((10*s.mbs_weight + 6.25*s.mbs_height - 5*TIMESTAMPDIFF(YEAR,p.mb_birth_date,s.mbs_recorded_date) + IF(p.mb_gender=1,5,-161)) * s.mbs_activity_level *
     CASE s.mbs_target WHEN 1 THEN 0.85 WHEN 2 THEN 1.15 ELSE 1.00 END, 2),
  s.mb_id,
  s.mbs_id
FROM member_body_stats s
JOIN member_profile p ON p.mb_id = s.mb_id
LEFT JOIN member_bmr_history h ON h.mbs_id = s.mbs_id
WHERE h.mbh_id IS NULL;


-- #############################################################################
-- PART C — ตรวจซ้ำหลังแก้ (ต้องได้ 0 ทุกแถว)
-- #############################################################################

SELECT 'C1_food_no_color'          AS check_name, COUNT(*) AS should_be_zero FROM food_category WHERE fd_traffic_light IS NULL
UNION ALL
SELECT 'C2_food_record_no_color',  COUNT(*) FROM daily_food_record d LEFT JOIN food_category c ON c.fd_id = d.fd_id WHERE c.fd_traffic_light IS NULL
UNION ALL
SELECT 'C3_bodystats_without_bmr', COUNT(*) FROM member_body_stats s LEFT JOIN member_bmr_history h ON h.mbs_id = s.mbs_id WHERE h.mbh_id IS NULL
UNION ALL
SELECT 'C4_bmr_mismatch',          COUNT(*) FROM member_bmr_history h
  JOIN member_body_stats s ON s.mbs_id = h.mbs_id
  JOIN member_profile   p ON p.mb_id  = h.mb_id
  WHERE ABS(h.mbh_bmr - (10*s.mbs_weight + 6.25*s.mbs_height
        - 5*TIMESTAMPDIFF(YEAR, p.mb_birth_date, h.mbh_record_date)
        + IF(p.mb_gender = 1, 5, -161))) > 0.01
UNION ALL
SELECT 'C5_sleep_bad',             COUNT(*) FROM daily_sleep_record
  WHERE dslp_end_time <= dslp_start_time
     OR ABS(dslp_total_hours - TIMESTAMPDIFF(MINUTE, dslp_start_time, dslp_end_time)/60) > 0.02;