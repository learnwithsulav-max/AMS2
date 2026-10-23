-- Timed agency subscriptions, exam passes, secure voucher storage and private documents.

create table if not exists public.subscription_packages (
  code text primary key,
  audience text not null check (audience in ('agency','exam')),
  name text not null,
  amount_npr numeric(10,2) not null check (amount_npr >= 0),
  duration_days integer not null check (duration_days > 0),
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now()
);
alter table public.subscription_packages enable row level security;
create policy "active subscription packages are public" on public.subscription_packages
  for select to anon, authenticated using (active);
grant select on public.subscription_packages to anon, authenticated;
insert into public.subscription_packages(code,audience,name,amount_npr,duration_days,features,display_order) values
 ('agency_trial','agency','7-Day Free Trial',0,7,'["Full dashboard","Commission calculator","vCard tools","Up to 5 policies"]',0),
 ('agency_basic','agency','Agent Basic',499,180,'["Unlimited policies","Family policy grouping","TDS and commission engine","Offline sync","Private document vault"]',1),
 ('agency_pro','agency','Agent Pro',899,365,'["Everything in Basic","Downline hierarchy","Installment and commission projections","Branded festival banners","Priority support"]',2),
 ('exam_weekly','exam','Weekly Pass',99,7,'["Unlimited mock tests","All question topics","Instant scorecards","Answer reviews"]',1),
 ('exam_half_month','exam','Half-Month Pass',199,15,'["Full question bank","Nepali and English support","Question error reporting"]',2),
 ('exam_pro_month','exam','Pro Monthly Pass',250,30,'["Unlimited mock tests","Performance analytics","Explanation reviews","Priority exam updates"]',3)
on conflict (code) do update set audience=excluded.audience,name=excluded.name,amount_npr=excluded.amount_npr,
  duration_days=excluded.duration_days,features=excluded.features,display_order=excluded.display_order;

alter table public.billing_orders drop constraint if exists billing_orders_product_check;
alter table public.billing_orders add constraint billing_orders_product_check
  check (product in ('agency_basic','agency_pro','exam_pass'));
alter table public.billing_orders drop constraint if exists billing_orders_provider_check;
alter table public.billing_orders add constraint billing_orders_provider_check
  check (provider in ('esewa','khalti','fonepay','nepalpay'));
alter table public.billing_orders drop constraint if exists billing_orders_status_check;
alter table public.billing_orders add constraint billing_orders_status_check
  check (status in ('pending','paid','failed','expired','rejected'));
alter table public.billing_orders add column if not exists package_code text references public.subscription_packages(code);
alter table public.billing_orders add column if not exists voucher_path text;
alter table public.billing_orders add column if not exists claim_token_hash text;
alter table public.billing_orders add column if not exists reviewed_by uuid references auth.users(id);
alter table public.billing_orders add column if not exists reviewed_at timestamptz;
alter table public.billing_orders add column if not exists expires_at timestamptz;
create index if not exists billing_orders_review_queue_idx on public.billing_orders(created_at desc) where status='pending';
create index if not exists billing_orders_package_expiry_idx on public.billing_orders(package_code,expires_at) where expires_at is not null;

alter table public.agency_subscriptions add column if not exists package_code text references public.subscription_packages(code);
update public.agency_subscriptions set package_code=case when plan='basic' then 'agency_basic' when plan='pro' then 'agency_pro' else 'agency_trial' end where package_code is null;
alter table public.exam_pass_orders add column if not exists package_code text references public.subscription_packages(code);
alter table public.exam_pass_orders add column if not exists expires_at timestamptz;
create index if not exists exam_pass_orders_active_expiry_idx on public.exam_pass_orders(expires_at) where status='approved';

-- Add a lock to the existing five-policy trial trigger so concurrent inserts cannot exceed the cap.
create or replace function public.enforce_trial_policy_cap() returns trigger
language plpgsql security definer set search_path=public as $$
declare plan_value text; state_value text; trial_end timestamptz; period_end timestamptz; used integer;
begin
  if auth.uid() is distinct from new.agent_id then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.agent_id::text,0));
  select plan,status,trial_ends_at,period_ends_at into plan_value,state_value,trial_end,period_end
    from public.agency_subscriptions where agent_id=new.agent_id;
  if not found then raise exception 'Agency trial is not initialized'; end if;
  if plan_value='trial' then
    select count(*) into used from public.policies where agent_id=new.agent_id;
    if state_value <> 'trial' or now() >= trial_end or used >= 5 then
      raise exception 'The seven day trial includes up to five policies; choose a plan to add more.';
    end if;
  elsif state_value <> 'active' or period_end is null or period_end <= now() then
    raise exception 'Your agency plan has expired. Renew to add policies.';
  end if;
  return new;
end $$;

-- Voucher proofs and agency policy files stay in private Storage buckets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('payment-vouchers','payment-vouchers',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('agency-documents','agency-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.policy_documents (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (length(file_name) between 1 and 180),
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png')),
  file_size integer not null check (file_size between 1 and 10485760),
  created_at timestamptz not null default now()
);
create index if not exists policy_documents_agent_policy_idx on public.policy_documents(agent_id,policy_id,created_at desc);
alter table public.policy_documents enable row level security;
create policy "agents read own policy documents" on public.policy_documents for select to authenticated
  using(agent_id=(select auth.uid()) or is_admin());
create policy "policy documents require aal2" on public.policy_documents as restrictive for select to authenticated
  using((select auth.jwt()->>'aal')='aal2');
grant select on public.policy_documents to authenticated;

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id bigint not null,
  report_type text not null check(report_type in ('wrong_answer','unclear','translation','other')),
  details text check(details is null or length(details)<=1000),
  status text not null default 'pending' check(status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists question_reports_queue_idx on public.question_reports(created_at desc) where status='pending';
alter table public.question_reports enable row level security;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null,
  channel text not null check(channel in ('email','sms')),
  recipient text not null,
  subject text,
  message text not null,
  status text not null default 'pending' check(status in ('pending','sent','failed')),
  attempts integer not null default 0 check(attempts>=0),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(dedupe_key,channel,recipient)
);
create index if not exists notification_outbox_pending_idx on public.notification_outbox(created_at) where status='pending';
alter table public.notification_outbox enable row level security;

create schema if not exists lws_private;
revoke all on schema lws_private from public,anon,authenticated;
create or replace function lws_private.enqueue_expiry_notifications() returns integer
language plpgsql security definer set search_path=public,auth as $$
declare added integer;
begin
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'agency:'||s.id::text||':'||e.ends_at::date::text,'email',p.email,
    'Learn With Sulav plan expiry reminder',
    'Your '||s.plan||' plan expires on '||e.ends_at::date::text||'. Renew at https://agency.sulavs.com.np/billing.'
  from public.agency_subscriptions s join public.profiles p on p.id=s.agent_id
  cross join lateral (select case when s.status='trial' then s.trial_ends_at else s.period_ends_at end as ends_at) e
  where s.status in ('trial','active') and e.ends_at >= now()+interval '1 day' and e.ends_at < now()+interval '3 days'
    and p.email is not null
  on conflict do nothing;
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'agency:'||s.id::text||':'||e.ends_at::date::text,'sms',p.phone,null,
    'Learn With Sulav: your plan expires on '||e.ends_at::date::text||'. Renew at agency.sulavs.com.np/billing.'
  from public.agency_subscriptions s join public.profiles p on p.id=s.agent_id
  cross join lateral (select case when s.status='trial' then s.trial_ends_at else s.period_ends_at end as ends_at) e
  where s.status in ('trial','active') and e.ends_at >= now()+interval '1 day' and e.ends_at < now()+interval '3 days'
    and p.phone is not null
  on conflict do nothing;
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'exam:'||o.id::text||':'||o.expires_at::date::text,'sms',o.metadata->>'phone',null,
    'Learn With Sulav: your exam pass expires on '||o.expires_at::date::text||'. Renew at exam.sulavs.com.np.'
  from public.billing_orders o
  where o.product='exam_pass' and o.status='paid' and o.expires_at >= now()+interval '1 day'
    and o.expires_at < now()+interval '3 days' and nullif(o.metadata->>'phone','') is not null
  on conflict do nothing;
  get diagnostics added = row_count;
  return added;
end $$;
revoke all on function lws_private.enqueue_expiry_notifications() from public,anon,authenticated;

create extension if not exists pg_cron;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.unschedule(jobid) from cron.job where jobname='lws-expiry-notices-daily';
select cron.schedule('lws-expiry-notices-daily','15 2 * * *','select lws_private.enqueue_expiry_notifications()');
