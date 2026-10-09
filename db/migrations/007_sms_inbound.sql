-- Inbound SMS from provider webhooks (SMSQ MO). Receive-only — no outbound send.

create table if not exists platform.sms_inbound (
  id text primary key,
  tenant_id text not null,
  client_id text,
  from_phone text not null,
  body text not null default '',
  what text,
  who text,
  sender text,
  circle text,
  operator text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sms_inbound_tenant_created_idx
  on platform.sms_inbound (tenant_id, created_at desc);

create index if not exists sms_inbound_tenant_client_idx
  on platform.sms_inbound (tenant_id, client_id, created_at desc);

create index if not exists sms_inbound_tenant_from_idx
  on platform.sms_inbound (tenant_id, from_phone);
