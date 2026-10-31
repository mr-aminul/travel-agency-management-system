-- Per-agency email allow (platform) + agency opt-out. Default on.
ALTER TABLE platform.tenant_billing
  ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE platform.tenant_billing
  ADD COLUMN IF NOT EXISTS agency_email_enabled boolean NOT NULL DEFAULT true;
