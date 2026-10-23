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
    if state_value <> 'trial' or trial_end is null or now() >= trial_end or used >= 5 then
      raise exception 'The seven day trial includes up to five policies; choose a plan to add more.';
    end if;
  elsif state_value <> 'active' or period_end is null or period_end <= now() then
    raise exception 'Your agency plan has expired. Renew to add policies.';
  end if;
  return new;
end $$;
