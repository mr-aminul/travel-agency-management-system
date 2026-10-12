-- Zero-taka plan for gateway / payment flow testing.

INSERT INTO platform.plan_templates (
  id, name, description, sort_order, price_bdt,
  user_limit, sub_agent_limit, storage_limit_bytes, sms_limit, sms_overage_bdt,
  modules, features, is_public, is_active
) VALUES (
  'test',
  'Test',
  'Zero-taka plan for payment gateway testing. Not for production agencies.',
  5,
  0,
  20,
  30,
  42949672960,
  2000,
  0.40,
  '["finance","documents","subAgents","services.touristVisa","services.studentVisa","services.workPermitVisa","services.hajjUmrahVisa","services.medicalVisa","services.airTicket","services.hotelBooking","services.tourPackage"]'::jsonb,
  '{"label":"Test","isTest":true}'::jsonb,
  true,
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

INSERT INTO platform.schema_migrations (id)
VALUES ('011_billing_test_plan')
ON CONFLICT (id) DO NOTHING;
