update public.subscription_packages
set amount_npr = case code
  when 'agency_basic' then 944
  when 'agency_pro' then 2024
  when 'exam_weekly' then 201
  when 'exam_half_month' then 336
  when 'exam_pro_month' then 539
end
where code in ('agency_basic', 'agency_pro', 'exam_weekly', 'exam_half_month', 'exam_pro_month');
