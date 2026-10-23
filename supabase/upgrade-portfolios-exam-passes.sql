-- Run once on an existing AMS database before deploying the portfolio and paid-pass code.
-- This script only adds structures and grants; it does not remove or rewrite existing rows.

create table if not exists public.public_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (length(trim(display_name)) between 2 and 100),
  headline text check (headline is null or length(headline) <= 160),
  bio text check (bio is null or length(bio) <= 2000),
  photo_url text,
  public_phone text check (public_phone is null or length(public_phone) <= 30),
  public_email text check (public_email is null or length(public_email) <= 254),
  specialties text[] not null default '{}',
  city text check (city is null or length(city) <= 100),
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.public_profiles enable row level security;
grant select on public.public_profiles to anon, authenticated;
grant insert, update on public.public_profiles to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'public_profiles' and policyname = 'published portfolios are public') then
    execute $policy$create policy "published portfolios are public" on public.public_profiles for select to anon, authenticated using (is_published or user_id = (select auth.uid()))$policy$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'public_profiles' and policyname = 'agents create own portfolio') then
    execute $policy$create policy "agents create own portfolio" on public.public_profiles for insert to authenticated with check (user_id = (select auth.uid()))$policy$;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'public_profiles' and policyname = 'agents update own portfolio') then
    execute $policy$create policy "agents update own portfolio" on public.public_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$policy$;
  end if;
end $$;
create index if not exists public_profiles_published_slug_idx on public.public_profiles (slug) where is_published;

revoke update on public.profiles from authenticated;
grant update (name, phone, license_no, address, branch, avatar_url) on public.profiles to authenticated;

create table if not exists public.exam_pass_settings (
  id boolean primary key default true check (id),
  price numeric(10,2) not null default 0 check (price >= 0),
  currency text not null default 'NPR' check (currency = 'NPR'),
  payment_instructions text not null default 'Contact support for payment instructions.',
  active boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.exam_pass_settings add column if not exists payment_instructions text not null default 'Contact support for payment instructions.';
insert into public.exam_pass_settings (id, price, active) values (true, 0, false) on conflict (id) do nothing;
alter table public.exam_pass_settings enable row level security;
grant select on public.exam_pass_settings to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exam_pass_settings' and policyname = 'admins read exam pass settings') then
    execute $policy$create policy "admins read exam pass settings" on public.exam_pass_settings for select to authenticated using (is_admin())$policy$;
  end if;
end $$;

create table if not exists public.exam_pass_orders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  phone text not null check (length(phone) between 7 and 20),
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'NPR' check (currency = 'NPR'),
  payment_method text not null check (length(payment_method) between 2 and 40),
  receipt_reference text not null check (length(trim(receipt_reference)) between 3 and 120),
  claim_token_hash text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','redeemed')),
  pass_code text unique,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.exam_pass_orders enable row level security;
grant select on public.exam_pass_orders to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exam_pass_orders' and policyname = 'admins read exam pass orders') then
    execute $policy$create policy "admins read exam pass orders" on public.exam_pass_orders for select to authenticated using (is_admin())$policy$;
  end if;
end $$;
create index if not exists exam_pass_orders_status_created_idx on public.exam_pass_orders (status, created_at desc);
alter table public.exam_attempts add column if not exists pass_order_id uuid references public.exam_pass_orders(id);
create unique index if not exists exam_attempts_pass_order_idx on public.exam_attempts (pass_order_id) where pass_order_id is not null;
