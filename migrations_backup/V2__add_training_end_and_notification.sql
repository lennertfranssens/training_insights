-- Add training_end_time and pre_notification_minutes columns to trainings
ALTER TABLE trainings
ADD COLUMN IF NOT EXISTS training_end_time timestamp with time zone;

ALTER TABLE trainings
ADD COLUMN IF NOT EXISTS pre_notification_minutes integer DEFAULT 0;
