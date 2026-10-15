-- Hosted checkout sessions for public case invoices (Paymently / mock).

create table if not exists platform.client_invoice_checkouts (
  id text primary key,
  share_id text not null,
  token text not null,
  tenant_id text not null,
  case_id text not null,
  amount_bdt numeric not null check (amount_bdt > 0),
  status text not null default 'pending',
  gateway_payment_id text,
  payment_id text,
  payment_method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists client_invoice_checkouts_token_idx
  on platform.client_invoice_checkouts (token, created_at desc);

create index if not exists client_invoice_checkouts_share_idx
  on platform.client_invoice_checkouts (share_id, status);

create unique index if not exists client_invoice_checkouts_gateway_id_idx
  on platform.client_invoice_checkouts (gateway_payment_id)
  where gateway_payment_id is not null;

insert into platform.schema_migrations (id)
values ('012_client_invoice_checkouts')
on conflict (id) do nothing;
