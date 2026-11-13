-- Enforce that client / case / payment ids are globally unique across agencies.
-- Composite PK (tenant_id, id) stays; this blocks shadow copies of the same id
-- into a second tenant (the failure mode View-as / stale cache used to create).

-- Clients: keep the oldest row per id; drop newer clones and their related rows.
with ranked as (
  select
    tenant_id,
    id,
    row_number() over (
      partition by id
      order by
        coalesce(
          nullif(payload->>'createdAt', '')::timestamptz,
          updated_at
        ) asc nulls last,
        tenant_id asc
    ) as rn
  from platform.clients
),
dupes as (
  select tenant_id, id from ranked where rn > 1
)
delete from platform.payments p
using dupes d
where p.tenant_id = d.tenant_id and p.client_id = d.id;

with ranked as (
  select
    tenant_id,
    id,
    row_number() over (
      partition by id
      order by
        coalesce(
          nullif(payload->>'createdAt', '')::timestamptz,
          updated_at
        ) asc nulls last,
        tenant_id asc
    ) as rn
  from platform.clients
),
dupes as (
  select tenant_id, id from ranked where rn > 1
)
delete from platform.cases c
using dupes d
where c.tenant_id = d.tenant_id and c.client_id = d.id;

with ranked as (
  select
    tenant_id,
    id,
    row_number() over (
      partition by id
      order by
        coalesce(
          nullif(payload->>'createdAt', '')::timestamptz,
          updated_at
        ) asc nulls last,
        tenant_id asc
    ) as rn
  from platform.clients
),
dupes as (
  select tenant_id, id from ranked where rn > 1
)
delete from platform.client_trash t
using dupes d
where t.tenant_id = d.tenant_id and t.id = d.id;

with ranked as (
  select
    tenant_id,
    id,
    row_number() over (
      partition by id
      order by
        coalesce(
          nullif(payload->>'createdAt', '')::timestamptz,
          updated_at
        ) asc nulls last,
        tenant_id asc
    ) as rn
  from platform.clients
),
dupes as (
  select tenant_id, id from ranked where rn > 1
)
delete from platform.clients c
using dupes d
where c.tenant_id = d.tenant_id and c.id = d.id;

-- Cases: keep oldest per id.
with ranked as (
  select
    tenant_id,
    id,
    row_number() over (
      partition by id
      order by
        coalesce(
          nullif(payload->>'createdAt', '')::timestamptz,
          updated_at
        ) asc nulls last,
        tenant_id asc
    ) as rn
  from platform.cases
),
dupes as (
  select tenant_id, id from ranked where rn > 1
)
delete from platform.payments p
using dupes d
where p.tenant_id = d.tenant_id and p.case_id = d.id;

with ranked as (
  select
    tenant_id,
    id,
    row_number() over (
      partition by id
      order by
        coalesce(
          nullif(payload->>'createdAt', '')::timestamptz,
          updated_at
        ) asc nulls last,
        tenant_id asc
    ) as rn
  from platform.cases
),
dupes as (
  select tenant_id, id from ranked where rn > 1
)
delete from platform.cases c
using dupes d
where c.tenant_id = d.tenant_id and c.id = d.id;

-- Payments: keep oldest per id.
with ranked as (
  select
    tenant_id,
    id,
    row_number() over (
      partition by id
      order by
        coalesce(
          nullif(payload->>'createdAt', '')::timestamptz,
          updated_at
        ) asc nulls last,
        tenant_id asc
    ) as rn
  from platform.payments
),
dupes as (
  select tenant_id, id from ranked where rn > 1
)
delete from platform.payments p
using dupes d
where p.tenant_id = d.tenant_id and p.id = d.id;

-- Trash: keep oldest per id across agencies.
with ranked as (
  select
    tenant_id,
    id,
    row_number() over (
      partition by id
      order by deleted_at asc nulls last, tenant_id asc
    ) as rn
  from platform.client_trash
),
dupes as (
  select tenant_id, id from ranked where rn > 1
)
delete from platform.client_trash t
using dupes d
where t.tenant_id = d.tenant_id and t.id = d.id;

create unique index if not exists clients_id_global_uidx
  on platform.clients (id);

create unique index if not exists cases_id_global_uidx
  on platform.cases (id);

create unique index if not exists payments_id_global_uidx
  on platform.payments (id);

create unique index if not exists client_trash_id_global_uidx
  on platform.client_trash (id);
