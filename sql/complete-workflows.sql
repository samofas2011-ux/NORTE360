CREATE TABLE IF NOT EXISTS account_action_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify','reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_action_tokens_user_idx ON account_action_tokens(user_id, purpose);
CREATE TABLE IF NOT EXISTS resource_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL REFERENCES educational_resources(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY(user_id, resource_id)
);
CREATE TABLE IF NOT EXISTS goal_contributions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS goal_contributions_goal_idx ON goal_contributions(goal_id);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS monthly_allocation_cents BIGINT NOT NULL DEFAULT 0 CHECK (monthly_allocation_cents >= 0);
CREATE UNIQUE INDEX IF NOT EXISTS data_sources_import_dedup_idx ON data_sources(user_id, provider, provider_item_id) WHERE provider = 'csv';
CREATE INDEX IF NOT EXISTS transactions_user_cursor_idx ON financial_transactions(user_id, transaction_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS simulations_user_cursor_idx ON simulations(user_id, created_at DESC, id DESC);
DROP INDEX IF EXISTS goals_user_individual_type_uidx;
