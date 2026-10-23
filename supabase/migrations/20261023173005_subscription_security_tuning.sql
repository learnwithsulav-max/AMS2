-- Keep internal delivery and question reports inaccessible through the public API.
create policy "notification outbox is service only" on public.notification_outbox
  for all to anon, authenticated using (false) with check (false);
create policy "question reports are service only" on public.question_reports
  for all to anon, authenticated using (false) with check (false);

-- Supabase's pg_cron install adds broad catalog policies; only the database owner needs access.
revoke all on schema cron from anon, authenticated;
revoke all on all tables in schema cron from anon, authenticated;
revoke all on all sequences in schema cron from anon, authenticated;

create index if not exists agency_subscriptions_package_code_idx on public.agency_subscriptions(package_code);
create index if not exists billing_orders_reviewed_by_idx on public.billing_orders(reviewed_by) where reviewed_by is not null;
create index if not exists exam_pass_orders_package_code_idx on public.exam_pass_orders(package_code) where package_code is not null;
create index if not exists policy_documents_policy_id_idx on public.policy_documents(policy_id);
create index if not exists question_reports_attempt_id_idx on public.question_reports(attempt_id);
