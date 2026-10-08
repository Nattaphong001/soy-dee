-- ==============================================================================
-- ระดับการใช้แรงของกิจกรรม (act_intensity) — หน้าบันทึกกิจกรรมใช้กำหนดสีของแต่ละกิจกรรม
-- 1=เบา (เขียว) 2=ปานกลาง (เหลือง) 3=หนัก (ส้ม) 4=หนักมาก (แดง); กิจกรรมที่แอดมินเพิ่มใหม่ = 2
-- รันครั้งเดียวด้วยมือ (ไม่มี migration runner):
--   mysql -u root soydee --default-character-set=utf8mb4 < internal/database/migrations/0005_add_activity_intensity.sql
-- ==============================================================================
ALTER TABLE activity_master
    ADD COLUMN act_intensity TINYINT NOT NULL DEFAULT 2
        COMMENT 'ระดับการใช้แรง: 1=เบา 2=ปานกลาง 3=หนัก 4=หนักมาก (ค่าเริ่มต้นของกิจกรรมที่แอดมินเพิ่มใหม่ = 2)' AFTER act_category;

-- ระดับของกิจกรรมชุดเริ่มต้น (ที่ไม่อยู่ในรายการนี้เป็น 2 = ปานกลาง)
UPDATE activity_master SET act_intensity = 1 WHERE act_name IN ('เดิน', 'โยคะ');
UPDATE activity_master SET act_intensity = 3 WHERE act_name IN ('วิ่ง', 'ว่ายน้ำ', 'เดินขึ้นบันได', 'แอโรบิก/เต้นออกกำลังกาย', 'กีฬา (ฟุตบอล/บาสเกตบอล/แบดมินตัน)');
UPDATE activity_master SET act_intensity = 4 WHERE act_name = 'กระโดดเชือก';
