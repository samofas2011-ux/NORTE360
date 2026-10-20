ALTER TABLE financial_profiles ADD COLUMN IF NOT EXISTS planning_json JSONB NOT NULL DEFAULT '{}';
