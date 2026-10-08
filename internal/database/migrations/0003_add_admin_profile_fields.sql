-- ==============================================================================
-- เพิ่มฟิลด์โปรไฟล์แอดมิน (ชื่อจริง + รูปโปรไฟล์) ให้ system_data
-- (SOYDEE_AI_TASK.md ข้อ 5: แอดมินไม่มีข้อมูลโปรไฟล์เลยนอกจาก username/password)
-- ==============================================================================
ALTER TABLE system_data
    ADD COLUMN sys_full_name  VARCHAR(100) NULL COMMENT 'ชื่อที่แสดงของผู้ดูแลระบบ' AFTER sys_username,
    ADD COLUMN sys_avatar_pic VARCHAR(255) NULL COMMENT 'พาธรูปโปรไฟล์ของผู้ดูแลระบบ' AFTER sys_full_name;
