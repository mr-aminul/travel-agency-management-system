-- Agency can opt out of SMS when platform still allows it.
ALTER TABLE platform.tenant_billing
  ADD COLUMN IF NOT EXISTS agency_sms_enabled boolean NOT NULL DEFAULT true;
