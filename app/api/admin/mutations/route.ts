import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminRequestIp, requireAdmin } from '@/lib/admin-auth';
import { admin } from '@/lib/supabase-admin';
import { enqueueUserNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

async function audit(actor: string, actorId: string, action: string, targetId: string | null, meta: Record<string, unknown> = {}, request?: Request) {
  const ip = request ? getAdminRequestIp(request) : null;
  const userAgent = request?.headers.get('user-agent')?.slice(0, 500) || null;
  const { error } = await admin.from('activity_log').insert({
    actor, actor_id: actorId, action, meta: { ...meta, target_id: targetId, ip, user_agent: userAgent },
  });
  if (error) {
    console.error('Admin mutation succeeded, but its audit entry failed:', error.message);
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const { user, response } = await requireAdmin(request);
  if (response) return response;

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
  }

  let action = '';
  let targetId: string | null = null;
  let meta: Record<string, unknown> = {};
  let result: { error: { message: string } | null; data?: { id?: string } | null };

  if (body.action === 'update_agent') {
    const { id, membership, status } = body;
    const invalidMembership = membership !== undefined && !['free', 'premium'].includes(membership);
    const invalidStatus = status !== undefined && !['active', 'suspended'].includes(status);
    if (typeof id !== 'string' || !id || invalidMembership || invalidStatus || (membership === undefined && status === undefined)) {
      return NextResponse.json({ error: 'Provide an agent ID and a valid membership or status.' }, { status: 400 });
    }
    const values: Record<string, string> = {};
    if (membership !== undefined) values.membership = membership;
    if (status !== undefined) values.status = status;
    result = await admin.from('profiles').update(values).eq('id', id).eq('role', 'agent').select('id').maybeSingle();
    action = 'agent_updated';
    targetId = id;
    meta = values;
  } else if (body.action === 'create_policy') {
    const { agent_id, client_name, plan_type, premium_mode, term_years, premium, issue_date, sum_assured, next_due_date } = body;
    if (![agent_id, client_name, plan_type, premium_mode, issue_date].every((v) => typeof v === 'string' && v.trim()) ||
      !['single', 'regular'].includes(premium_mode) || !Number.isInteger(Number(term_years)) || Number(term_years) < 1 ||
      !Number.isFinite(Number(premium)) || Number(premium) <= 0 ||
      (sum_assured !== undefined && sum_assured !== null && sum_assured !== '' && (!Number.isFinite(Number(sum_assured)) || Number(sum_assured) < 0))) {
      return NextResponse.json({ error: 'Enter valid policy details before saving.' }, { status: 400 });
    }
    result = await admin.from('policies').insert({
      agent_id, client_name: client_name.trim(), plan_type, premium_mode, term_years: Number(term_years),
      premium: Number(premium), issue_date, sum_assured: sum_assured ? Number(sum_assured) : null, next_due_date: next_due_date || null,
    }).select('id').single();
    action = 'policy_created';
    meta = { agent_id, premium: Number(premium) };
  } else if (body.action === 'create_scheme') {
    const { title, month_label, target, criteria } = body;
    if (typeof title !== 'string' || !title.trim() || !Number.isFinite(Number(target || 0)) || Number(target || 0) < 0) {
      return NextResponse.json({ error: 'Enter a title and a valid non-negative target for the scheme.' }, { status: 400 });
    }
    result = await admin.from('schemes').insert({
      title: title.trim(), month_label: month_label || null, target: Number(target || 0), criteria: criteria || null, active: true,
    }).select('id').single();
    action = 'scheme_created';
    meta = { title: title.trim() };
  } else if (body.action === 'update_scheme') {
    const { id, active } = body;
    if (typeof id !== 'string' || typeof active !== 'boolean') return NextResponse.json({ error: 'Provide a scheme ID and active status.' }, { status: 400 });
    result = await admin.from('schemes').update({ active }).eq('id', id).select('id').maybeSingle();
    action = active ? 'scheme_activated' : 'scheme_deactivated';
    targetId = id;
    meta = { active };
  } else if (body.action === 'save_scheme_status') {
    const { scheme_id, agent_id, achieved, status, note } = body;
    if (typeof scheme_id !== 'string' || typeof agent_id !== 'string' || !Number.isFinite(Number(achieved)) ||
      !['pending', 'qualified', 'not_qualified'].includes(status)) {
      return NextResponse.json({ error: 'Provide valid scheme qualification details.' }, { status: 400 });
    }
    result = await admin.from('scheme_status').upsert({
      scheme_id, agent_id, achieved: Number(achieved), status, note: note || null,
    }, { onConflict: 'scheme_id,agent_id' }).select('id').single();
    action = 'scheme_status_updated';
    targetId = `${scheme_id}:${agent_id}`;
    meta = { scheme_id, agent_id, achieved: Number(achieved), status };
  } else if (body.action === 'update_exam_pass_settings') {
    const price = Number(body.price);
    const paymentInstructions = typeof body.payment_instructions === 'string' ? body.payment_instructions.trim().slice(0, 2000) : '';
    if (!Number.isFinite(price) || price < 0 || price > 1000000 || Math.round(price * 100) !== price * 100 || (price > 0 && (paymentInstructions.length < 10 || paymentInstructions === 'Contact support for payment instructions.'))) {
      return NextResponse.json({ error: 'Enter a valid NPR price and specific payment instructions before enabling pass sales.' }, { status: 400 });
    }
    result = await admin.from('exam_pass_settings').upsert({ id: true, price, currency: 'NPR', payment_instructions: paymentInstructions, active: price > 0, updated_at: new Date().toISOString() }, { onConflict: 'id' }).select('id').single();
    action = price > 0 ? 'exam_pass_price_updated' : 'exam_pass_sales_disabled';
    targetId = 'exam-pass-settings';
    meta = { price, currency: 'NPR', active: price > 0 };
  } else if (body.action === 'review_exam_pass') {
    const { id, decision } = body;
    if (typeof id !== 'string' || !id || !['approve', 'reject'].includes(decision)) return NextResponse.json({ error: 'Choose a pending pass request and a valid decision.' }, { status: 400 });
    const passCode = decision === 'approve' ? `LWS-${randomBytes(8).toString('hex').toUpperCase()}` : null;
    const { data, error } = await admin.from('exam_pass_orders').update({
      status: decision === 'approve' ? 'approved' : 'rejected', pass_code: passCode,
      reviewed_by: user.email || user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', id).eq('status', 'pending').select('id').maybeSingle();
    result = { data, error };
    action = decision === 'approve' ? 'exam_pass_approved' : 'exam_pass_rejected';
    targetId = id;
    meta = { decision };
    if (data && decision === 'approve') {
      const { data: passOrder } = await admin.from('exam_pass_orders').select('user_id,expires_at').eq('id', id).maybeSingle();
      if (passOrder?.user_id) {
        try {
          await enqueueUserNotification({
            userId: passOrder.user_id,
            dedupeKey: `exam-pass-approved:${id}`,
            subject: 'Exam pass payment confirmed',
            message: `Your exam pass has been approved and is active until ${passOrder.expires_at?.slice(0, 10) || 'its expiry date'}. Sign in to start your exam.`,
            includeSms: true,
            purpose: 'payment_confirmation',
          });
        } catch (notificationError) {
          console.error('Exam pass was approved, but confirmation notifications could not be queued:', notificationError instanceof Error ? notificationError.message : 'unknown error');
        }
      }
    }
  } else if (body.action === 'review_billing_order') {
    const { id, decision } = body;
    if (typeof id !== 'string' || !['approve','reject'].includes(decision)) return NextResponse.json({error:'Choose a pending payment and a valid decision.'},{status:400});
    const { data: order, error: orderError } = await admin.from('billing_orders').select('id,user_id,package_code,product,provider,amount,currency,metadata,status').eq('id',id).eq('status','pending').maybeSingle();
    if (orderError || !order) return NextResponse.json({error:'This payment is no longer pending.'},{status:404});
    const { data: pkg } = await admin.from('subscription_packages').select('duration_days').eq('code',order.package_code).maybeSingle();
    if (decision === 'approve' && !pkg) return NextResponse.json({error:'The selected package no longer exists.'},{status:409});
    const now = new Date(); const expiresAt = new Date(now.getTime() + Number(pkg?.duration_days || 0) * 86400000).toISOString();
    if (decision === 'approve' && order.product === 'exam_pass') {
      if (!order.user_id) return NextResponse.json({ error: 'This exam payment is not linked to a candidate account.' }, { status: 409 });
      const passCode = `LWS-${randomBytes(8).toString('hex').toUpperCase()}`;
      const { error } = await admin.from('exam_pass_orders').insert({
        user_id: order.user_id,
        name: order.metadata?.name || 'Student', phone: order.metadata?.phone || '', amount: order.amount, currency: order.currency,
        payment_method: order.provider, receipt_reference: `Manual QR payment ${order.id}`, status:'approved', pass_code:passCode,
        billing_order_id:order.id, package_code:order.package_code, expires_at:expiresAt,
        reviewed_by:user.email || user.id, reviewed_at:now.toISOString(),
      });
      if (error) { console.error('Timed exam pass activation failed:',error.message); return NextResponse.json({error:'Payment is verified, but pass activation failed. Retry review.'},{status:500}); }
    } else if (decision === 'approve') {
      const { data: subscription } = await admin.from('agency_subscriptions').select('id,agent_id,period_ends_at').eq('agent_id',order.user_id).maybeSingle();
      if (!subscription) return NextResponse.json({error:'Agency subscription record was not found.'},{status:409});
      const start = subscription.period_ends_at && new Date(subscription.period_ends_at) > now ? new Date(subscription.period_ends_at) : now;
      const end = new Date(start.getTime() + Number(pkg!.duration_days) * 86400000);
      const plan = order.package_code === 'agency_pro' ? 'pro' : 'basic';
      const { error } = await admin.from('agency_subscriptions').update({plan,status:'active',package_code:order.package_code,period_started_at:start.toISOString(),period_ends_at:end.toISOString(),updated_at:now.toISOString()}).eq('id',subscription.id);
      if (error) return NextResponse.json({error:'Could not activate the agency subscription.'},{status:500});
      await admin.from('profiles').update({membership:'premium'}).eq('id',subscription.agent_id);
    }
    const { data, error } = await admin.from('billing_orders').update({status:decision==='approve'?'paid':'rejected',expires_at:decision==='approve'?expiresAt:null,reviewed_by:user.id,reviewed_at:now.toISOString()}).eq('id',id).eq('status','pending').select('id').maybeSingle();
    result={data,error}; action=decision==='approve'?'billing_order_approved':'billing_order_rejected'; targetId=id; meta={decision,package_code:order.package_code,amount:order.amount};
    if(data&&order.metadata?.coupon_code){const {error:couponError}=await admin.rpc(decision==='approve'?'finalize_coupon':'release_coupon',{p_order_id:id});if(couponError){console.error('Coupon redemption accounting failed:',couponError.message);return NextResponse.json({error:'Payment status changed, but coupon accounting needs admin review.'},{status:500});}}
    if(data&&decision==='approve'){
      if (order.user_id) {
        try {
          await enqueueUserNotification({
            userId: order.user_id,
            dedupeKey: `payment-confirmed:${id}`,
            subject: 'Payment confirmed',
            message: `Your ${order.package_code} payment of NPR ${order.amount} has been confirmed. Access is active until ${expiresAt.slice(0, 10)}.`,
            includeSms: true,
            purpose: 'payment_confirmation',
          });
        } catch (notificationError) {
          console.error('Payment was approved, but confirmation notifications could not be queued:', notificationError instanceof Error ? notificationError.message : 'unknown error');
        }
      }
    }
  } else if (body.action === 'update_subscription') {
    const { id, plan, status } = body;
    if (typeof id !== 'string' || !['trial','basic','pro'].includes(plan) || !['trial','active','expired','cancelled'].includes(status) || (status === 'active' && plan === 'trial')) {
      return NextResponse.json({ error: 'Choose a valid agency plan and status.' }, { status: 400 });
    }
    const now = new Date();
    const periodEnd = plan === 'basic' ? new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()) : plan === 'pro' ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()) : null;
    result = await admin.from('agency_subscriptions').update({ plan, status,
      ...(status === 'active' ? { period_started_at: now.toISOString(), period_ends_at: periodEnd?.toISOString() } : {}),
      updated_at: now.toISOString() }).eq('id', id).select('id').maybeSingle();
    action = 'agency_subscription_updated'; targetId = id; meta = { plan, status, amount_npr: plan === 'basic' ? 499 : plan === 'pro' ? 899 : 0 };
    const { data: subscription } = await admin.from('agency_subscriptions').select('agent_id').eq('id', id).maybeSingle();
    if (subscription?.agent_id) await admin.from('profiles').update({ membership: status === 'active' && plan !== 'trial' ? 'premium' : 'free' }).eq('id', subscription.agent_id);
  } else if (body.action === 'save_company_rule') {
    const company = typeof body.company === 'string' ? body.company.trim().slice(0, 120) : '';
    const tdsRate = Number(body.tds_rate);
    const validRates = (rules: unknown) => {
      if (!rules || typeof rules !== 'object' || Array.isArray(rules)) return false;
      return Object.entries(rules).every(([layer, rate]) =>
        ['A', 'B', 'C', 'D'].includes(layer) &&
        typeof rate === 'number' &&
        Number.isFinite(rate) &&
        rate >= 0 &&
        rate <= 100
      );
    };
    if (!company || !Number.isFinite(tdsRate) || tdsRate < 0 || tdsRate > 100 ||
      !validRates(body.tdi_rules) || !validRates(body.bdi_rules)) {
      return NextResponse.json({ error: 'Enter a company name, TDS rate from 0 to 100, and TDI/BDI layer percentages from 0 to 100.' }, { status: 400 });
    }
    const values = { company, tds_rate: tdsRate, tdi_rules: body.tdi_rules, bdi_rules: body.bdi_rules, updated_by: user.id, updated_at: new Date().toISOString() };
    if (typeof body.id === 'string' && body.id) {
      result = await admin.from('company_rules').update(values).eq('id', body.id).select('id').maybeSingle();
    } else {
      result = await admin.from('company_rules').upsert(values, { onConflict: 'company' }).select('id').single();
    }
    action = 'company_rules_updated';
    targetId = typeof body.id === 'string' ? body.id : null;
    meta = { company, tds_rate: tdsRate, tdi_rules: body.tdi_rules, bdi_rules: body.bdi_rules };
  } else if (body.action === 'delete_company_rule') {
    if (typeof body.id !== 'string' || !body.id) return NextResponse.json({ error: 'Choose a company rule to delete.' }, { status: 400 });
    result = await admin.from('company_rules').delete().eq('id', body.id).select('id').maybeSingle();
    action = 'company_rule_deleted';
    targetId = body.id;
  } else if (body.action === 'create_coupon') {
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32) : '';
    const discount = Number(body.discount_percent);
    if (code.length < 4 || !Number.isFinite(discount) || discount <= 0 || discount >= 100) return NextResponse.json({ error: 'Enter a coupon code and discount between 1 and 99.99 percent.' }, { status: 400 });
    const max = body.max_redemptions === '' || body.max_redemptions == null ? null : Number(body.max_redemptions);
    if (max !== null && (!Number.isInteger(max) || max < 1)) return NextResponse.json({ error: 'Redemption limit must be a positive whole number.' }, { status: 400 });
    const parseDay=(value:unknown,exclusiveEnd=false)=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const date=new Date(`${value}T00:00:00.000Z`);if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return null;if(exclusiveEnd)date.setUTCDate(date.getUTCDate()+1);return date.toISOString();};
    const validFrom=body.valid_from?parseDay(body.valid_from):new Date().toISOString();
    const validUntil=body.valid_until?parseDay(body.valid_until,true):null;
    if(!validFrom||body.valid_until&&!validUntil||validUntil&&new Date(validUntil)<=new Date(validFrom))return NextResponse.json({error:'Choose a valid coupon date range.'},{status:400});
    result = await admin.from('coupons').insert({ code, discount_percent: discount, valid_from: validFrom, valid_until: validUntil, max_redemptions: max, created_by: user.id }).select('id').single();
    action = 'coupon_created'; meta = { code, discount_percent: discount };
  } else if(body.action==='update_coupon'){
    if(typeof body.id!=='string'||typeof body.active!=='boolean')return NextResponse.json({error:'Choose a coupon and active state.'},{status:400});
    result=await admin.from('coupons').update({active:body.active}).eq('id',body.id).select('id').maybeSingle();
    action=body.active?'coupon_activated':'coupon_deactivated';targetId=body.id;meta={active:body.active};
  } else if (body.action === 'moderate_review') {
    if (typeof body.id !== 'string' || typeof body.approved !== 'boolean') return NextResponse.json({ error: 'Provide a review and approval status.' }, { status: 400 });
    result = await admin.from('portfolio_reviews').update({ approved: body.approved }).eq('id', body.id).select('id').maybeSingle();
    action = body.approved ? 'portfolio_review_approved' : 'portfolio_review_rejected'; targetId = body.id; meta = { approved: body.approved };
  } else if (body.action === 'update_agency_feedback') {
    if(typeof body.id!=='string'||!['new','reviewing','planned','completed','closed'].includes(body.status))return NextResponse.json({error:'Choose a feedback entry and valid status.'},{status:400});
    result=await admin.from('agency_feedback').update({status:body.status,updated_at:new Date().toISOString()}).eq('id',body.id).select('id').maybeSingle();
    action='agency_feedback_status_updated';targetId=body.id;meta={status:body.status};
  } else if (body.action === 'update_question_report') {
    if(typeof body.id!=='string'||!['pending','in_progress','resolved'].includes(body.status))return NextResponse.json({error:'Choose a report and valid status.'},{status:400});
    result=await admin.from('question_reports').update({status:body.status}).eq('id',body.id).select('id').maybeSingle();
    action='question_report_status_updated';targetId=body.id;meta={status:body.status};
  } else {
    return NextResponse.json({ error: 'Unsupported admin action.' }, { status: 400 });
  }
  if (result.error) {
    console.error(`Admin action ${action || body.action} failed:`, result.error.message);
    return NextResponse.json({ error: 'The change could not be saved. Please try again.' }, { status: 500 });
  }
  if (!result.data?.id && ['agent_updated', 'scheme_activated', 'scheme_deactivated', 'exam_pass_approved', 'exam_pass_rejected', 'portfolio_review_approved', 'portfolio_review_rejected','agency_feedback_status_updated','question_report_status_updated','coupon_activated','coupon_deactivated','company_rules_updated','company_rule_deleted'].includes(action)) {
    return NextResponse.json({ error: 'The requested record was not found or is not eligible for this change.' }, { status: 404 });
  }
  if (!targetId) targetId = result.data?.id || null;

  const audited = await audit(user.email || user.id, user.id, action, targetId, meta, request);
  if (!audited) {
    return NextResponse.json({ error: 'The change was saved, but its audit record could not be written. Contact an administrator before retrying.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: targetId });
}
