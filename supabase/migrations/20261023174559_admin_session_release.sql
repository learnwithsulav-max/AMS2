create or replace function lws_private.release_admin_session(p_user_id uuid,p_session_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,lws_private as $$
declare removed integer;
begin
 delete from lws_private.admin_active_sessions where user_id=p_user_id and session_id=p_session_id;
 get diagnostics removed=row_count;
 return removed=1;
end $$;
revoke all on function lws_private.release_admin_session(uuid,uuid) from public,anon,authenticated;
grant execute on function lws_private.release_admin_session(uuid,uuid) to service_role;
create or replace function public.release_admin_session(p_user_id uuid,p_session_id uuid)
returns boolean language sql security invoker set search_path=public,lws_private as $$
 select lws_private.release_admin_session(p_user_id,p_session_id)
$$;
revoke all on function public.release_admin_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.release_admin_session(uuid,uuid) to service_role;