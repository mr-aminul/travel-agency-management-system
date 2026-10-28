-- UAT: unrestricted Test plan for all first-client agencies.
-- Downgrade individual tenants via admin when leaving UAT.

INSERT INTO platform.plan_templates (
  id, name, description, sort_order, price_bdt,
  user_limit, sub_agent_limit, storage_limit_bytes, sms_limit, sms_overage_bdt,
  modules, features, is_public, is_active
) VALUES (
  'test',
  'Test',
  'UAT / first-client plan — unrestricted while we develop. Downgrade manually when ready.',
  5,
  0,
  10000,
  10000,
  1099511627776,
  100000,
  0,
  '["finance","documents","subAgents","hr","services.touristVisa","services.studentVisa","services.workPermitVisa","services.hajjUmrahVisa","services.medicalVisa","services.airTicket","services.hotelBooking","services.tourPackage"]'::jsonb,
  '{"label":"Test","isTest":true,"uatUnrestricted":true}'::jsonb,
  false,
  true
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
  is_public = EXCLUDED.is_public,
  is_active = EXCLUDED.is_active,
  updated_at = now();

UPDATE platform.tenant_billing AS b
SET
  plan_id = 'test',
  billing_status = 'active',
  plan_kind = 'comp',
  trial_ends_at = NULL,
  current_period_end = now() + interval '1 year',
  cancel_at_period_end = false,
  user_limit = 10000,
  sub_agent_limit = 10000,
  storage_limit_bytes = 1099511627776,
  sms_limit = 100000,
  sms_overage_bdt = 0,
  billing_notes = CASE
    WHEN coalesce(b.billing_notes, '') = '' THEN 'UAT: Test/comp (unrestricted)'
    WHEN b.billing_notes ILIKE '%UAT: Test/comp%' THEN b.billing_notes
    ELSE b.billing_notes || E'\nUAT: Test/comp (unrestricted)'
  END,
  updated_at = now();

-- Also cover agencies that exist in the tenant roster but have no billing row yet.
INSERT INTO platform.tenant_billing (
  tenant_id, plan_id, billing_status, plan_kind, trial_ends_at,
  current_period_end, cancel_at_period_end,
  user_limit, sub_agent_limit, storage_limit_bytes, sms_limit, sms_overage_bdt,
  billing_notes, created_at, updated_at
)
SELECT
  t.id,
  'test',
  'active',
  'comp',
  NULL,
  now() + interval '1 year',
  false,
  10000,
  10000,
  1099511627776,
  100000,
  0,
  'UAT: Test/comp (unrestricted)',
  now(),
  now()
FROM (
  SELECT DISTINCT jsonb_array_elements(value)->>'id' AS id
  FROM platform.kv_store
  WHERE key = 'pd-tenants-created'
    AND jsonb_typeof(value) = 'array'
) AS t
WHERE t.id IS NOT NULL
  AND t.id <> ''
  AND NOT EXISTS (
    SELECT 1 FROM platform.tenant_billing b WHERE b.tenant_id = t.id
  );

INSERT INTO platform.schema_migrations (id)
VALUES ('013_uat_test_plan_all_tenants')
ON CONFLICT (id) DO NOTHING;
