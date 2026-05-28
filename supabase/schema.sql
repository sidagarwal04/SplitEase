-- ============================================================================
-- SplitEase — Supabase schema, policies, triggers and storage.
-- Paste this into the Supabase SQL editor (or use `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / drop-and-create policies where needed.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- profiles  (mirror of auth.users we can join from public schema)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- groups
-- ----------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text default '💸',
  description text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- group_members
-- ----------------------------------------------------------------------------
create table if not exists public.group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists idx_group_members_group on public.group_members (group_id);
create index if not exists idx_group_members_user on public.group_members (user_id);

-- ----------------------------------------------------------------------------
-- expenses
-- ----------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups (id) on delete cascade,
  paid_by uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  category text default 'general',
  date date not null default current_date,
  receipt_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_group on public.expenses (group_id, date desc);
create index if not exists idx_expenses_paid_by on public.expenses (paid_by);

-- ----------------------------------------------------------------------------
-- expense_splits
-- ----------------------------------------------------------------------------
create table if not exists public.expense_splits (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  split_type text not null default 'equal' check (split_type in ('equal', 'exact', 'percent', 'share'))
);

create index if not exists idx_splits_expense on public.expense_splits (expense_id);
create index if not exists idx_splits_user on public.expense_splits (user_id);

-- ----------------------------------------------------------------------------
-- settlements
-- ----------------------------------------------------------------------------
create table if not exists public.settlements (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups (id) on delete cascade,
  from_user_id uuid not null references public.profiles (id) on delete restrict,
  to_user_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  note text,
  settled_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);

create index if not exists idx_settlements_group on public.settlements (group_id, settled_at desc);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  related_group_id uuid references public.groups (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, is_read, created_at desc);

-- ============================================================================
-- TRIGGER: keep `profiles` in sync with `auth.users`
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- HELPER FUNCTION: is the current user a member of the given group?
-- (Avoids recursive RLS evaluation on group_members.)
-- ============================================================================
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.notifications enable row level security;

-- ----- profiles -------------------------------------------------------------
drop policy if exists "profiles: read all signed-in" on public.profiles;
create policy "profiles: read all signed-in"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  with check (id = auth.uid());

-- ----- groups ---------------------------------------------------------------
drop policy if exists "groups: members read" on public.groups;
create policy "groups: members read"
  on public.groups for select
  using (public.is_group_member(id));

drop policy if exists "groups: any auth can create" on public.groups;
create policy "groups: any auth can create"
  on public.groups for insert
  with check (created_by = auth.uid());

drop policy if exists "groups: creator updates" on public.groups;
create policy "groups: creator updates"
  on public.groups for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "groups: creator deletes" on public.groups;
create policy "groups: creator deletes"
  on public.groups for delete
  using (created_by = auth.uid());

-- ----- group_members --------------------------------------------------------
drop policy if exists "members: members read" on public.group_members;
create policy "members: members read"
  on public.group_members for select
  using (public.is_group_member(group_id));

-- Insert: a user can add themself; admins can add anyone (we keep this simple — service role handles invites)
drop policy if exists "members: self insert" on public.group_members;
create policy "members: self insert"
  on public.group_members for insert
  with check (user_id = auth.uid());

drop policy if exists "members: self delete (leave)" on public.group_members;
create policy "members: self delete (leave)"
  on public.group_members for delete
  using (user_id = auth.uid());

-- ----- expenses -------------------------------------------------------------
drop policy if exists "expenses: members read" on public.expenses;
create policy "expenses: members read"
  on public.expenses for select
  using (public.is_group_member(group_id));

drop policy if exists "expenses: members insert" on public.expenses;
create policy "expenses: members insert"
  on public.expenses for insert
  with check (public.is_group_member(group_id));

drop policy if exists "expenses: creator updates" on public.expenses;
create policy "expenses: creator updates"
  on public.expenses for update
  using (paid_by = auth.uid())
  with check (paid_by = auth.uid());

drop policy if exists "expenses: creator deletes" on public.expenses;
create policy "expenses: creator deletes"
  on public.expenses for delete
  using (paid_by = auth.uid());

-- ----- expense_splits -------------------------------------------------------
drop policy if exists "splits: members read" on public.expense_splits;
create policy "splits: members read"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

drop policy if exists "splits: members write" on public.expense_splits;
create policy "splits: members write"
  on public.expense_splits for insert
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

drop policy if exists "splits: creator updates" on public.expense_splits;
create policy "splits: creator updates"
  on public.expense_splits for update
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.paid_by = auth.uid()
    )
  );

drop policy if exists "splits: creator deletes" on public.expense_splits;
create policy "splits: creator deletes"
  on public.expense_splits for delete
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.paid_by = auth.uid()
    )
  );

-- ----- settlements ----------------------------------------------------------
drop policy if exists "settlements: members read" on public.settlements;
create policy "settlements: members read"
  on public.settlements for select
  using (public.is_group_member(group_id));

drop policy if exists "settlements: members insert" on public.settlements;
create policy "settlements: members insert"
  on public.settlements for insert
  with check (
    public.is_group_member(group_id)
    and (from_user_id = auth.uid() or to_user_id = auth.uid())
  );

drop policy if exists "settlements: participants delete" on public.settlements;
create policy "settlements: participants delete"
  on public.settlements for delete
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- ----- notifications --------------------------------------------------------
drop policy if exists "notif: read own" on public.notifications;
create policy "notif: read own"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notif: update own" on public.notifications;
create policy "notif: update own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notif: delete own" on public.notifications;
create policy "notif: delete own"
  on public.notifications for delete
  using (user_id = auth.uid());

-- (Inserts come from server / webhook function using the service role, which bypasses RLS.)

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end$$;

alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_splits;
alter publication supabase_realtime add table public.settlements;
alter publication supabase_realtime add table public.notifications;

-- ============================================================================
-- STORAGE: receipts bucket (private) + policies
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Authenticated users can manage objects under their own `userId/...` prefix.
drop policy if exists "receipts: read own" on storage.objects;
create policy "receipts: read own"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );

drop policy if exists "receipts: upload own" on storage.objects;
create policy "receipts: upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );

drop policy if exists "receipts: update own" on storage.objects;
create policy "receipts: update own"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );

drop policy if exists "receipts: delete own" on storage.objects;
create policy "receipts: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );
