-- Candidate-owned exam access, notification channels and editable rule support.

alter table public.profiles
  add column if not exists portal_type text not null default 'agent'
  check (portal_type in ('agent', 'exam_candidate'));
alter table public.profiles
  add column if not exists whatsapp_opt_in boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  up uuid;
  account_type text;
begin
  account_type := case
    when new.raw_user_meta_data ->> 'portal_type' = 'exam_candidate' then 'exam_candidate'
    else 'agent'
  end;
  if account_type = 'agent' then
    select p.id into up
      from public.profiles as p
      where p.referral_code = upper(trim(coalesce(new.raw_user_meta_data ->> 'upline_code', '')));
  end if;
  insert into public.profiles (
    id, email, name, phone, license_no, address, branch, upline_id,
    referral_code, portal_type, whatsapp_opt_in
  )
  values (
    new.id, new.email, new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'phone', new.raw_user_meta_data ->> 'license_no',
    new.raw_user_meta_data ->> 'address', new.raw_user_meta_data ->> 'branch', up,
    'LWS' || upper(substr(md5(random()::text || new.id::text), 1, 6)),
    account_type, new.raw_user_meta_data ->> 'whatsapp_opt_in' = 'true'
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;
grant update (whatsapp_opt_in) on public.profiles to authenticated;

create or replace function public.seed_agency_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.portal_type = 'agent' then
    insert into public.agency_subscriptions(agent_id)
    values (new.id)
    on conflict (agent_id) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.seed_agency_trial() from public, anon, authenticated;

alter table public.exam_pass_orders
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.exam_attempts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.exam_pass_orders p
set user_id = o.user_id
from public.billing_orders o
where p.billing_order_id = o.id and p.user_id is null and o.user_id is not null;

update public.exam_attempts a
set user_id = p.user_id
from public.exam_pass_orders p
where a.pass_order_id = p.id and a.user_id is null and p.user_id is not null;

drop index if exists public.exam_attempts_pass_order_idx;
create index if not exists exam_attempts_pass_order_idx
  on public.exam_attempts(pass_order_id) where pass_order_id is not null;
create index if not exists exam_attempts_user_created_idx
  on public.exam_attempts(user_id, created_at desc);
create unique index if not exists exam_attempts_cert_id_idx
  on public.exam_attempts(cert_id) where cert_id is not null;
create index if not exists exam_pass_orders_user_expiry_idx
  on public.exam_pass_orders(user_id, expires_at desc)
  where status = 'approved' and user_id is not null;

alter table public.notification_outbox
  add column if not exists purpose text not null default 'general'
  check (purpose in ('general', 'payment_confirmation'));
alter table public.notification_outbox
  add column if not exists locked_at timestamptz;

alter table public.notification_outbox
  drop constraint if exists notification_outbox_channel_check;

-- Convert only queued legacy reminders; already-delivered SMS history stays intact.
update public.notification_outbox old
set status = 'failed',
    attempts = greatest(old.attempts, 5),
    last_error = 'Replaced by WhatsApp delivery during notification channel migration.'
where old.channel = 'sms'
  and old.status in ('pending', 'failed')
  and old.purpose <> 'payment_confirmation'
  and exists (
    select 1 from public.profiles AS p
    where p.phone = old.recipient and p.whatsapp_opt_in
  )
  and exists (
    select 1 from public.notification_outbox replacement
    where replacement.dedupe_key = old.dedupe_key
      and replacement.recipient = old.recipient
      and replacement.channel = 'whatsapp'
  );
update public.notification_outbox
set channel = 'whatsapp', purpose = 'general', locked_at = null
where channel = 'sms'
  and status in ('pending', 'failed')
  and purpose <> 'payment_confirmation'
  and exists (
    select 1 from public.profiles AS p
    where p.phone = notification_outbox.recipient and p.whatsapp_opt_in
  );

-- Do not move pending reminders to WhatsApp without explicit channel consent.
update public.notification_outbox AS pending_sms
set status = 'failed',
    attempts = greatest(pending_sms.attempts, 5),
    last_error = 'Legacy SMS reminder was not sent because WhatsApp consent was not recorded.'
where pending_sms.channel = 'sms'
  and pending_sms.status in ('pending', 'failed')
  and pending_sms.purpose <> 'payment_confirmation'
  and not exists (
    select 1 from public.profiles AS p
    where p.phone = pending_sms.recipient and p.whatsapp_opt_in
  );

alter table public.notification_outbox
  add constraint notification_outbox_channel_check
  check (channel in ('email', 'sms', 'whatsapp'));
alter table public.notification_outbox
  drop constraint if exists notification_outbox_status_check;
alter table public.notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('pending', 'processing', 'sent', 'failed'));
alter table public.notification_outbox
  add constraint notification_outbox_sms_purpose_check
  check (channel <> 'sms' or status <> 'pending' or purpose = 'payment_confirmation')
  not valid;

create index if not exists notification_outbox_delivery_idx
  on public.notification_outbox(status, created_at)
  where status in ('pending', 'failed');

create or replace function lws_private.enqueue_expiry_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  added integer := 0;
  changed integer;
begin
  insert into public.notification_outbox(dedupe_key, channel, recipient, subject, message)
  select 'agency:' || s.id::text || ':' || e.ends_at::date::text,
         channel.channel, channel.recipient,
         'Learn With Sulav plan expiry reminder',
         'Your ' || s.plan || ' plan expires on ' || e.ends_at::date::text ||
         '. Renew at https://agency.sulavs.com.np/billing.'
  from public.agency_subscriptions s
  join public.profiles p on p.id = s.agent_id
  cross join lateral (
    select case when s.status = 'trial' then s.trial_ends_at else s.period_ends_at end as ends_at
  ) e
  cross join lateral (
    values ('email'::text, p.email), ('whatsapp'::text, case when p.whatsapp_opt_in then p.phone end)
  ) channel(channel, recipient)
  where s.status in ('trial', 'active')
    and e.ends_at >= now() + interval '1 day'
    and e.ends_at < now() + interval '3 days'
    and channel.recipient is not null
  on conflict do nothing;
  get diagnostics changed = row_count;
  added := added + changed;

  insert into public.notification_outbox(dedupe_key, channel, recipient, subject, message)
  select 'policy-due:' || pol.id::text || ':' || pol.next_due_date::text,
         channel.channel, channel.recipient, 'Upcoming policy premium collection',
         'Follow up on the upcoming premium for ' || pol.client_name ||
         ' due ' || pol.next_due_date::text || '.'
  from public.policies pol
  join public.profiles p on p.id = pol.agent_id
  cross join lateral (values ('email'::text, p.email), ('whatsapp'::text, case when p.whatsapp_opt_in then p.phone end)) channel(channel, recipient)
  where pol.next_due_date between current_date + 29 and current_date + 30
    and channel.recipient is not null
  on conflict do nothing;
  get diagnostics changed = row_count;
  added := added + changed;

  insert into public.notification_outbox(dedupe_key, channel, recipient, subject, message)
  select 'policy-grace:' || pol.id::text || ':' || pol.grace_period_end::text,
         channel.channel, channel.recipient, 'Policy grace period ending',
         'The recorded grace period for ' || pol.client_name || ' ends ' ||
         pol.grace_period_end::text || '. Please follow up with the insurer.'
  from public.policies pol
  join public.profiles p on p.id = pol.agent_id
  cross join lateral (values ('email'::text, p.email), ('whatsapp'::text, case when p.whatsapp_opt_in then p.phone end)) channel(channel, recipient)
  where pol.grace_period_end = current_date + 1 and channel.recipient is not null
  on conflict do nothing;
  get diagnostics changed = row_count;
  added := added + changed;

  insert into public.notification_outbox(dedupe_key, channel, recipient, subject, message)
  select 'policy-milestone:' || pol.id::text || ':' || milestone.due::text || ':' || milestone.kind,
         channel.channel, channel.recipient,
         case when milestone.kind = 'maturity' then 'Policy maturity reminder' else 'Survival benefit reminder' end,
         'Follow up on ' || milestone.kind || ' for ' || pol.client_name || ' due ' || milestone.due::text || '.'
  from public.policies pol
  join public.profiles p on p.id = pol.agent_id
  cross join lateral (
    values ('maturity'::text, pol.maturity_date), ('survival benefit'::text, pol.survival_benefit_date)
  ) milestone(kind, due)
  cross join lateral (values ('email'::text, p.email), ('whatsapp'::text, case when p.whatsapp_opt_in then p.phone end)) channel(channel, recipient)
  where milestone.due between current_date + 29 and current_date + 30
    and channel.recipient is not null
  on conflict do nothing;
  get diagnostics changed = row_count;
  added := added + changed;

  insert into public.notification_outbox(dedupe_key, channel, recipient, subject, message)
  select 'exam:' || o.id::text || ':' || o.expires_at::date::text,
         channel.channel, channel.recipient, 'Exam pass expiry reminder',
         'Your exam pass expires on ' || o.expires_at::date::text || '. Renew at https://exam.sulavs.com.np.'
  from public.billing_orders o
  join public.profiles p on p.id = o.user_id
  cross join lateral (values ('email'::text, p.email), ('whatsapp'::text, case when p.whatsapp_opt_in then p.phone end)) channel(channel, recipient)
  where o.product = 'exam_pass' and o.status = 'paid'
    and o.expires_at >= now() + interval '1 day'
    and o.expires_at < now() + interval '3 days'
    and channel.recipient is not null
  on conflict do nothing;
  get diagnostics changed = row_count;
  added := added + changed;

  return added;
end;
$$;
revoke all on function lws_private.enqueue_expiry_notifications() from public, anon, authenticated;
