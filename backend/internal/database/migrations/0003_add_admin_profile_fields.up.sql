-- ==============================================================================
-- เพิ่มฟิลด์โปรไฟล์แอดมิน (ชื่อจริง + รูปโปรไฟล์) ให้ system_data
-- (SOYDEE_AI_TASK.md ข้อ 5: แอดมินไม่มีข้อมูลโปรไฟล์เลยนอกจาก username/password)
-- ==============================================================================
-- IF NOT EXISTS (MariaDB): 0001 already includes these columns on fresh databases
ALTER TABLE system_data
    ADD COLUMN IF NOT EXISTS sys_full_name  VARCHAR(100) NULL COMMENT 'ชื่อที่แสดงของผู้ดูแลระบบ' AFTER sys_username,
    ADD COLUMN IF NOT EXISTS sys_avatar_pic VARCHAR(255) NULL COMMENT 'พาธรูปโปรไฟล์ของผู้ดูแลระบบ' AFTER sys_full_name;
