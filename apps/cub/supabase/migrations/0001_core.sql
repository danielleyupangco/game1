-- Core household, identity and pregnancy tables.
--
-- Every table in this app is scoped by household_id and carries RLS. The whole
-- access model reduces to one question: does this row's household match the
-- caller's? current_household_id() answers it, and each policy is a one-liner
-- on top of that.

create extension if not exists "pgcrypto";

-- Households ----------------------------------------------------------------

create table public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Our household',
  created_at timestamptz not null default now()
);

-- Profiles ------------------------------------------------------------------

create type public.household_role as enum ('mom', 'dad');

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  role         public.household_role,
  display_name text,
  email        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index profiles_household_id_idx on public.profiles (household_id);

/*
 * The caller's household.
 *
 * SECURITY DEFINER is load-bearing, not a shortcut: every other policy compares
 * against this, and profiles is itself an RLS-protected table. Reading it from
 * inside a policy on profiles would recurse, so this function deliberately runs
 * as the owner. It is therefore kept minimal — one indexed lookup keyed on
 * auth.uid(), no parameters an attacker could influence — and search_path is
 * pinned so a shadowing table on a user-writable schema cannot hijack it.
 */
create function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_household_id() from public;
grant execute on function public.current_household_id() to authenticated;

-- Keeps profiles in step with auth.users, so a signup always has a row to
-- attach a household to during onboarding.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Invites -------------------------------------------------------------------

create table public.household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email        text not null,
  role         public.household_role not null default 'dad',
  token        uuid not null unique default gen_random_uuid(),
  invited_by   uuid references public.profiles (id) on delete set null,
  accepted_at  timestamptz,
  expires_at   timestamptz not null default now() + interval '14 days',
  created_at   timestamptz not null default now()
);

create index household_invites_email_idx on public.household_invites (lower(email));

-- One invite row per address per household. A re-invite refreshes the existing
-- row (new token, cleared acceptance) rather than accumulating duplicates, so
-- this is a plain constraint the app can upsert onto.
alter table public.household_invites
  add constraint household_invites_household_email_key unique (household_id, email);

-- Pregnancy -----------------------------------------------------------------

create table public.pregnancy (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null unique references public.households (id) on delete cascade,
  edd                date not null,
  conception_date    date,
  -- Clinic dating adjustment applied on top of the 280-day count; see
  -- src/lib/pregnancy.ts. A dating scan correction is applied here.
  dating_offset_days smallint not null default 2,
  ob_name            text default 'Dra. Fe Villafria',
  ob_phone           text,
  hospital           text default 'Makati Medical Center',
  er_phone           text,
  prepreg_weight_kg  numeric(5, 2),
  height_cm          numeric(5, 2),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint pregnancy_weight_range check (prepreg_weight_kg is null or prepreg_weight_kg between 20 and 300),
  constraint pregnancy_height_range check (height_cm is null or height_cm between 100 and 250),
  constraint pregnancy_offset_range check (dating_offset_days between -14 and 14)
);

-- Row level security --------------------------------------------------------

alter table public.households        enable row level security;
alter table public.profiles          enable row level security;
alter table public.household_invites enable row level security;
alter table public.pregnancy         enable row level security;

-- Households: visible to their own members only.
create policy households_select on public.households
  for select to authenticated
  using (id = public.current_household_id());

create policy households_update on public.households
  for update to authenticated
  using (id = public.current_household_id())
  with check (id = public.current_household_id());

-- Anyone signed in may create a household; they join it in the same flow.
create policy households_insert on public.households
  for insert to authenticated
  with check (true);

-- Profiles: your own row, plus your household-mates'.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or household_id = public.current_household_id());

/*
 * A user may only ever edit their own profile row.
 *
 * Note what this policy deliberately does NOT do: it does not constrain
 * household_id. A WITH CHECK clause cannot express "only into a household you
 * were invited to" without re-reading the invites table under RLS, so the
 * constraint is enforced by the guard trigger below instead. Without that
 * trigger this policy would let any signed-in user type another household's
 * UUID into their own profile and read that family's entire history.
 */
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- Invites: household members manage them; an invitee sees the one addressed to
-- their own email so the app can show "you've been invited" before they join.
create policy invites_select on public.household_invites
  for select to authenticated
  using (
    household_id = public.current_household_id()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy invites_insert on public.household_invites
  for insert to authenticated
  with check (household_id = public.current_household_id());

create policy invites_delete on public.household_invites
  for delete to authenticated
  using (household_id = public.current_household_id());

-- Pregnancy: household-scoped, full read/write for both partners.
create policy pregnancy_all on public.pregnancy
  for all to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());

-- Joining a household -------------------------------------------------------

/*
 * Redeems an invite token.
 *
 * This is the only path into an existing household, which is why it is a
 * function rather than an RLS policy: the caller must prove they hold the
 * token AND that it was addressed to their own verified email, and neither
 * check can be expressed as a policy on profiles without also letting a user
 * write household_id directly.
 */
create function public.join_household_with_token(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  invite public.household_invites;
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into invite
  from public.household_invites
  where token = invite_token
    and accepted_at is null
    and expires_at > now();

  if invite is null then
    raise exception 'This invite is no longer valid';
  end if;

  if lower(invite.email) <> caller_email then
    raise exception 'This invite was sent to a different email address';
  end if;

  -- Authorises the household change for the guard trigger. set_config with
  -- is_local => true scopes it to this transaction, so it cannot leak into
  -- any later statement on the same connection.
  perform set_config('app.household_change_authorised', 'on', true);

  update public.profiles
     set household_id = invite.household_id,
         role = coalesce(role, invite.role),
         updated_at = now()
   where id = auth.uid();

  update public.household_invites
     set accepted_at = now()
   where id = invite.id;

  return invite.household_id;
end;
$$;

revoke all on function public.join_household_with_token(uuid) from public;
grant execute on function public.join_household_with_token(uuid) to authenticated;

-- Guarding household membership ---------------------------------------------

/*
 * Membership may only change through create_household_and_join() or
 * join_household_with_token(), both of which set the transaction-local flag
 * this trigger looks for. Any other attempt -- including a direct PATCH to
 * /rest/v1/profiles with someone else's household UUID, which RLS alone would
 * permit -- is rejected.
 */
create function public.guard_profile_household_change()
returns trigger
language plpgsql
as $$
begin
  if new.household_id is distinct from old.household_id
     and coalesce(current_setting('app.household_change_authorised', true), 'off') <> 'on'
  then
    raise exception 'Household membership can only change by creating or joining a household'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_household
  before update on public.profiles
  for each row execute function public.guard_profile_household_change();

/*
 * Onboarding's first step: create a household and become its first member.
 *
 * Bundled into one function so the two writes cannot half-succeed and leave a
 * user stranded next to an empty household they are not in.
 */
create function public.create_household_and_join(
  household_name text default 'Our household',
  member_role public.household_role default 'mom',
  member_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_household_id uuid;
  existing_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select household_id into existing_household_id
  from public.profiles where id = auth.uid();

  -- Re-running onboarding must not orphan the household already in use.
  if existing_household_id is not null then
    return existing_household_id;
  end if;

  insert into public.households (name)
  values (coalesce(nullif(trim(household_name), ''), 'Our household'))
  returning id into new_household_id;

  perform set_config('app.household_change_authorised', 'on', true);

  update public.profiles
     set household_id = new_household_id,
         role = member_role,
         display_name = coalesce(nullif(trim(member_display_name), ''), display_name),
         updated_at = now()
   where id = auth.uid();

  return new_household_id;
end;
$$;

revoke all on function public.create_household_and_join(text, public.household_role, text) from public;
grant execute on function public.create_household_and_join(text, public.household_role, text) to authenticated;

-- Keeps updated_at honest without the client having to remember.
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pregnancy_touch before update on public.pregnancy
  for each row execute function public.touch_updated_at();

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
