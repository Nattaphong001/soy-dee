ALTER TABLE daily_activity_record DROP CONSTRAINT chk_dact_distance, DROP COLUMN dact_distance_km;
ALTER TABLE activity_master DROP COLUMN act_has_distance, DROP COLUMN act_category;
