import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || body.website) return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 });
  const { data: profile } = await admin.from('public_profiles').select('user_id').eq('slug', slug).eq('is_published', true).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'This advisor page is unavailable.' }, { status: 404 });
  const kind = body.kind;
  let result;
  if (kind === 'lead') {
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '';
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : null;
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : null;
    if (name.length < 2 || phone.replace(/\D/g, '').length < 7 || body.consent !== true) return NextResponse.json({ error: 'Enter your name and phone number and agree to be contacted.' }, { status: 400 });
    result = await admin.from('portfolio_leads').insert({ agent_id: profile.user_id, name, phone, email, message, consent: true });
  } else if (kind === 'review') {
    const reviewer_name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const rating = Number(body.rating); const review = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : null;
    if (reviewer_name.length < 2 || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: 'Enter your name and choose a rating from one to five.' }, { status: 400 });
    result = await admin.from('portfolio_reviews').insert({ agent_id: profile.user_id, reviewer_name, rating, review, approved: false });
  } else return NextResponse.json({ error: 'Choose a valid submission type.' }, { status: 400 });
  if (result.error) return NextResponse.json({ error: 'Could not save your submission. Please try again.' }, { status: 500 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  await admin.from('activity_log').insert({ actor: 'Public visitor', action: kind === 'lead' ? 'portfolio_lead_received' : 'portfolio_review_received', meta: { agent_id: profile.user_id, ip, user_agent: request.headers.get('user-agent')?.slice(0, 500) || null } });
  return NextResponse.json({ ok: true, message: kind === 'review' ? 'Review submitted for approval.' : 'Your request was sent to the advisor.' }, { status: 201 });
}
