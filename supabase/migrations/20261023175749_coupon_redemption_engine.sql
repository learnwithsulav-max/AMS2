create table if not exists public.coupon_redemptions (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.billing_orders(id) on delete cascade,
 coupon_id uuid not null references public.coupons(id),
 status text not null default 'reserved' check(status in ('reserved','redeemed','released')),
 discount_percent numeric(5,2) not null check(discount_percent between 0 and 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists coupon_redemptions_coupon_status_idx on public.coupon_redemptions(coupon_id,status);
alter table public.coupon_redemptions enable row level security;
revoke all on public.coupon_redemptions from public,anon,authenticated;
create or replace function lws_private.coupon_discount(p_code text) returns numeric
language sql stable security definer set search_path=pg_catalog,public as $$
 select discount_percent from public.coupons where code=upper(btrim(p_code)) and active and valid_from<=now()
 and (valid_until is null or valid_until>now()) and (max_redemptions is null or redemption_count<max_redemptions)
$$;
create or replace function lws_private.reserve_coupon(p_code text,p_order_id uuid) returns numeric
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.coupons%rowtype;
begin
 select * into c from public.coupons where code=upper(btrim(p_code)) for update;
 if not found or not c.active or c.valid_from>now() or (c.valid_until is not null and c.valid_until<=now()) or (c.max_redemptions is not null and c.redemption_count>=c.max_redemptions) then return null; end if;
 update public.coupons set redemption_count=redemption_count+1 where id=c.id;
 insert into public.coupon_redemptions(order_id,coupon_id,discount_percent) values(p_order_id,c.id,c.discount_percent);
 return c.discount_percent;
exception when unique_violation then return null;
end $$;
create or replace function lws_private.release_coupon(p_order_id uuid) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare coupon uuid;
begin
 update public.coupon_redemptions set status='released',updated_at=now() where order_id=p_order_id and status='reserved' returning coupon_id into coupon;
 if coupon is null then return false; end if;
 update public.coupons set redemption_count=greatest(0,redemption_count-1) where id=coupon;
 return true;
end $$;
create or replace function lws_private.finalize_coupon(p_order_id uuid) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare changed integer;
begin
 update public.coupon_redemptions set status='redeemed',updated_at=now() where order_id=p_order_id and status='reserved';
 get diagnostics changed=row_count; return changed=1;
end $$;
revoke all on function lws_private.coupon_discount(text),lws_private.reserve_coupon(text,uuid),lws_private.release_coupon(uuid),lws_private.finalize_coupon(uuid) from public,anon,authenticated;
grant execute on function lws_private.coupon_discount(text),lws_private.reserve_coupon(text,uuid),lws_private.release_coupon(uuid),lws_private.finalize_coupon(uuid) to service_role;
create or replace function public.coupon_discount(p_code text) returns numeric language sql security invoker set search_path=public,lws_private as $$ select lws_private.coupon_discount(p_code) $$;
create or replace function public.reserve_coupon(p_code text,p_order_id uuid) returns numeric language sql security invoker set search_path=public,lws_private as $$ select lws_private.reserve_coupon(p_code,p_order_id) $$;
create or replace function public.release_coupon(p_order_id uuid) returns boolean language sql security invoker set search_path=public,lws_private as $$ select lws_private.release_coupon(p_order_id) $$;
create or replace function public.finalize_coupon(p_order_id uuid) returns boolean language sql security invoker set search_path=public,lws_private as $$ select lws_private.finalize_coupon(p_order_id) $$;
revoke all on function public.coupon_discount(text),public.reserve_coupon(text,uuid),public.release_coupon(uuid),public.finalize_coupon(uuid) from public,anon,authenticated;
grant execute on function public.coupon_discount(text),public.reserve_coupon(text,uuid),public.release_coupon(uuid),public.finalize_coupon(uuid) to service_role;