create or replace function lws_private.admin_health_stats() returns jsonb
language sql security definer set search_path=pg_catalog,public,auth,storage as $$
 select jsonb_build_object(
  'agents',(select count(*) from public.profiles where role='agent'),
  'active_tenants',(select count(*) from public.agency_subscriptions where status='active'),
  'pending_vouchers',(select count(*) from public.billing_orders where status='pending'),
  'storage_objects',(select count(*) from storage.objects),
  'storage_bytes',(select coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end),0) from storage.objects),
  'sessions_started_today',(select count(*) from auth.sessions where created_at>=date_trunc('day',now())),
  'admin_sessions_active',(select count(*) from lws_private.admin_active_sessions where last_seen_at>=now()-interval '15 minutes')
 )
$$;
revoke all on function lws_private.admin_health_stats() from public,anon,authenticated;
grant execute on function lws_private.admin_health_stats() to service_role;
create or replace function public.admin_health_stats() returns jsonb
language sql security invoker set search_path=public,lws_private as $$ select lws_private.admin_health_stats() $$;
revoke all on function public.admin_health_stats() from public,anon,authenticated;
grant execute on function public.admin_health_stats() to service_role;