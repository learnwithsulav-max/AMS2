import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { siteUrl } from '@/lib/brand';

export const dynamic = 'force-dynamic';
function redirect(path: string) { return NextResponse.redirect(path, { status: 303 }); }
function verifySignature(payload: Record<string, any>, secret: string) {
  const fields = String(payload.signed_field_names || '').split(',').filter(Boolean);
  if (!fields.length || !payload.signature) return false;
  const message = fields.map((name) => `${name}=${payload[name]}`).join(',');
  const actual = Buffer.from(String(payload.signature), 'base64');
  const expected = createHmac('sha256', secret).update(message).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function markPaid(order: any, transaction: string, request: Request) {
  let passCode: string | null = null;
  if (order.product === 'agency_basic' || order.product === 'agency_pro') {
    const plan = order.package_code === 'agency_pro' ? 'pro' : 'basic';
    const {data:pkg}=await admin.from('subscription_packages').select('duration_days').eq('code',order.package_code).maybeSingle();
    const now = new Date(); const until = new Date(now.getTime()+Number(pkg?.duration_days||180)*86400000);
    const { error } = await admin.from('agency_subscriptions').update({ plan, status: 'active', package_code:order.package_code, period_started_at: now.toISOString(), period_ends_at: until.toISOString(), updated_at: now.toISOString() }).eq('agent_id', order.user_id);
    if (error) throw error;
    const { error: profileError } = await admin.from('profiles').update({ membership: 'premium' }).eq('id', order.user_id);
    if (profileError) throw profileError;
  } else {
    const meta = order.metadata || {};
    const { data: existing, error: existingError } = await admin.from('exam_pass_orders').select('pass_code').eq('billing_order_id', order.id).maybeSingle();
    if (existingError) throw existingError;
    passCode = existing?.pass_code || `LWS-${randomBytes(8).toString('hex').toUpperCase()}`;
    if (!existing) {
      const {data:pkg}=await admin.from('subscription_packages').select('duration_days').eq('code',order.package_code||'exam_pro_month').maybeSingle();
      const expiresAt=new Date(Date.now()+Number(pkg?.duration_days||30)*86400000).toISOString();
      const claim = randomBytes(32).toString('hex');
      const { error } = await admin.from('exam_pass_orders').insert({ billing_order_id: order.id, name: meta.name, phone: meta.phone,
        amount: order.amount, currency: order.currency, payment_method: order.provider, receipt_reference: transaction,
        claim_token_hash: createHash('sha256').update(claim).digest('hex'), status: 'approved', pass_code: passCode,
        package_code:order.package_code||'exam_pro_month',expires_at:expiresAt,reviewed_by: 'payment provider', reviewed_at: new Date().toISOString() });
      if (error) throw error;
    }
    order.metadata = { ...meta, pass_code: passCode };
  }
  const { error: updateError } = await admin.from('billing_orders').update({ status: 'paid', provider_transaction: transaction, metadata: order.metadata || {}, updated_at: new Date().toISOString() }).eq('id', order.id).eq('status', 'pending');
  if (updateError) throw updateError;
  if(order.metadata?.coupon_code){const {error}=await admin.rpc('finalize_coupon',{p_order_id:order.id});if(error)throw error;}
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  await admin.from('activity_log').insert({ actor: order.user_id || 'exam candidate', action: 'billing_order_paid', meta: { order_id: order.id, product: order.product, provider: order.provider, ip, user_agent: request.headers.get('user-agent')?.slice(0, 500) || null } });
  return passCode;
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!['esewa','khalti'].includes(provider)) return NextResponse.json({ error: 'Unsupported payment provider.' }, { status: 404 });
  const url = new URL(request.url); const orderId = url.searchParams.get('order_id') || '';
  const { data: order } = await admin.from('billing_orders').select('*').eq('id', orderId).eq('provider', provider).maybeSingle();
  if (!order) return redirect(`${siteUrl('root')}/billing/return?status=not-found`);
  if (order.status === 'paid') {
    const pass = order.metadata?.pass_code;
    return redirect(order.product === 'exam_pass' && pass ? `${siteUrl('exam')}/?passCode=${encodeURIComponent(pass)}` : `${siteUrl('agency')}/?billing=success`);
  }
  try {
    let transaction = '';
    if (provider === 'khalti') {
      const pidx = url.searchParams.get('pidx') || '';
      // Bind the browser return to the provider transaction created for this order.
      // Without this check, a completed payment reference for another same-priced
      // order could be replayed against this callback URL.
      if (!pidx || pidx !== order.provider_reference) throw new Error('Khalti payment reference did not match this order.');
      const base = process.env.KHALTI_ENV === 'test' ? 'https://dev.khalti.com/api/v2' : 'https://khalti.com/api/v2';
      const response = await fetch(`${base}/epayment/lookup/`, { method: 'POST', headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ pidx }), cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || result.status !== 'Completed' || Number(result.total_amount) !== Math.round(Number(order.amount) * 100)) throw new Error('Khalti payment was not confirmed.');
      transaction = String(result.transaction_id || pidx);
    } else {
      const raw = url.searchParams.get('data') || '';
      const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      if (!process.env.ESEWA_SECRET_KEY || !verifySignature(payload, process.env.ESEWA_SECRET_KEY) || payload.status !== 'COMPLETE' || payload.transaction_uuid !== order.id || Number(payload.total_amount) !== Number(order.amount)) throw new Error('eSewa response signature or amount did not match.');
      const base = process.env.ESEWA_ENV === 'test' ? 'https://rc.esewa.com.np/api/epay/transaction/status/' : 'https://esewa.com.np/api/epay/transaction/status/';
      const statusUrl = new URL(base); statusUrl.searchParams.set('product_code', process.env.ESEWA_PRODUCT_CODE || ''); statusUrl.searchParams.set('total_amount', String(order.amount)); statusUrl.searchParams.set('transaction_uuid', order.id);
      const response = await fetch(statusUrl, { cache: 'no-store' }); const result = await response.json();
      if (!response.ok || result.status !== 'COMPLETE' || Number(result.total_amount) !== Number(order.amount)) throw new Error('eSewa payment is not confirmed.');
      transaction = String(result.ref_id || payload.transaction_code || order.id);
    }
    const pass = await markPaid(order, transaction, request);
    return redirect(order.product === 'exam_pass' && pass ? `${siteUrl('exam')}/?passCode=${encodeURIComponent(pass)}` : `${siteUrl('agency')}/?billing=success`);
  } catch (error) {
    console.error('Payment verification failed:', error instanceof Error ? error.message : 'unknown error');
    return redirect(`${siteUrl(order.product === 'exam_pass' ? 'exam' : 'agency')}/?billing=failed`);
  }
}
