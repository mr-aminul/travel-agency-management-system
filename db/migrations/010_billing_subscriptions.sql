-- Subscription plans, tenant billing state, invoices, SMS usage, webhook idempotency.

CREATE TABLE IF NOT EXISTS platform.plan_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  price_bdt integer NOT NULL CHECK (price_bdt >= 0),
  currency text NOT NULL DEFAULT 'BDT',
  interval text NOT NULL DEFAULT 'month'
    CHECK (interval IN ('month', 'year')),
  user_limit integer NOT NULL CHECK (user_limit >= 0),
  sub_agent_limit integer NOT NULL CHECK (sub_agent_limit >= 0),
  storage_limit_bytes bigint NOT NULL CHECK (storage_limit_bytes >= 0),
  sms_limit integer NOT NULL CHECK (sms_limit >= 0),
  sms_overage_bdt numeric(10, 2) NOT NULL DEFAULT 0,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.tenant_billing (
  tenant_id text PRIMARY KEY,
  plan_id text REFERENCES platform.plan_templates (id),
  billing_status text NOT NULL DEFAULT 'trial'
    CHECK (billing_status IN (
      'trial', 'active', 'past_due', 'suspended', 'canceled'
    )),
  plan_kind text NOT NULL DEFAULT 'trial'
    CHECK (plan_kind IN ('trial', 'standard', 'comp', 'custom')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  user_limit integer,
  sub_agent_limit integer,
  storage_limit_bytes bigint,
  sms_limit integer,
  sms_overage_bdt numeric(10, 2),
  gateway_customer_id text,
  gateway_subscription_id text,
  billing_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_billing_status_idx
  ON platform.tenant_billing (billing_status);
CREATE INDEX IF NOT EXISTS tenant_billing_plan_idx
  ON platform.tenant_billing (plan_id);

CREATE TABLE IF NOT EXISTS platform.billing_invoices (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  plan_id text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN (
      'open', 'pending_review', 'paid', 'void', 'failed'
    )),
  amount_bdt integer NOT NULL CHECK (amount_bdt >= 0),
  currency text NOT NULL DEFAULT 'BDT',
  description text NOT NULL DEFAULT '',
  period_start timestamptz,
  period_end timestamptz,
  payment_method text
    CHECK (payment_method IS NULL OR payment_method IN (
      'bkash', 'nagad', 'bank', 'gateway', 'cash', 'other'
    )),
  payment_reference text,
  payment_note text,
  gateway_payment_id text,
  paid_at timestamptz,
  verified_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_invoices_tenant_idx
  ON platform.billing_invoices (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_invoices_status_idx
  ON platform.billing_invoices (status);

CREATE TABLE IF NOT EXISTS platform.sms_usage (
  tenant_id text NOT NULL,
  period_yyyymm text NOT NULL,
  sent_count integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, period_yyyymm)
);

CREATE TABLE IF NOT EXISTS platform.billing_webhook_events (
  id text PRIMARY KEY,
  provider text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Seed catalog (idempotent upsert).
INSERT INTO platform.plan_templates (
  id, name, description, sort_order, price_bdt,
  user_limit, sub_agent_limit, storage_limit_bytes, sms_limit, sms_overage_bdt,
  modules, features
) VALUES
(
  'starter',
  'Starter',
  'For a small agency running its own files.',
  10,
  3000,
  5,
  0,
  10737418240,
  300,
  0.50,
  '["finance","documents","services.touristVisa","services.studentVisa","services.workPermitVisa","services.hajjUmrahVisa","services.medicalVisa","services.airTicket","services.hotelBooking","services.tourPackage"]'::jsonb,
  '{"label":"Starter"}'::jsonb
),
(
  'growth',
  'Growth',
  'For agencies that scale through a referral network.',
  20,
  6500,
  20,
  30,
  42949672960,
  2000,
  0.40,
  '["finance","documents","subAgents","services.touristVisa","services.studentVisa","services.workPermitVisa","services.hajjUmrahVisa","services.medicalVisa","services.airTicket","services.hotelBooking","services.tourPackage"]'::jsonb,
  '{"label":"Growth","includesSubAgents":true}'::jsonb
),
(
  'business',
  'Business',
  'For agencies running people and ops as one system.',
  30,
  14000,
  60,
  100,
  107374182400,
  8000,
  0.30,
  '["finance","documents","subAgents","hr","services.touristVisa","services.studentVisa","services.workPermitVisa","services.hajjUmrahVisa","services.medicalVisa","services.airTicket","services.hotelBooking","services.tourPackage"]'::jsonb,
  '{"label":"Business","includesSubAgents":true,"includesHr":true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  price_bdt = EXCLUDED.price_bdt,
  user_limit = EXCLUDED.user_limit,
  sub_agent_limit = EXCLUDED.sub_agent_limit,
  storage_limit_bytes = EXCLUDED.storage_limit_bytes,
  sms_limit = EXCLUDED.sms_limit,
  sms_overage_bdt = EXCLUDED.sms_overage_bdt,
  modules = EXCLUDED.modules,
  features = EXCLUDED.features,
  updated_at = now();

INSERT INTO platform.schema_migrations (id)
VALUES ('010_billing_subscriptions')
ON CONFLICT (id) DO NOTHING;
