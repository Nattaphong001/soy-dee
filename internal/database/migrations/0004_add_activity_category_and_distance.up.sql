-- ==============================================================================
-- แยกประเภทกิจกรรม (act_category) + ระยะทาง (เฉพาะกิจกรรมที่วัดระยะทางได้)
-- หน้าเพิ่มรายการกิจกรรม: จัดกลุ่มตามประเภท และแสดงช่อง "ระยะทาง (กม.)" เฉพาะ act_has_distance = 1
-- รันผ่าน migration runner:
--   (ใช้ go run ./cmd/migrate up แทนการรันมือ)
-- ==============================================================================
ALTER TABLE activity_master
    ADD COLUMN act_category TINYINT NOT NULL DEFAULT 5
        COMMENT 'ประเภทกิจกรรม: 1=คาร์ดิโอ 2=ฟิตเนส 3=กีฬา 4=กิจวัตรประจำวัน 5=อื่นๆ (ค่าเริ่มต้นของกิจกรรมที่แอดมินเพิ่มใหม่)' AFTER act_name,
    ADD COLUMN act_has_distance TINYINT(1) NOT NULL DEFAULT 0
        COMMENT '1 = กิจกรรมนี้บันทึกระยะทางได้ (หน้าเพิ่มรายการแสดงช่องระยะทาง)' AFTER act_category;

ALTER TABLE daily_activity_record
    ADD COLUMN dact_distance_km DECIMAL(6,2) DEFAULT NULL
        COMMENT 'ระยะทาง (กิโลเมตร) — มีค่าได้เฉพาะกิจกรรมที่ act_has_distance = 1' AFTER dact_duration_min,
    ADD CONSTRAINT chk_dact_distance CHECK (dact_distance_km IS NULL OR (dact_distance_km > 0 AND dact_distance_km <= 999.99));

-- จัดประเภทกิจกรรมชุดเริ่มต้น (ที่ไม่อยู่ในรายการนี้จะเป็น 5 = อื่นๆ)
UPDATE activity_master SET act_category = 1 WHERE act_name IN ('วิ่ง', 'เดิน', 'เดินขึ้นบันได', 'กระโดดเชือก');
UPDATE activity_master SET act_category = 2 WHERE act_name IN ('ออกกำลังกาย', 'เวทเทรนนิ่ง', 'โยคะ', 'แอโรบิก/เต้นออกกำลังกาย');
UPDATE activity_master SET act_category = 3 WHERE act_name IN ('ว่ายน้ำ', 'กีฬา (ฟุตบอล/บาสเกตบอล/แบดมินตัน)');
UPDATE activity_master SET act_category = 4 WHERE act_name IN ('ทำงานบ้าน', 'ทำสวน');

-- กิจกรรมที่มีระยะทาง: วิ่ง / เดิน เท่านั้น
UPDATE activity_master SET act_has_distance = 1 WHERE act_name IN ('วิ่ง', 'เดิน');
