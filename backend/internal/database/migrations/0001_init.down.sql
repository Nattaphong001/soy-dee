-- WARNING: drops ALL application tables and data.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS daily_sleep_record, daily_activity_record, daily_food_record, member_bmr_history, member_body_stats, activity_master, food_category, member_profile, system_data;
SET FOREIGN_KEY_CHECKS = 1;
