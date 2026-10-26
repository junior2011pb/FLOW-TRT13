create table if not exists public.flow_state (
  id smallint primary key check (id = 1),
  records jsonb not null default '[]'::jsonb check (jsonb_typeof(records) = 'array'),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.flow_assets (
  id smallint primary key check (id = 1),
  logo_data text,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.flow_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.flow_state (id, records)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

insert into public.flow_assets (id, logo_data)
values (1, null)
on conflict (id) do nothing;

alter table public.flow_state enable row level security;
alter table public.flow_assets enable row level security;
alter table public.flow_admins enable row level security;

revoke all on public.flow_state from anon, authenticated;
revoke all on public.flow_assets from anon, authenticated;
revoke all on public.flow_admins from anon, authenticated;
grant select on public.flow_state to anon, authenticated;
grant select on public.flow_assets to anon, authenticated;

 drop policy if exists flow_state_public_read on public.flow_state;
create policy flow_state_public_read on public.flow_state
  for select to anon, authenticated using (true);

drop policy if exists flow_assets_public_read on public.flow_assets;
create policy flow_assets_public_read on public.flow_assets
  for select to anon, authenticated using (true);

create or replace function public.flow_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.flow_admins where user_id = auth.uid()
  );
$$;

create or replace function public.flow_save_state(p_records jsonb, p_expected_revision bigint)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_revision bigint;
begin
  if not public.flow_is_admin() then
    raise exception using errcode = '42501', message = 'Admin FLOW não autorizado.';
  end if;
  if jsonb_typeof(p_records) <> 'array' or octet_length(p_records::text) > 950000 then
    raise exception using errcode = '22023', message = 'Formato ou tamanho dos dados inválido.';
  end if;

  update public.flow_state
     set records = p_records,
         revision = revision + 1,
         updated_at = now()
   where id = 1 and revision = p_expected_revision
   returning revision into next_revision;

  if next_revision is null then
    raise exception using errcode = '40001', message = 'Os dados mudaram; atualize e tente novamente.';
  end if;
  return next_revision;
end;
$$;

create or replace function public.flow_save_logo(p_logo_data text, p_expected_revision bigint)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_revision bigint;
begin
  if not public.flow_is_admin() then
    raise exception using errcode = '42501', message = 'Admin FLOW não autorizado.';
  end if;
  if p_logo_data is not null and (
    length(p_logo_data) > 800000 or
    p_logo_data !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'
  ) then
    raise exception using errcode = '22023', message = 'Formato ou tamanho da logo inválido.';
  end if;

  update public.flow_assets
     set logo_data = p_logo_data,
         revision = revision + 1,
         updated_at = now()
   where id = 1 and revision = p_expected_revision
   returning revision into next_revision;

  if next_revision is null then
    raise exception using errcode = '40001', message = 'A logo mudou; atualize e tente novamente.';
  end if;
  return next_revision;
end;
$$;

revoke all on function public.flow_is_admin() from public, anon;
revoke all on function public.flow_save_state(jsonb, bigint) from public, anon;
revoke all on function public.flow_save_logo(text, bigint) from public, anon;
grant execute on function public.flow_is_admin() to authenticated;
grant execute on function public.flow_save_state(jsonb, bigint) to authenticated;
grant execute on function public.flow_save_logo(text, bigint) to authenticated;
