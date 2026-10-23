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

-- row level security
alter table profiles enable row level security; alter table leads enable row level security;
alter table policies enable row level security; alter table schemes enable row level security;
alter table scheme_status enable row level security; alter table exam_attempts enable row level security;
alter table activity_log enable row level security;

create policy "profiles read" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles update own" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = my_role() and membership = my_membership());
create policy "profiles admin update" on profiles for update using (is_admin());

create policy "leads own" on leads for all using (agent_id = auth.uid() or is_admin()) with check (agent_id = auth.uid() or is_admin());
create policy "policies own" on policies for all using (agent_id = auth.uid() or is_admin()) with check (agent_id = auth.uid() or is_admin());

create policy "schemes read" on schemes for select to authenticated using (true);
create policy "schemes admin" on schemes for all using (is_admin()) with check (is_admin());
create policy "scheme_status read" on scheme_status for select using (agent_id = auth.uid() or is_admin());
create policy "scheme_status admin" on scheme_status for all using (is_admin()) with check (is_admin());

-- exam tables are written only by the server (service role); admins can read
create policy "attempts admin read" on exam_attempts for select using (is_admin());
create policy "log admin read" on activity_log for select using (is_admin());

-- profile photos
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
create policy "avatar read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- real-time updates for the admin dashboard
alter publication supabase_realtime add table profiles, leads, policies, exam_attempts, scheme_status, schemes, activity_log;
