-- Add daily boolean column to questionnaires
ALTER TABLE questionnaires
ADD COLUMN IF NOT EXISTS daily boolean DEFAULT false;
