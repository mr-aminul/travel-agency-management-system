-- Per-agency SMS kill switch (platform admin). Default on.
ALTER TABLE platform.tenant_billing
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT true;
