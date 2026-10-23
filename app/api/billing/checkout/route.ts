import { createHmac, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { requirePortalUser } from '@/lib/portal-auth';
import { siteUrl } from '@/lib/brand';

export const dynamic = 'force-dynamic';
const money = (value: number) => value.toFixed(2);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const product = body.product;
  const packageCode = typeof body.packageCode === 'string' ? body.packageCode : (product === 'exam_pass' ? 'exam_pro_month' : product);
  const provider = body.provider;
  if (!['agency_basic','agency_pro','exam_pass'].includes(product) || !['esewa','khalti'].includes(provider)) return NextResponse.json({ error: 'Choose an available plan and payment provider.' }, { status: 400 });

  let user: any = null;
  let guestName = ''; let guestPhone = '';
  if (product === 'exam_pass') {
    guestName = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    guestPhone = typeof body.phone === 'string' ? body.phone.replace(/[^+\d]/g, '').slice(0, 20) : '';
    if (guestName.length < 2 || guestPhone.replace(/\D/g, '').length < 7) return NextResponse.json({ error: 'Enter your full name and phone number to buy an exam pass.' }, { status: 400 });
  } else {
    const auth = await requirePortalUser(request, true); if (auth.response) return auth.response; user = auth.user;
  }

  const { data: pkg, error: packageError } = await admin.from('subscription_packages').select('code,audience,amount_npr,duration_days,active').eq('code',packageCode).eq('active',true).maybeSingle();
  if(packageError||!pkg||pkg.amount_npr<=0||pkg.audience!==(product==='exam_pass'?'exam':'agency'))return NextResponse.json({error:'This package is unavailable.'},{status:400});
  const amount=Number(pkg.amount_npr); const currency='NPR';

  const esewaReady = !!(process.env.ESEWA_PRODUCT_CODE && process.env.ESEWA_SECRET_KEY);
  const khaltiReady = !!process.env.KHALTI_SECRET_KEY;
  if (provider === 'esewa' && !esewaReady || provider === 'khalti' && !khaltiReady) return NextResponse.json({ error: `${provider === 'esewa' ? 'eSewa' : 'Khalti'} checkout is not configured yet.` }, { status: 503 });

  const { data: order, error: insertError } = await admin.from('billing_orders').insert({
    user_id: user?.id || null, product: product==='exam_pass'?'exam_pass':packageCode, package_code:packageCode, provider, amount, currency, metadata: { ...(guestName ? { name: guestName, phone: guestPhone } : {}), duration_days:pkg.duration_days },
  }).select('id').single();
  if (insertError || !order) return NextResponse.json({ error: 'Could not create the payment request.' }, { status: 500 });
  const callback = `${siteUrl('root')}/api/billing/callback/${provider}?order_id=${encodeURIComponent(order.id)}`;

  if (provider === 'esewa') {
    const productCode = process.env.ESEWA_PRODUCT_CODE!;
    const totalAmount = money(amount);
    const fields: Record<string, string> = {
      amount: totalAmount, tax_amount: '0', total_amount: totalAmount, transaction_uuid: order.id,
      product_code: productCode, product_service_charge: '0', product_delivery_charge: '0',
      success_url: callback, failure_url: callback, signed_field_names: 'total_amount,transaction_uuid,product_code',
    };
    fields.signature = createHmac('sha256', process.env.ESEWA_SECRET_KEY!).update(`total_amount=${fields.total_amount},transaction_uuid=${fields.transaction_uuid},product_code=${fields.product_code}`).digest('base64');
    await admin.from('billing_orders').update({ provider_reference: order.id }).eq('id', order.id);
    return NextResponse.json({ provider: 'esewa', action: process.env.ESEWA_ENV === 'test' ? 'https://rc-epay.esewa.com.np/api/epay/main/v2/form' : 'https://epay.esewa.com.np/api/epay/main/v2/form', fields });
  }

  const base = process.env.KHALTI_ENV === 'test' ? 'https://dev.khalti.com/api/v2' : 'https://khalti.com/api/v2';
  const response = await fetch(`${base}/epayment/initiate/`, {
    method: 'POST', headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ return_url: callback, website_url: siteUrl('root'), amount: Math.round(amount * 100), purchase_order_id: order.id,
      purchase_order_name: product.replace('_', ' '), customer_info: user ? { name: user.user_metadata?.name || user.email, email: user.email, phone: user.user_metadata?.phone } : { name: guestName, phone: guestPhone } }),
    cache: 'no-store',
  });
  const khalti = await response.json().catch(() => ({}));
  if (!response.ok || !khalti.payment_url || !khalti.pidx) {
    await admin.from('billing_orders').update({ status: 'failed', metadata: { error: 'provider_init_failed' } }).eq('id', order.id);
    return NextResponse.json({ error: 'Khalti could not initialize payment. Try again later.' }, { status: 502 });
  }
  await admin.from('billing_orders').update({ provider_reference: khalti.pidx }).eq('id', order.id);
  return NextResponse.json({ provider: 'khalti', paymentUrl: khalti.payment_url, orderId: order.id });
}
