create or replace function public.claim_admin_session(p_user_id uuid,p_session_id uuid)
returns boolean language sql security invoker set search_path=public,lws_private as $$
 select lws_private.claim_admin_session(p_user_id,p_session_id)
$$;
revoke all on function public.claim_admin_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_admin_session(uuid,uuid) to service_role;

create or replace function public.check_admin_rate_limit(p_key_hash text,p_limit integer,p_window_seconds integer)
returns boolean language sql security invoker set search_path=public,lws_private as $$
 select lws_private.check_admin_rate_limit(p_key_hash,p_limit,p_window_seconds)
$$;
revoke all on function public.check_admin_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.check_admin_rate_limit(text,integer,integer) to service_role;