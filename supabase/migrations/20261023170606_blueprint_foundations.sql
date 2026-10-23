-- Additive Learn With Sulav blueprint foundations.
-- Apply after the existing AMS migrations. No existing records are deleted.

alter table public.profiles add column if not exists tenant_id uuid;
with recursive roots as (
  select id, coalesce(upline_id, id) as root_id from public.profiles where upline_id is null
  union all
  select p.id, r.root_id from public.profiles p join roots r on p.upline_id = r.id
)
update public.profiles p set tenant_id = r.root_id from roots r where p.id = r.id and p.tenant_id is null;
update public.profiles set tenant_id = id where tenant_id is null;
alter table public.profiles alter column tenant_id drop default;
alter table public.profiles alter column tenant_id set not null;
create index if not exists profiles_tenant_id_idx on public.profiles(tenant_id);

create or replace function public.assign_profile_tenant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tenant_id is null then
    select coalesce(tenant_id, id) into new.tenant_id from profiles where id = new.upline_id;
    new.tenant_id := coalesce(new.tenant_id, new.id);
  end if;
  return new;
end $$;
revoke execute on function public.assign_profile_tenant() from public, anon, authenticated;
drop trigger if exists assign_profile_tenant_before_insert on public.profiles;
create trigger assign_profile_tenant_before_insert before insert on public.profiles
for each row execute function public.assign_profile_tenant();

alter table public.leads add column if not exists tenant_id uuid;
update public.leads l set tenant_id = p.tenant_id from public.profiles p where p.id=l.agent_id and l.tenant_id is null;
alter table public.leads alter column tenant_id set not null;
alter table public.policies add column if not exists tenant_id uuid;
update public.policies l set tenant_id = p.tenant_id from public.profiles p where p.id=l.agent_id and l.tenant_id is null;
alter table public.policies alter column tenant_id set not null;
alter table public.policies add column if not exists family_group text;
alter table public.policies add column if not exists client_draft_id uuid unique;
alter table public.policies add column if not exists company text;
alter table public.policies add column if not exists collection_date date;
alter table public.policies add column if not exists commission_gross numeric(12,2) not null default 0 check (commission_gross >= 0);
alter table public.policies add column if not exists commission_tds numeric(12,2) not null default 0 check (commission_tds >= 0);
alter table public.policies add column if not exists commission_net numeric(12,2) not null default 0 check (commission_net >= 0);
create index if not exists policies_tenant_issue_idx on public.policies(tenant_id, issue_date desc);
create index if not exists policies_collection_date_idx on public.policies(collection_date) where collection_date is not null;

create or replace function public.assign_business_tenant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tenant_id is null then select tenant_id into new.tenant_id from profiles where id=new.agent_id; end if;
  return new;
end $$;
revoke execute on function public.assign_business_tenant() from public, anon, authenticated;
drop trigger if exists assign_lead_tenant_before_insert on public.leads;
create trigger assign_lead_tenant_before_insert before insert on public.leads for each row execute function public.assign_business_tenant();
drop trigger if exists assign_policy_tenant_before_insert on public.policies;
create trigger assign_policy_tenant_before_insert before insert on public.policies for each row execute function public.assign_business_tenant();

create or replace function public.calculate_policy_commission() returns trigger language plpgsql security definer set search_path=public as $$
declare rate numeric(7,4);
begin
  if new.company is not null then select tds_rate into rate from public.company_rules where lower(company)=lower(new.company); end if;
  rate := coalesce(rate,20);
  new.commission_tds := round(new.commission_gross * rate / 100, 2);
  new.commission_net := new.commission_gross - new.commission_tds;
  return new;
end $$;
revoke execute on function public.calculate_policy_commission() from public, anon, authenticated;
drop trigger if exists calculate_policy_commission_before_write on public.policies;
create trigger calculate_policy_commission_before_write before insert or update of company, commission_gross on public.policies
for each row execute function public.calculate_policy_commission();

create or replace function public.enforce_trial_policy_cap() returns trigger language plpgsql security definer set search_path=public as $$
declare plan_value text; state_value text; trial_end timestamptz; period_end timestamptz; used integer;
begin
  if auth.uid() is distinct from new.agent_id then return new; end if;
  select plan,status,trial_ends_at,period_ends_at into plan_value,state_value,trial_end,period_end from public.agency_subscriptions where agent_id=new.agent_id;
  if not found then raise exception 'Agency trial is not initialized'; end if;
  if plan_value='trial' then
    select count(*) into used from public.policies where agent_id=new.agent_id;
    if state_value <> 'trial' or now() > trial_end or used >= 5 then raise exception 'The seven day trial includes up to five policies; choose a plan to add more.'; end if;
  elsif state_value <> 'active' or period_end < now() then
    raise exception 'Your agency plan has expired. Renew to add policies.';
  end if;
  return new;
end $$;
revoke execute on function public.enforce_trial_policy_cap() from public, anon, authenticated;
drop trigger if exists enforce_trial_policy_cap_before_insert on public.policies;
create trigger enforce_trial_policy_cap_before_insert before insert on public.policies for each row execute function public.enforce_trial_policy_cap();

-- Restrict agency records to the agent's own rows. Tenant IDs are available for
-- reports and administration, while sibling agents cannot read private records.
drop policy if exists "policies own" on public.policies;
create policy "policies own tenant" on public.policies for all to authenticated
using (agent_id = (select auth.uid()) or is_admin())
with check (agent_id = (select auth.uid()) or is_admin());
drop policy if exists "leads own" on public.leads;
create policy "leads own tenant" on public.leads for all to authenticated
using (agent_id = (select auth.uid()) or is_admin())
with check (agent_id = (select auth.uid()) or is_admin());
create policy "policies require aal2" on public.policies as restrictive for all to authenticated
using ((select auth.jwt()->>'aal') = 'aal2') with check ((select auth.jwt()->>'aal') = 'aal2');
create policy "leads require aal2" on public.leads as restrictive for all to authenticated
using ((select auth.jwt()->>'aal') = 'aal2') with check ((select auth.jwt()->>'aal') = 'aal2');
create policy "profiles require aal2" on public.profiles as restrictive for select to authenticated
using ((select auth.uid()) = id or ((select auth.jwt()->>'aal') = 'aal2' and is_admin()));

create table if not exists public.agency_subscriptions (
 id uuid primary key default gen_random_uuid(), agent_id uuid not null unique references public.profiles(id) on delete cascade,
 plan text not null default 'trial' check (plan in ('trial','basic','pro')),
 status text not null default 'trial' check (status in ('trial','active','expired','cancelled')),
 trial_started_at timestamptz not null default now(), trial_ends_at timestamptz not null default (now()+interval '7 days'),
 period_started_at timestamptz, period_ends_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.agency_subscriptions enable row level security;
create policy "agents read own subscription" on public.agency_subscriptions for select to authenticated using (agent_id=(select auth.uid()) or is_admin());
grant select on public.agency_subscriptions to authenticated;
create policy "subscriptions require aal2" on public.agency_subscriptions as restrictive for select to authenticated
using ((select auth.jwt()->>'aal')='aal2');
create or replace function public.seed_agency_trial() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.agency_subscriptions(agent_id) values(new.id) on conflict(agent_id) do nothing; return new; end $$;
revoke execute on function public.seed_agency_trial() from public, anon, authenticated;
drop trigger if exists seed_agency_trial_after_profile on public.profiles;
create trigger seed_agency_trial_after_profile after insert on public.profiles for each row execute function public.seed_agency_trial();
insert into public.agency_subscriptions(agent_id) select id from public.profiles on conflict(agent_id) do nothing;

create table if not exists public.company_rules (
 id uuid primary key default gen_random_uuid(), company text not null unique,
 tds_rate numeric(7,4) not null default 20 check(tds_rate between 0 and 100),
 tdi_rules jsonb not null default '{}'::jsonb, bdi_rules jsonb not null default '{}'::jsonb,
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
alter table public.company_rules enable row level security;
create policy "agents read company rules" on public.company_rules for select to authenticated using(true);
grant select on public.company_rules to authenticated;

create table if not exists public.coupons (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 discount_percent numeric(5,2) not null check(discount_percent between 0 and 100),
 valid_from timestamptz not null default now(), valid_until timestamptz,
 max_redemptions integer check(max_redemptions is null or max_redemptions > 0),
 redemption_count integer not null default 0 check(redemption_count >= 0), active boolean not null default true,
 created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
create policy "coupons admin read" on public.coupons for select to authenticated using(is_admin());
grant select on public.coupons to authenticated;

create table if not exists public.portfolio_leads (
 id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(length(trim(name)) between 2 and 100), phone text not null check(length(phone) between 7 and 30),
 email text, message text, consent boolean not null default false, created_at timestamptz not null default now()
);
alter table public.portfolio_leads enable row level security;
create policy "agents read own portfolio leads" on public.portfolio_leads for select to authenticated using(agent_id=(select auth.uid()) or is_admin());
grant select on public.portfolio_leads to authenticated;

create table if not exists public.portfolio_reviews (
 id uuid primary key default gen_random_uuid(), agent_id uuid not null references public.profiles(id) on delete cascade,
 reviewer_name text not null check(length(trim(reviewer_name)) between 2 and 100), rating smallint not null check(rating between 1 and 5),
 review text check(review is null or length(review)<=1000), approved boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.portfolio_reviews enable row level security;
create policy "approved portfolio reviews public" on public.portfolio_reviews for select to anon, authenticated using(approved or agent_id=(select auth.uid()));
create policy "admins read portfolio reviews" on public.portfolio_reviews for select to authenticated using(is_admin());
grant select on public.portfolio_reviews to anon, authenticated;

create table if not exists public.question_bank (
 id bigint generated always as identity primary key, category text not null, language text not null default 'mixed' check(language in ('en','ne','mixed')),
 question_en text, question_ne text, option_a_en text, option_b_en text, option_c_en text, option_d_en text,
 option_a_ne text, option_b_ne text, option_c_ne text, option_d_ne text,
 correct_option char(1) not null check(correct_option in ('A','B','C','D')), explanation_en text, explanation_ne text,
 active boolean not null default true, created_at timestamptz not null default now()
);
alter table public.question_bank alter column id restart with 1000000;
create index if not exists question_bank_category_active_idx on public.question_bank(category) where active;
alter table public.question_bank enable row level security;
create policy "question bank admin read" on public.question_bank for select to authenticated using(is_admin());
grant select on public.question_bank to authenticated;

create table if not exists public.billing_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
 product text not null check(product in ('agency_basic','agency_pro','exam_pass')),
 provider text not null check(provider in ('esewa','khalti')), amount numeric(12,2) not null check(amount>0), currency text not null default 'NPR' check(currency='NPR'),
 status text not null default 'pending' check(status in ('pending','paid','failed','expired')),
 provider_reference text unique, provider_transaction text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists billing_orders_user_created_idx on public.billing_orders(user_id,created_at desc);
alter table public.billing_orders enable row level security;
create policy "users read own billing orders" on public.billing_orders for select to authenticated using(user_id=(select auth.uid()) or is_admin());
create policy "billing orders require aal2" on public.billing_orders as restrictive for select to authenticated using((select auth.jwt()->>'aal')='aal2');
grant select on public.billing_orders to authenticated;
alter table public.exam_pass_orders add column if not exists billing_order_id uuid unique references public.billing_orders(id);

create policy "company rules require aal2" on public.company_rules as restrictive for select to authenticated using((select auth.jwt()->>'aal')='aal2');
create policy "coupons require aal2" on public.coupons as restrictive for select to authenticated using((select auth.jwt()->>'aal')='aal2');
create policy "portfolio reviews require aal2 for private rows" on public.portfolio_reviews as restrictive for select to authenticated
using(approved or agent_id=(select auth.uid()) or ((select auth.jwt()->>'aal')='aal2' and is_admin()));

create or replace function public.team_production_company(root uuid, d_from date, d_to date)
returns table(layer text, agent_id uuid, agent_name text, plan_type text, premium_mode text, term_years int, premium numeric, company text)
language plpgsql security definer stable set search_path=public as $$ begin
  if root <> auth.uid() and not is_admin() then raise exception 'not allowed'; end if;
  return query select l.layer,p.agent_id,pr.name,p.plan_type,p.premium_mode,p.term_years,p.premium,p.company
  from team_layers(root) l join policies p on p.agent_id=l.agent_id join profiles pr on pr.id=p.agent_id
  where p.issue_date between d_from and d_to;
end $$;
revoke execute on function public.team_production_company(uuid,date,date) from public, anon;
grant execute on function public.team_production_company(uuid,date,date) to authenticated;

-- Make the existing activity log append-only for application roles.
revoke update, delete, truncate on public.activity_log from anon, authenticated;
create or replace function public.prevent_activity_log_mutation() returns trigger
language plpgsql set search_path=public as $$ begin raise exception 'activity_log is append-only'; end $$;
drop trigger if exists activity_log_immutable on public.activity_log;
create trigger activity_log_immutable before update or delete on public.activity_log
for each row execute function public.prevent_activity_log_mutation();

-- MFA is required for sensitive business tables; public portfolio reads remain public.
create policy "activity logs require aal2" on public.activity_log as restrictive for select to authenticated
using((select auth.jwt()->>'aal')='aal2');

insert into public.activity_log(actor, action, meta)
values ('system', 'blueprint_foundations_migration', jsonb_build_object('migration', '20261023170000_blueprint_foundations'));
