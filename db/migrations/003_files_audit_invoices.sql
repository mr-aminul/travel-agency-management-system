-- Durable uploads, audit trail, and server-signed invoice shares.

create table if not exists platform.files (
  id text primary key,
  tenant_id text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes >= 0),
  storage_path text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists files_tenant_idx on platform.files (tenant_id);

create table if not exists platform.audit_log (
  id text primary key,
  tenant_id text,
  actor_user_id text,
  actor_email text,
  action text not null,
  entity_type text,
  entity_id text,
  summary text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_tenant_created_idx
  on platform.audit_log (tenant_id, created_at desc);

create table if not exists platform.invoice_shares (
  id text primary key,
  token text not null unique,
  tenant_id text not null,
  case_id text,
  invoice jsonb not null,
  created_by text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists invoice_shares_tenant_idx
  on platform.invoice_shares (tenant_id);
