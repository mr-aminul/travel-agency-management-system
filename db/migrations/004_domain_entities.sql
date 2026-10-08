-- Row-level domain entities (clients, service cases, payments).
-- Payload jsonb keeps the SPA shape; indexed columns enable tenant isolation + lookups.

create table if not exists platform.clients (
  tenant_id text not null,
  id text not null,
  payload jsonb not null,
  name text,
  phone text,
  passport text,
  archived_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists clients_tenant_passport_idx
  on platform.clients (tenant_id, passport);
create index if not exists clients_tenant_updated_idx
  on platform.clients (tenant_id, updated_at desc);

create table if not exists platform.client_trash (
  tenant_id text not null,
  id text not null,
  payload jsonb not null,
  deleted_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists platform.cases (
  tenant_id text not null,
  id text not null,
  client_id text,
  payload jsonb not null,
  status text,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists cases_tenant_client_idx
  on platform.cases (tenant_id, client_id);
create index if not exists cases_tenant_status_idx
  on platform.cases (tenant_id, status);

create table if not exists platform.payments (
  tenant_id text not null,
  id text not null,
  client_id text,
  case_id text,
  payload jsonb not null,
  amount numeric(14, 2),
  created_on date,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists payments_tenant_case_idx
  on platform.payments (tenant_id, case_id);
create index if not exists payments_tenant_created_idx
  on platform.payments (tenant_id, created_on desc);
