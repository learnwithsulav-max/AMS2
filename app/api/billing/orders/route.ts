import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { admin } from '@/lib/supabase-admin';
import { requirePortalUser } from '@/lib/portal-auth';
import { requireExamCandidate } from '@/lib/exam-auth';
import { enqueueUserNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
const hash = (v: string) => createHash('sha256').update(v).digest('hex');

export async function POST(request: Request) {
  const form = await request.formData();
  const packageCode = String(form.get('packageCode') || '');
  const provider = String(form.get('provider') || '');
  const couponCode = String(form.get('couponCode') || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32);
  const file = form.get('voucher');
  const isExam = packageCode.startsWith('exam_');
  let user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;
  let profile: { name: string | null; email: string | null; phone: string | null } | null = null;
  if (isExam) {
    const auth = await requireExamCandidate(request);
    if (auth.response) return auth.response;
    user = auth.user;
    profile = auth.profile;
  } else {
    const auth = await requirePortalUser(request, true);
    if (auth.response) return auth.response;
    user = auth.user;
  }
  const { data: pkg } = await admin.from('subscription_packages').select('code,audience,amount_npr,duration_days,active').eq('code', packageCode).eq('active', true).maybeSingle();
  if (!pkg || (isExam ? pkg.audience !== 'exam' : pkg.audience !== 'agency') || !['fonepay','nepalpay'].includes(provider)) return NextResponse.json({ error: 'Choose a valid package and QR payment method.' }, { status: 400 });
  if (!(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) return NextResponse.json({ error: 'Upload a JPEG, PNG or WebP voucher up to 5 MB.' }, { status: 400 });
  const metadataName = typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '';
  const name = isExam ? profile?.name || metadataName : '';
  const phone = isExam ? profile?.phone || '' : '';
  if (isExam && (name.length < 2 || phone.replace(/\D/g,'').length < 7)) return NextResponse.json({ error: 'Enter your name and valid phone number.' }, { status: 400 });
  let discount = 0;
  if (couponCode) {
    const { data, error } = await admin.rpc('coupon_discount', { p_code: couponCode });
    if (error || data == null) return NextResponse.json({ error: 'This coupon is invalid, expired, or has reached its use limit.' }, { status: 400 });
    discount = Number(data);
  }
  const amount = Number((Number(pkg.amount_npr) * (1 - discount / 100)).toFixed(2));
  if (amount <= 0) return NextResponse.json({ error: 'A 100% discount cannot be used for a manual QR payment.' }, { status: 400 });
  const raw = Buffer.from(await file.arrayBuffer());
  let image: Buffer;
  try {
    const mark=await readFile(join(process.cwd(),'public','logo.png'));
    const logo = await sharp(Buffer.from(`<svg width="620" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="12" fill="#0A4F8A" fill-opacity=".88"/><image href="data:image/png;base64,${mark.toString('base64')}" x="12" y="10" width="80" height="80" preserveAspectRatio="xMidYMid meet"/><text x="110" y="62" fill="white" font-size="28" font-family="Arial" font-weight="bold">Learn With Sulav · Voucher</text></svg>`)).png().toBuffer();
    image = await sharp(raw).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).composite([{ input: logo, gravity: 'south', blend: 'over' }]).jpeg({ quality: 82 }).toBuffer();
  } catch { return NextResponse.json({ error: 'This voucher image could not be processed.' }, { status: 400 }); }
  const id = randomUUID();
  const path = `${isExam ? `exam/${user!.id}` : user!.id}/${id}.jpg`;
  const { error: uploadError } = await admin.storage.from('payment-vouchers').upload(path, image, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) return NextResponse.json({ error: 'Could not securely store the voucher.' }, { status: 500 });
  const { data, error } = await admin.from('billing_orders').insert({ id, user_id: user?.id || null, product: isExam ? 'exam_pass' : packageCode, package_code: packageCode, provider, amount, currency: 'NPR', status: 'pending', voucher_path: path, claim_token_hash: null, metadata: { ...(isExam ? { name, phone, email: profile?.email } : {}), duration_days: pkg.duration_days, ...(couponCode ? { coupon_code: couponCode, discount_percent: discount } : {}) } }).select('id,amount,currency,status,created_at').single();
  if (error || !data) { await admin.storage.from('payment-vouchers').remove([path]); return NextResponse.json({ error: 'Could not create the payment request.' }, { status: 500 }); }
  if (couponCode) {
    const { data: reserved, error: reserveError } = await admin.rpc('reserve_coupon', { p_code: couponCode, p_order_id: id });
    if (reserveError || reserved == null) {
      await admin.from('billing_orders').delete().eq('id', id);
      await admin.storage.from('payment-vouchers').remove([path]);
      return NextResponse.json({ error: 'This coupon just reached its use limit. Try another code.' }, { status: 409 });
    }
  }
  if (isExam && user) {
    try {
      await enqueueUserNotification({
        userId: user.id,
        dedupeKey: `exam-payment-received:${id}`,
        subject: 'Exam payment receipt received',
        message: `Your payment voucher for ${packageCode} was received and is pending review.`,
      });
    } catch (notifyError) {
      console.error('Payment order was created, but confirmation could not be queued:', notifyError instanceof Error ? notifyError.message : 'unknown error');
    }
  }
  return NextResponse.json({ order: data }, { status: 201 });
}

export async function GET(request: Request) {
  const url = new URL(request.url); const id = url.searchParams.get('id') || '';
  const claim = url.searchParams.get('claim') || '';
  if (!id) return NextResponse.json({ error: 'Order id is required.' }, { status: 400 });
  const { data, error } = await admin.from('billing_orders').select('id,user_id,package_code,product,amount,currency,status,expires_at,claim_token_hash,metadata,created_at').eq('id',id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (data.product === 'exam_pass') {
    const auth = await requireExamCandidate(request);
    if (auth.response) return auth.response;
    if (auth.user.id !== data.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else if (data.user_id) {
    const auth = await requirePortalUser(request, true);
    if (auth.response) return auth.response;
    if (auth.user.id !== data.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  else { const expected = Buffer.from(data.claim_token_hash || '', 'hex'); const actual = Buffer.from(hash(claim),'hex'); if (!claim || expected.length !== actual.length || !expected.length || !timingSafeEqual(expected,actual)) return NextResponse.json({error:'Invalid private order link.'},{status:403}); }
  let passCode: string | null = null;
  if (data.status === 'paid' && data.product === 'exam_pass') { const { data: pass } = await admin.from('exam_pass_orders').select('pass_code').eq('billing_order_id',id).maybeSingle(); passCode = pass?.pass_code || null; }
  return NextResponse.json({ order: { id:data.id, packageCode:data.package_code, amount:data.amount, currency:data.currency, status:data.status, expiresAt:data.expires_at, passCode, createdAt:data.created_at } });
}
