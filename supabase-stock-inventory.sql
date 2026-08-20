-- Запусти цей файл один раз у Supabase: SQL Editor → New query → Run.
-- Він створить зручну таблицю складу та перенесе поточні дані з app_settings.

create table if not exists public.stock_inventory (
  id integer primary key default 1 check (id = 1),
  ssd_256 integer not null default 0 check (ssd_256 >= 0),
  ssd_512 integer not null default 0 check (ssd_512 >= 0),
  ram_8 integer not null default 0 check (ram_8 >= 0),
  ram_16 integer not null default 0 check (ram_16 >= 0),
  charger_65w integer not null default 0 check (charger_65w >= 0),
  charger_150w integer not null default 0 check (charger_150w >= 0),
  power_cables integer not null default 0 check (power_cables >= 0),
  updated_at timestamptz not null default now()
);

alter table public.stock_inventory enable row level security;

drop policy if exists "Authenticated users can manage stock inventory" on public.stock_inventory;
create policy "Authenticated users can manage stock inventory"
on public.stock_inventory
for all
to authenticated
using (true)
with check (true);

insert into public.stock_inventory (
  id, ssd_256, ssd_512, ram_8, ram_16, charger_65w, charger_150w, power_cables
)
select
  1,
  coalesce((value::jsonb ->> 'ssd256')::integer, 0),
  coalesce((value::jsonb ->> 'ssd512')::integer, 0),
  coalesce((value::jsonb ->> 'ram8')::integer, 0),
  coalesce((value::jsonb ->> 'ram16')::integer, 0),
  coalesce((value::jsonb ->> 'charger65')::integer, 0),
  coalesce((value::jsonb ->> 'charger150')::integer, 0),
  coalesce((value::jsonb ->> 'powerCables')::integer, 0)
from public.app_settings
where key = 'stock_parts'
on conflict (id) do nothing;

insert into public.stock_inventory (id)
values (1)
on conflict (id) do nothing;
