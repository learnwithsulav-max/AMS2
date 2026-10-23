import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const packageCode = typeof body?.packageCode === 'string' ? body.packageCode.trim().slice(0, 60) : '';
  const couponCode = typeof body?.couponCode === 'string' ? body.couponCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32) : '';
  if (!packageCode) return NextResponse.json({ error: 'Choose a package.' }, { status: 400 });
  const { data: pkg, error } = await admin.from('subscription_packages').select('code,amount_npr,active').eq('code', packageCode).eq('active', true).maybeSingle();
  if (error || !pkg) return NextResponse.json({ error: 'This package is unavailable.' }, { status: 404 });
  let discount = 0;
  if (couponCode) {
    const { data, error: couponError } = await admin.rpc('coupon_discount', { p_code: couponCode });
    if (couponError || data == null) return NextResponse.json({ error: 'This coupon is invalid, expired, or has reached its use limit.' }, { status: 400 });
    discount = Number(data);
    if(discount>=100)return NextResponse.json({error:'A 100% coupon cannot be used for a paid package.'},{status:400});
  }
  return NextResponse.json({ packageCode, baseAmount: Number(pkg.amount_npr), discountPercent: discount, amount: Number((Number(pkg.amount_npr) * (1 - discount / 100)).toFixed(2)) });
}
