-- Public annual plans (10× monthly = two months free).

INSERT INTO platform.plan_templates (
  id, name, description, sort_order, price_bdt, currency, interval,
  user_limit, sub_agent_limit, storage_limit_bytes, sms_limit, sms_overage_bdt,
  modules, features, is_public, is_active
) VALUES
(
  'starter-year',
  'Starter',
  'Annual Starter — two months free vs monthly.',
  40,
  30000,
  'BDT',
  'year',
  5,
  0,
  10737418240,
  300,
  0.50,
  '["finance","documents","services.touristVisa","services.studentVisa","services.workPermitVisa","services.hajjUmrahVisa","services.medicalVisa","services.airTicket","services.hotelBooking","services.tourPackage"]'::jsonb,
  '{"label":"Starter"}'::jsonb,
  true,
  true
),
(
  'growth-year',
  'Growth',
  'Annual Growth — two months free vs monthly.',
  50,
  65000,
  'BDT',
  'year',
  20,
  30,
  42949672960,
  2000,
  0.40,
  '["finance","documents","subAgents","services.touristVisa","services.studentVisa","services.workPermitVisa","services.hajjUmrahVisa","services.medicalVisa","services.airTicket","services.hotelBooking","services.tourPackage"]'::jsonb,
  '{"label":"Growth","includesSubAgents":true,"isHighlighted":true,"badge":"Popular"}'::jsonb,
  true,
  true
),
(
  'business-year',
  'Business',
  'Annual Business — two months free vs monthly.',
  60,
  140000,
  'BDT',
  'year',
  60,
  100,
  107374182400,
  8000,
  0.30,
  '["finance","documents","subAgents","hr","services.touristVisa","services.studentVisa","services.workPermitVisa","services.hajjUmrahVisa","services.medicalVisa","services.airTicket","services.hotelBooking","services.tourPackage"]'::jsonb,
  '{"label":"Business","includesSubAgents":true,"includesHr":true}'::jsonb,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  price_bdt = EXCLUDED.price_bdt,
  currency = EXCLUDED.currency,
  interval = EXCLUDED.interval,
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
VALUES ('017_annual_plans')
ON CONFLICT (id) DO NOTHING;
