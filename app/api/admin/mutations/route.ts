import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { admin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function audit(actor: string, action: string, targetId: string | null, meta: Record<string, unknown> = {}) {
  const { error } = await admin.from('activity_log').insert({
    actor, action, meta: { ...meta, target_id: targetId },
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
  } else {
    return NextResponse.json({ error: 'Unsupported admin action.' }, { status: 400 });
  }

  if (result.error) {
    console.error(`Admin action ${action || body.action} failed:`, result.error.message);
    return NextResponse.json({ error: 'The change could not be saved. Please try again.' }, { status: 500 });
  }
  if (!result.data?.id && ['agent_updated', 'scheme_activated', 'scheme_deactivated'].includes(action)) {
    return NextResponse.json({ error: 'The requested record was not found or is not eligible for this change.' }, { status: 404 });
  }
  if (!targetId) targetId = result.data?.id || null;

  const audited = await audit(user.email || user.id, action, targetId, meta);
  if (!audited) {
    return NextResponse.json({ error: 'The change was saved, but its audit record could not be written. Contact an administrator before retrying.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: targetId });
}
