-- Sub-agent logins: platform role + link to CRM sub-agent record.

alter table platform.users
  drop constraint if exists users_role_check;

alter table platform.users
  add constraint users_role_check
  check (role in ('platform_admin', 'agency_user', 'sub_agent'));

alter table platform.users
  add column if not exists sub_agent_id text;

comment on column platform.users.sub_agent_id is
  'CRM sub-agent id (e.g. AGT-T0001) when role = sub_agent.';

create index if not exists users_sub_agent_id_idx
  on platform.users (sub_agent_id)
  where sub_agent_id is not null;

alter table platform.invites
  add column if not exists sub_agent_id text;

comment on column platform.invites.sub_agent_id is
  'When set, accepting creates a sub_agent login linked to this CRM record.';

insert into platform.schema_migrations (id)
values ('008_sub_agent_auth')
on conflict (id) do nothing;
