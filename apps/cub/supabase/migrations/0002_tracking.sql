-- Tracking tables: logs, memories, appointments, trips, expenses, milestones,
-- checklists. Same rule as the core schema — every table is household-scoped
-- and every table has RLS.

-- Logs ----------------------------------------------------------------------

create table public.weight_logs (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date         date not null,
  weight_kg    numeric(5, 2) not null check (weight_kg between 20 and 300),
  note         text,
  logged_by    uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (household_id, date)
);

create table public.symptom_logs (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date         date not null,
  tags         text[] not null default '{}',
  severity     smallint check (severity between 1 and 5),
  notes        text,
  logged_by    uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table public.caffeine_logs (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  logged_at    timestamptz not null default now(),
  source       text not null,
  mg           integer not null check (mg >= 0 and mg <= 2000),
  logged_by    uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

create type public.food_safety_flag as enum ('safe', 'caution', 'avoid', 'unsure');

create table public.food_logs (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date         date not null,
  meal         text,
  description  text not null,
  safety_flag  public.food_safety_flag not null default 'unsure',
  note         text,
  logged_by    uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Memories ------------------------------------------------------------------

create type public.memory_type as enum ('photo', 'video');

create table public.memories (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  date            date not null,
  type            public.memory_type not null,
  storage_path    text not null,
  thumb_path      text,
  caption         text,
  week            smallint,
  tags            text[] not null default '{}',
  include_in_book boolean not null default true,
  is_favourite    boolean not null default false,
  is_bump_photo   boolean not null default false,
  logged_by       uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index memories_household_date_idx on public.memories (household_id, date desc);
create index memories_week_idx on public.memories (household_id, week);

-- Appointments --------------------------------------------------------------

create table public.appointments (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  scheduled_at    timestamptz not null,
  type            text not null,
  doctor          text,
  location        text,
  questions       text[] not null default '{}',
  notes           text,
  results_summary text,
  done            boolean not null default false,
  created_at      timestamptz not null default now()
);

create index appointments_household_time_idx on public.appointments (household_id, scheduled_at);

-- Travel --------------------------------------------------------------------

create type public.trip_risk_level as enum ('low', 'moderate', 'high', 'avoid');

create table public.trips (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households (id) on delete cascade,
  name             text not null,
  destination      text not null,
  start_date       date not null,
  end_date         date not null,
  -- Denormalised for display only; the live value is recomputed from the EDD
  -- so that editing the EDD re-dates every trip.
  week_at_start    smallint,
  risk_level       public.trip_risk_level not null default 'low',
  zika_flag        boolean not null default false,
  ob_clearance     boolean not null default false,
  notes            text,
  checklist        jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now(),
  constraint trips_date_order check (end_date >= start_date)
);

-- Expenses ------------------------------------------------------------------

create type public.expense_phase as enum ('pregnancy', 'y0', 'y1', 'y2', 'y3', 'y4', 'y5');

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  phase        public.expense_phase not null,
  category     text not null,
  item         text not null,
  budget_php   numeric(12, 2),
  actual_php   numeric(12, 2),
  date         date,
  notes        text,
  created_at   timestamptz not null default now()
);

create index expenses_household_phase_idx on public.expenses (household_id, phase);

-- Milestones ----------------------------------------------------------------

create table public.milestones (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  type         text not null,
  title        text not null,
  target_date  date,
  done         boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now()
);

-- Checklists ----------------------------------------------------------------

create table public.checklists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  slug         text not null,
  title        text not null,
  created_at   timestamptz not null default now(),
  unique (household_id, slug)
);

create table public.checklist_items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  checklist_id uuid not null references public.checklists (id) on delete cascade,
  label        text not null,
  note         text,
  price_php    numeric(12, 2),
  bought       boolean not null default false,
  done         boolean not null default false,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create index checklist_items_checklist_idx on public.checklist_items (checklist_id, position);

-- Movement ------------------------------------------------------------------

create table public.stretch_sessions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date         date not null,
  routine_id   text not null,
  completed    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.walk_logs (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date         date not null,
  minutes      integer check (minutes between 0 and 600),
  distance_km  numeric(6, 2),
  notes        text,
  created_at   timestamptz not null default now()
);

-- Row level security --------------------------------------------------------

/*
 * Every table above is household-scoped in exactly the same way, so the
 * policies are generated rather than hand-written: a hand-written list is where
 * a table eventually gets forgotten, and a forgotten table here means one
 * household reading another's medical history.
 */
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'weight_logs', 'symptom_logs', 'caffeine_logs', 'food_logs', 'memories',
    'appointments', 'trips', 'expenses', 'milestones', 'checklists',
    'checklist_items', 'stretch_sessions', 'walk_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (household_id = public.current_household_id())
         with check (household_id = public.current_household_id())',
      tbl || '_household_access', tbl
    );
  end loop;
end;
$$;

/*
 * Belt and braces: fails the migration if any public table ends up without RLS.
 * This is what actually keeps the "RLS on every table" guarantee true as the
 * schema grows, rather than a reviewer noticing.
 */
do $$
declare
  unprotected text;
begin
  select string_agg(c.relname, ', ')
    into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if unprotected is not null then
    raise exception 'Tables without row level security: %', unprotected;
  end if;
end;
$$;
