import { NextResponse } from 'next/server';
import { QUESTIONS, QUESTION_CATEGORIES } from '@/lib/questions';
import { admin } from '@/lib/supabase-admin';
import { EXAM } from '@/lib/brand';

export const dynamic = 'force-dynamic';

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

function selectQuestions() {
  const perCategory = Math.floor(EXAM.total / QUESTION_CATEGORIES.length);
  const remaining = EXAM.total % QUESTION_CATEGORIES.length;
  const selected = [];

  for (const [index, category] of QUESTION_CATEGORIES.entries()) {
    const quota = perCategory + (index < remaining ? 1 : 0);
    const available = QUESTIONS.filter((question) => question.category === category);
    if (available.length < quota) return null;
    selected.push(...shuffle(available).slice(0, quota));
  }

  return shuffle(selected);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { data: setting, error: settingError } = await admin.from('exam_pass_settings').select('price,active').eq('id', true).maybeSingle();
  if (settingError) return NextResponse.json({ error: 'Could not check exam access settings.' }, { status: 503 });
  const paidPassRequired = !!setting?.active && Number(setting.price) > 0;
  let pass: { id: string; name: string; phone: string } | null = null;
  let name = '';
  let phone = '';
  if (paidPassRequired) {
    const passCode = typeof body.passCode === 'string' ? body.passCode.trim().toUpperCase() : '';
    if (!/^LWS-[A-F0-9]{16}$/.test(passCode)) return NextResponse.json({ error: 'Enter a valid exam pass code.' }, { status: 400 });
    const { data, error } = await admin.from('exam_pass_orders').select('id,name,phone')
      .eq('pass_code', passCode).eq('status', 'approved').maybeSingle();
    if (error) return NextResponse.json({ error: 'Could not verify the exam pass.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'This exam pass is invalid, already used, or has not been approved.' }, { status: 403 });
    pass = data;
    name = data.name;
    phone = data.phone;
  } else {
    name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '').slice(0, 15) : '';
    if (name.length < 2 || phone.length < 7) return NextResponse.json({ error: 'Enter your full name and a valid phone number.' }, { status: 400 });
  }

  const picked = selectQuestions();
  if (!picked || picked.length !== EXAM.total) {
    return NextResponse.json(
      { error: 'The exam question bank is incomplete. Please contact the administrator.' },
      { status: 503 },
    );
  }

  const now = Date.now();
  const endsAt = new Date(now + EXAM.minutes * 60000).toISOString();
  if (pass) {
    const { data: reserved, error: reserveError } = await admin.from('exam_pass_orders')
      .update({ status: 'redeemed' }).eq('id', pass.id).eq('status', 'approved').select('id').maybeSingle();
    if (reserveError) return NextResponse.json({ error: 'Could not reserve this exam pass. Please try again.' }, { status: 500 });
    if (!reserved) return NextResponse.json({ error: 'This exam pass has already been used.' }, { status: 409 });
  }
  const attemptRow = { name, phone, question_ids: picked.map((q) => q.id), ends_at: endsAt, ...(pass ? { pass_order_id: pass.id } : {}) };
  const { data, error } = await admin.from('exam_attempts').insert(attemptRow).select('id').single();
  if (error || !data) {
    if (pass) await admin.from('exam_pass_orders').update({ status: 'approved' }).eq('id', pass.id).eq('status', 'redeemed');
    return NextResponse.json({ error: 'Could not start the exam. Try again in a moment.' }, { status: 500 });
  }
  // Options are shuffled per attempt, so the position of the right answer varies.
  const questions = picked.map((q) => ({ id: q.id, q: q.q, options: shuffle(q.options) }));
  return NextResponse.json({ attemptId: data.id, name, endsAt, serverNow: now, questions });
}
