-- Goals, policy event tracking, and in-portal feedback.
create table if not exists public.agency_goals (
  agent_id uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  target_npr numeric(14,2) not null check(target_npr >= 0),
  goal_type text not null default 'production' check(goal_type in ('production','commission','mdrt','club')),
  updated_at timestamptz not null default now(),
  primary key(agent_id,period_start,goal_type),
  check(period_end >= period_start)
);
alter table public.agency_goals enable row level security;
create policy "agents manage own agency goals" on public.agency_goals for all to authenticated
  using(agent_id=(select auth.uid()) or is_admin()) with check(agent_id=(select auth.uid()) or is_admin());
create policy "agency goals require aal2" on public.agency_goals as restrictive for all to authenticated
  using((select auth.jwt()->>'aal')='aal2') with check((select auth.jwt()->>'aal')='aal2');
grant select,insert,update,delete on public.agency_goals to authenticated;

alter table public.policies add column if not exists grace_period_end date;
alter table public.policies add column if not exists maturity_date date;
alter table public.policies add column if not exists survival_benefit_date date;
create index if not exists policies_grace_period_end_idx on public.policies(agent_id,grace_period_end) where grace_period_end is not null;
create index if not exists policies_maturity_date_idx on public.policies(agent_id,maturity_date) where maturity_date is not null;
create index if not exists policies_survival_benefit_date_idx on public.policies(agent_id,survival_benefit_date) where survival_benefit_date is not null;

create table if not exists public.agency_feedback (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('feature_request','bug_report')),
  category text not null check(category in ('policies','commission','team','billing','marketing','other')),
  title text not null check(length(trim(title)) between 3 and 140),
  details text not null check(length(trim(details)) between 5 and 3000),
  status text not null default 'new' check(status in ('new','reviewing','planned','completed','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agency_feedback_admin_queue_idx on public.agency_feedback(status,created_at desc);
alter table public.agency_feedback enable row level security;
create policy "agents submit and read own feedback" on public.agency_feedback for select to authenticated using(agent_id=(select auth.uid()) or is_admin());
create policy "agents create own feedback" on public.agency_feedback for insert to authenticated with check(agent_id=(select auth.uid()));
create policy "feedback requires aal2" on public.agency_feedback as restrictive for all to authenticated
  using((select auth.jwt()->>'aal')='aal2') with check((select auth.jwt()->>'aal')='aal2');
grant select,insert on public.agency_feedback to authenticated;

create or replace function lws_private.enqueue_expiry_notifications() returns integer
language plpgsql security definer set search_path=public,auth as $$
declare added integer := 0; changed integer;
begin
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'agency:'||s.id::text||':'||e.ends_at::date::text,'email',p.email,
    'Learn With Sulav plan expiry reminder',
    'Your '||s.plan||' plan expires on '||e.ends_at::date::text||'. Renew at https://agency.sulavs.com.np/billing.'
  from public.agency_subscriptions s join public.profiles p on p.id=s.agent_id
  cross join lateral (select case when s.status='trial' then s.trial_ends_at else s.period_ends_at end as ends_at) e
  where s.status in ('trial','active') and e.ends_at >= now()+interval '1 day' and e.ends_at < now()+interval '3 days' and p.email is not null
  on conflict do nothing;
  get diagnostics changed = row_count; added := added + changed;
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'agency:'||s.id::text||':'||e.ends_at::date::text,'sms',p.phone,null,
    'Learn With Sulav: your plan expires on '||e.ends_at::date::text||'. Renew at agency.sulavs.com.np/billing.'
  from public.agency_subscriptions s join public.profiles p on p.id=s.agent_id
  cross join lateral (select case when s.status='trial' then s.trial_ends_at else s.period_ends_at end as ends_at) e
  where s.status in ('trial','active') and e.ends_at >= now()+interval '1 day' and e.ends_at < now()+interval '3 days' and p.phone is not null
  on conflict do nothing;
  get diagnostics changed = row_count; added := added + changed;
  -- Alert the agent 30 days before a premium collection is due.
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'policy-due:'||pol.id::text||':'||pol.next_due_date::text,'email',p.email,
    'Upcoming policy premium collection',
    'Follow up on the upcoming premium for '||pol.client_name||' due '||pol.next_due_date::text||'.'
  from public.policies pol join public.profiles p on p.id=pol.agent_id
  where pol.next_due_date between current_date+29 and current_date+30 and p.email is not null
  on conflict do nothing;
  get diagnostics changed = row_count; added := added + changed;
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'policy-due:'||pol.id::text||':'||pol.next_due_date::text,'sms',p.phone,null,
    'Learn With Sulav: upcoming premium follow-up for '||pol.client_name||' due '||pol.next_due_date::text||'.'
  from public.policies pol join public.profiles p on p.id=pol.agent_id
  where pol.next_due_date between current_date+29 and current_date+30 and p.phone is not null
  on conflict do nothing;
  get diagnostics changed = row_count; added := added + changed;
  -- Notify again at the end of the recorded grace period and on policy milestones.
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'policy-grace:'||pol.id::text||':'||pol.grace_period_end::text,'email',p.email,
    'Policy grace period ending',
    'The recorded grace period for '||pol.client_name||' ends '||pol.grace_period_end::text||'. Please follow up with the insurer.'
  from public.policies pol join public.profiles p on p.id=pol.agent_id
  where pol.grace_period_end=current_date+1 and p.email is not null
  on conflict do nothing;
  get diagnostics changed = row_count; added := added + changed;
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'policy-grace:'||pol.id::text||':'||pol.grace_period_end::text,'sms',p.phone,null,
    'Learn With Sulav: the recorded grace period for '||pol.client_name||' ends '||pol.grace_period_end::text||'. Follow up with the insurer.'
  from public.policies pol join public.profiles p on p.id=pol.agent_id
  where pol.grace_period_end=current_date+1 and p.phone is not null
  on conflict do nothing;
  get diagnostics changed = row_count; added := added + changed;
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'policy-milestone:'||pol.id::text||':'||milestone.due::text||':'||milestone.kind,'email',p.email,
    case when milestone.kind='maturity' then 'Policy maturity reminder' else 'Survival benefit reminder' end,
    'Follow up on '||milestone.kind||' for '||pol.client_name||' due '||milestone.due::text||'.'
  from public.policies pol join public.profiles p on p.id=pol.agent_id
  cross join lateral (values ('maturity'::text,pol.maturity_date),('survival benefit'::text,pol.survival_benefit_date)) milestone(kind,due)
  where milestone.due between current_date+29 and current_date+30 and p.email is not null
  on conflict do nothing;
  get diagnostics changed = row_count; added := added + changed;
  insert into public.notification_outbox(dedupe_key,channel,recipient,subject,message)
  select 'policy-milestone:'||pol.id::text||':'||milestone.due::text||':'||milestone.kind,'sms',p.phone,null,
    'Learn With Sulav: '||milestone.kind||' follow-up for '||pol.client_name||' due '||milestone.due::text||'.'
  from public.policies pol join public.profiles p on p.id=pol.agent_id
  cross join lateral (values ('maturity'::text,pol.maturity_date),('survival benefit'::text,pol.survival_benefit_date)) milestone(kind,due)
  where milestone.due between current_date+29 and current_date+30 and p.phone is not null
  on conflict do nothing;
  get diagnostics changed = row_count; added := added + changed;
  return added;
end $$;
revoke all on function lws_private.enqueue_expiry_notifications() from public,anon,authenticated;
