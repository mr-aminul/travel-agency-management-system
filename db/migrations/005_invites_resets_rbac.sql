-- Invites, password resets, and member role on users for server RBAC.

alter table platform.users
  add column if not exists member_role text;

comment on column platform.users.member_role is
  'Agency role: owner | manager | staff. Null for platform_admin.';

create table if not exists platform.invites (
  id text primary key,
  token text not null unique,
  tenant_id text not null,
  email text not null,
  name text not null,
  member_role text not null default 'staff',
  invited_by text,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invites_tenant_email_idx
  on platform.invites (tenant_id, lower(email));

create table if not exists platform.password_resets (
  id text primary key,
  token text not null unique,
  user_id text not null references platform.users(id) on delete cascade,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_user_idx
  on platform.password_resets (user_id);
