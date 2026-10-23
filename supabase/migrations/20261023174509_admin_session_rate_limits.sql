create table if not exists lws_private.admin_active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  last_seen_at timestamptz not null default now()
);
revoke all on lws_private.admin_active_sessions from public, anon, authenticated;
revoke all on schema lws_private from public, anon, authenticated;

grant usage on schema lws_private to service_role;
create or replace function lws_private.claim_admin_session(p_user_id uuid, p_session_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,lws_private as $$
declare accepted boolean;
begin
  insert into lws_private.admin_active_sessions(user_id,session_id,last_seen_at)
  values(p_user_id,p_session_id,clock_timestamp())
  on conflict(user_id) do update set session_id=excluded.session_id,last_seen_at=clock_timestamp()
    where lws_private.admin_active_sessions.session_id=excluded.session_id
       or lws_private.admin_active_sessions.last_seen_at < clock_timestamp()-interval '15 minutes';
  select exists(select 1 from lws_private.admin_active_sessions where user_id=p_user_id and session_id=p_session_id) into accepted;
  return accepted;
end $$;
revoke all on function lws_private.claim_admin_session(uuid,uuid) from public,anon,authenticated;
grant execute on function lws_private.claim_admin_session(uuid,uuid) to service_role;

create table if not exists lws_private.admin_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check(request_count >= 0)
);
revoke all on lws_private.admin_rate_limits from public,anon,authenticated;
create or replace function lws_private.check_admin_rate_limit(p_key_hash text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=pg_catalog,lws_private as $$
declare current_count integer; now_at timestamptz := clock_timestamp();
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_key_hash) > 128 then return false; end if;
  insert into lws_private.admin_rate_limits(key_hash,window_started_at,request_count)
  values(p_key_hash,now_at,1)
  on conflict(key_hash) do update set
    request_count=case when lws_private.admin_rate_limits.window_started_at <= now_at-make_interval(secs=>p_window_seconds) then 1 else lws_private.admin_rate_limits.request_count+1 end,
    window_started_at=case when lws_private.admin_rate_limits.window_started_at <= now_at-make_interval(secs=>p_window_seconds) then now_at else lws_private.admin_rate_limits.window_started_at end
  returning request_count into current_count;
  return current_count <= p_limit;
end $$;
revoke all on function lws_private.check_admin_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function lws_private.check_admin_rate_limit(text,integer,integer) to service_role;