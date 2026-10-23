create policy "service role manages coupon redemptions"
on public.coupon_redemptions for all to service_role
using (true) with check (true);