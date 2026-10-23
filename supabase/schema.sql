-- LearnWithSulav: run this once in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text, name text, phone text, license_no text, address text, branch text, avatar_url text,
  upline_id uuid references profiles(id),
  referral_code text unique,
  role text not null default 'agent' check (role in ('agent','admin')),
  membership text not null default 'free' check (membership in ('free','premium')),
  status text not null default 'active',
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references profiles(id) on delete cascade,
  name text not null, phone text, stage text not null default 'New Lead', plan_interest text,
  est_premium numeric, follow_up_date date, renewal_date date, notes text,
  created_at timestamptz default now()
);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references profiles(id) on delete cascade,
  client_name text, plan_type text not null,
  premium_mode text not null check (premium_mode in ('single','regular')),
  term_years int not null, premium numeric not null, sum_assured numeric,
  issue_date date not null default current_date, next_due_date date,
  created_at timestamptz default now()
);

create table if not exists schemes (
  id uuid primary key default gen_random_uuid(),
  title text not null, month_label text, target numeric default 0, criteria text, active boolean default true,
  created_at timestamptz default now()
);
create table if not exists scheme_status (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references schemes(id) on delete cascade,
  agent_id uuid not null references profiles(id) on delete cascade,
  achieved numeric default 0, status text default 'pending' check (status in ('pending','qualified','not_qualified')), note text,
  created_at timestamptz default now(), unique (scheme_id, agent_id)
);

create table if not exists exam_attempts (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone text not null,
  question_ids int[] not null, answers jsonb,
  ends_at timestamptz not null, submitted_at timestamptz,
  score int, max_marks int, passed boolean, cert_id text,
  created_at timestamptz default now()
);
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor text, action text, meta jsonb, created_at timestamptz default now()
);

-- helpers (security definer so policies never recurse)
create or replace function is_admin() returns boolean language sql security definer stable set search_path = public
as $$ select coalesce((select role = 'admin' from profiles where id = auth.uid()), false) $$;
create or replace function my_role() returns text language sql security definer stable set search_path = public
as $$ select role from profiles where id = auth.uid() $$;
create or replace function my_membership() returns text language sql security definer stable set search_path = public
as $$ select membership from profiles where id = auth.uid() $$;
revoke execute on function is_admin(), my_role(), my_membership() from public, anon;
grant execute on function is_admin(), my_role(), my_membership() to authenticated;

-- profile created automatically on sign-up; links the upline from the referral code
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare up uuid;
begin
  select id into up from profiles where referral_code = upper(trim(coalesce(new.raw_user_meta_data->>'upline_code', '')));
  insert into profiles (id, email, name, phone, license_no, address, branch, upline_id, referral_code)
  values (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'license_no',
          new.raw_user_meta_data->>'address', new.raw_user_meta_data->>'branch', up,
          'LWS' || upper(substr(md5(random()::text || new.id::text), 1, 6)));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
revoke execute on function handle_new_user() from public, anon, authenticated;
grant execute on function handle_new_user() to supabase_auth_admin;

-- Ensure accounts created before this schema receive a profile too.
insert into profiles (id, email, name, phone, license_no, address, branch, referral_code)
select u.id, u.email, u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'phone',
       u.raw_user_meta_data->>'license_no', u.raw_user_meta_data->>'address', u.raw_user_meta_data->>'branch',
       'LWS' || upper(substr(md5(random()::text || u.id::text), 1, 6))
from auth.users u
on conflict (id) do nothing;

-- team layers: A self, B direct downline, C level 2, D level 3
create or replace function team_layers(root uuid) returns table(agent_id uuid, layer text)
language sql security definer stable set search_path = public as $$
  select root, 'A'
  union all select id, 'B' from profiles where upline_id = root
  union all select p.id, 'C' from profiles p join profiles b on p.upline_id = b.id where b.upline_id = root
  union all select p.id, 'D' from profiles p join profiles c on p.upline_id = c.id join profiles b on c.upline_id = b.id where b.upline_id = root
$$;
revoke execute on function team_layers(uuid) from public, anon, authenticated;

create or replace function team_production(root uuid, d_from date, d_to date)
returns table(layer text, agent_id uuid, agent_name text, plan_type text, premium_mode text, term_years int, premium numeric)
language plpgsql security definer stable set search_path = public as $$
begin
  if root <> auth.uid() and not is_admin() then raise exception 'not allowed'; end if;
  return query
    select l.layer, p.agent_id, pr.name, p.plan_type, p.premium_mode, p.term_years, p.premium
    from team_layers(root) l join policies p on p.agent_id = l.agent_id join profiles pr on pr.id = p.agent_id
    where p.issue_date between d_from and d_to;
end $$;
revoke execute on function team_production(uuid, date, date) from public, anon;
grant execute on function team_production(uuid, date, date) to authenticated;

-- row level security
alter table profiles enable row level security; alter table leads enable row level security;
alter table policies enable row level security; alter table schemes enable row level security;
alter table scheme_status enable row level security; alter table exam_attempts enable row level security;
alter table activity_log enable row level security;

create policy "profiles read" on profiles for select to authenticated using (id = (select auth.uid()) or is_admin());
create policy "profiles update own" on profiles for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = my_role() and membership = my_membership());
create policy "profiles admin update" on profiles for update to authenticated using (is_admin());

create policy "leads own" on leads for all to authenticated using (agent_id = (select auth.uid()) or is_admin()) with check (agent_id = (select auth.uid()) or is_admin());
create policy "policies own" on policies for all to authenticated using (agent_id = (select auth.uid()) or is_admin()) with check (agent_id = (select auth.uid()) or is_admin());

create policy "schemes read" on schemes for select to authenticated using (true);
create policy "schemes admin" on schemes for all to authenticated using (is_admin()) with check (is_admin());
create policy "scheme_status read" on scheme_status for select to authenticated using (agent_id = (select auth.uid()) or is_admin());
create policy "scheme_status admin" on scheme_status for all to authenticated using (is_admin()) with check (is_admin());

-- exam tables are written only by the server (service role); admins can read
create policy "attempts admin read" on exam_attempts for select to authenticated using (is_admin());
create policy "log admin read" on activity_log for select to authenticated using (is_admin());

-- profile photos
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
create policy "avatar read" on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');
create policy "avatar upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- real-time updates for the admin dashboard
alter publication supabase_realtime add table profiles, leads, policies, exam_attempts, scheme_status, schemes, activity_log;
-- Public agent portfolio data is separate from private account and business records.
create table if not exists public_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
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

alter table public_profiles enable row level security;
grant select on public_profiles to anon, authenticated;
grant insert, update on public_profiles to authenticated;
create policy "published portfolios are public" on public_profiles for select to anon, authenticated
  using (is_published or user_id = (select auth.uid()));
create policy "agents create own portfolio" on public_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "agents update own portfolio" on public_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create index if not exists public_profiles_published_slug_idx on public_profiles (slug) where is_published;

-- Keep user-editable profile fields narrow; account status, referral ownership,
-- email, role, and membership remain server-managed.
revoke update on profiles from authenticated;
grant update (name, phone, license_no, address, branch, avatar_url) on profiles to authenticated;
-- Paid exam passes start disabled. Set a positive NPR price in Admin to enable requests.
create table if not exists exam_pass_settings (
  id boolean primary key default true check (id),
  price numeric(10,2) not null default 0 check (price >= 0),
  currency text not null default 'NPR' check (currency = 'NPR'),
  payment_instructions text not null default 'Contact support for payment instructions.',
  active boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into exam_pass_settings (id, price, active) values (true, 0, false) on conflict (id) do nothing;
alter table exam_pass_settings enable row level security;
alter table exam_pass_settings add column if not exists payment_instructions text not null default 'Contact support for payment instructions.';
create policy "admins read exam pass settings" on exam_pass_settings for select to authenticated using (is_admin());

create table if not exists exam_pass_orders (
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
alter table exam_pass_orders enable row level security;
create policy "admins read exam pass orders" on exam_pass_orders for select to authenticated using (is_admin());
grant select on exam_pass_settings, exam_pass_orders to authenticated;
create index if not exists exam_pass_orders_status_created_idx on exam_pass_orders (status, created_at desc);
alter table exam_attempts add column if not exists pass_order_id uuid references exam_pass_orders(id);
create unique index if not exists exam_attempts_pass_order_idx on exam_attempts (pass_order_id) where pass_order_id is not null;
