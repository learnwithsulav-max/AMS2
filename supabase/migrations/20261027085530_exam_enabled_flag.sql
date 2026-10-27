-- Admin must explicitly enable a candidate for the exam after payment is approved.
-- Flow: register -> pay -> admin approves pass -> admin enables exam_enabled -> candidate can start exam.

alter table public.profiles
  add column if not exists exam_enabled boolean not null default false;

grant update (exam_enabled) on public.profiles to authenticated;
