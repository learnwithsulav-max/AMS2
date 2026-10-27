import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { requireExamCandidate } from '@/lib/exam-auth';

export const dynamic = 'force-dynamic';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export async function GET() {
  const { data, error } = await admin.from('exam_pass_settings').select('price,currency,active,payment_instructions').eq('id', true).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load exam pass settings.' }, { status: 500 });
  return NextResponse.json({ price: data?.price ?? 0, currency: data?.currency ?? 'NPR', active: !!data?.active && Number(data?.price) > 0, paymentInstructions: data?.payment_instructions || '' });
}

export async function POST(request: Request) {
  const auth = await requireExamCandidate(request);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.trim().slice(0, 40) : '';
  const receiptReference = typeof body.receiptReference === 'string' ? body.receiptReference.trim().slice(0, 120) : '';
  if (paymentMethod.length < 2 || receiptReference.length < 3) {
    return NextResponse.json({ error: 'Enter a payment method and receipt or transaction reference.' }, { status: 400 });
  }
  const { data: setting, error: settingError } = await admin.from('exam_pass_settings').select('price,currency,active,payment_instructions').eq('id', true).maybeSingle();
  if (settingError) return NextResponse.json({ error: 'Could not load exam pass settings.' }, { status: 500 });
  if (!setting?.active || Number(setting.price) <= 0) return NextResponse.json({ error: 'Exam pass sales are not open yet.' }, { status: 503 });

  const claimToken = randomBytes(32).toString('hex');
  const { data, error } = await admin.from('exam_pass_orders').insert({
    user_id: auth.user.id,
    name: auth.profile.name || auth.user.email || 'Candidate',
    phone: auth.profile.phone || '',
    amount: setting.price, currency: setting.currency, payment_method: paymentMethod,
    receipt_reference: receiptReference, claim_token_hash: hash(claimToken),
  }).select('id,amount,currency,status,created_at').single();
  if (error || !data) {
    console.error('Exam pass request could not be recorded:', error?.message);
    return NextResponse.json({ error: 'Could not submit your receipt. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ order: data, claimToken }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = typeof body.orderId === 'string' ? body.orderId : '';
  const token = typeof body.claimToken === 'string' ? body.claimToken : '';
  if (!id || !/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Enter a valid order and claim token.' }, { status: 400 });
  const { data, error } = await admin.from('exam_pass_orders').select('id,name,phone,amount,currency,status,pass_code,created_at,claim_token_hash').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not check this request.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Pass request not found.' }, { status: 404 });
  const actual = Buffer.from(hash(token), 'hex');
  const expected = Buffer.from(data.claim_token_hash || '', 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'This private order link is invalid.' }, { status: 403 });
  return NextResponse.json({ order: { id: data.id, name: data.name, phone: data.phone, amount: data.amount, currency: data.currency, status: data.status, passCode: data.status === 'approved' ? data.pass_code : null, createdAt: data.created_at } });
}
