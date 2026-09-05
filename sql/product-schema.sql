CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS household_members (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'contributor', 'viewer')),
  invited_email TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'imported', 'estimated', 'simulated')),
  provider TEXT,
  provider_item_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked', 'error')),
  consent_scope_json JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_source_id TEXT REFERENCES data_sources(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  metadata_json JSONB
);

CREATE TABLE IF NOT EXISTS financial_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  default_currency CHAR(3) NOT NULL DEFAULT 'CRC',
  country_code CHAR(2) NOT NULL DEFAULT 'CR',
  monthly_income_cents BIGINT NOT NULL DEFAULT 0 CHECK (monthly_income_cents >= 0),
  monthly_expense_cents BIGINT NOT NULL DEFAULT 0 CHECK (monthly_expense_cents >= 0),
  emergency_fund_target_months NUMERIC(5, 2) NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, household_id)
);

CREATE TABLE IF NOT EXISTS financial_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  data_source_id TEXT REFERENCES data_sources(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('cash', 'checking', 'savings', 'credit_card', 'loan', 'mortgage', 'investment', 'retirement', 'wallet', 'other')),
  currency CHAR(3) NOT NULL DEFAULT 'CRC',
  institution_name TEXT,
  external_account_id TEXT,
  ownership_scope TEXT NOT NULL DEFAULT 'individual' CHECK (ownership_scope IN ('individual', 'shared', 'household')),
  include_in_net_worth BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS account_balance_snapshots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
  balance_cents BIGINT NOT NULL,
  available_balance_cents BIGINT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'imported', 'estimated', 'system'))
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES financial_accounts(id) ON DELETE SET NULL,
  data_source_id TEXT REFERENCES data_sources(id) ON DELETE SET NULL,
  external_transaction_id TEXT,
  transaction_date DATE NOT NULL,
  posted_at TIMESTAMPTZ,
  description TEXT NOT NULL,
  merchant_name TEXT,
  category TEXT,
  amount_cents BIGINT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CRC',
  pending BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS liabilities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  account_id TEXT REFERENCES financial_accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  liability_type TEXT NOT NULL CHECK (liability_type IN ('credit_card', 'mortgage', 'personal_loan', 'car_loan', 'student_loan', 'other')),
  balance_cents BIGINT NOT NULL CHECK (balance_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'CRC',
  annual_interest_bps INTEGER NOT NULL DEFAULT 0 CHECK (annual_interest_bps >= 0),
  minimum_payment_cents BIGINT NOT NULL DEFAULT 0 CHECK (minimum_payment_cents >= 0),
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  lender_name TEXT,
  payoff_priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  account_id TEXT REFERENCES financial_accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('cash', 'property', 'vehicle', 'investment', 'retirement', 'business', 'other')),
  value_cents BIGINT NOT NULL CHECK (value_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'CRC',
  valuation_source TEXT NOT NULL DEFAULT 'manual' CHECK (valuation_source IN ('manual', 'imported', 'estimated')),
  valued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('buy_home', 'pay_debt', 'emergency_fund', 'retirement', 'education', 'buy_car', 'build_wealth', 'custom')),
  target_amount_cents BIGINT NOT NULL CHECK (target_amount_cents >= 0),
  current_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (current_amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'CRC',
  target_date DATE,
  priority INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  assumptions_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('fast', 'economical', 'balanced', 'safe', 'custom')),
  inputs_json JSONB NOT NULL,
  results_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  simulation_type TEXT NOT NULL CHECK (simulation_type IN ('home_purchase', 'car_purchase', 'refinance', 'debt_consolidation', 'invest_vs_debt', 'salary_change', 'aguinaldo', 'custom')),
  inputs_json JSONB NOT NULL,
  results_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calculation_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  scenario_id TEXT REFERENCES scenarios(id) ON DELETE SET NULL,
  simulation_id TEXT REFERENCES simulations(id) ON DELETE SET NULL,
  engine_version TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  inputs_json JSONB NOT NULL,
  outputs_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advisor_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advisor_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES advisor_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  calculation_run_id TEXT REFERENCES calculation_runs(id) ON DELETE SET NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educational_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('article', 'video', 'guide')),
  category TEXT NOT NULL,
  country_code CHAR(2) DEFAULT 'CR',
  content TEXT,
  url TEXT,
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS households_created_by_user_id_idx ON households(created_by_user_id);
CREATE INDEX IF NOT EXISTS household_members_household_id_idx ON household_members(household_id);
CREATE INDEX IF NOT EXISTS household_members_user_id_idx ON household_members(user_id);
CREATE INDEX IF NOT EXISTS data_sources_user_id_idx ON data_sources(user_id);
CREATE INDEX IF NOT EXISTS consents_user_id_idx ON consents(user_id);
CREATE INDEX IF NOT EXISTS financial_profiles_user_id_idx ON financial_profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS financial_profiles_user_individual_uidx
  ON financial_profiles(user_id)
  WHERE household_id IS NULL;
CREATE INDEX IF NOT EXISTS financial_accounts_user_id_idx ON financial_accounts(user_id);
CREATE INDEX IF NOT EXISTS financial_accounts_household_id_idx ON financial_accounts(household_id);
CREATE INDEX IF NOT EXISTS account_balance_snapshots_account_id_captured_at_idx ON account_balance_snapshots(account_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS financial_transactions_user_id_date_idx ON financial_transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS financial_transactions_account_id_date_idx ON financial_transactions(account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS liabilities_user_id_idx ON liabilities(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS liabilities_user_individual_name_uidx
  ON liabilities(user_id, name)
  WHERE household_id IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS liabilities_household_id_idx ON liabilities(household_id);
CREATE INDEX IF NOT EXISTS assets_user_id_idx ON assets(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS assets_user_individual_name_uidx
  ON assets(user_id, name)
  WHERE household_id IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS assets_household_id_idx ON assets(household_id);
CREATE INDEX IF NOT EXISTS goals_user_id_status_idx ON goals(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS goals_user_individual_type_uidx
  ON goals(user_id, goal_type)
  WHERE household_id IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS goals_household_id_status_idx ON goals(household_id, status);
CREATE INDEX IF NOT EXISTS scenarios_user_id_created_at_idx ON scenarios(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scenarios_goal_id_idx ON scenarios(goal_id);
CREATE INDEX IF NOT EXISTS simulations_user_id_created_at_idx ON simulations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS calculation_runs_user_id_created_at_idx ON calculation_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS advisor_conversations_user_id_updated_at_idx ON advisor_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS advisor_messages_conversation_id_created_at_idx ON advisor_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx ON notifications(user_id, created_at DESC);
