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

function selectImported(rows: any[]) {
  const perCategory = Math.floor(EXAM.total / QUESTION_CATEGORIES.length);
  const remaining = EXAM.total % QUESTION_CATEGORIES.length;
  const selected: any[] = [];
  for (const [index, category] of QUESTION_CATEGORIES.entries()) {
    const quota = perCategory + (index < remaining ? 1 : 0);
    const available = rows.filter((row) => row.category === category).map((row) => ({
      id: Number(row.id), category: row.category, q: row.question_en || row.question_ne,
      ans: row.correct_option,
      options: ['A','B','C','D'].map((key) => ({ k: key, text: row[`option_${key.toLowerCase()}_en`] || row[`option_${key.toLowerCase()}_ne`] })),
    }));
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
    const { data, error } = await admin.from('exam_pass_orders').select('id,name,phone,expires_at')
      .eq('pass_code', passCode).eq('status', 'approved').maybeSingle();
    if (error) return NextResponse.json({ error: 'Could not verify the exam pass.' }, { status: 500 });
    if (!data || !data.expires_at || new Date(data.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'This exam pass is invalid, expired, or has not been approved.' }, { status: 403 });
    pass = data;
    name = data.name;
    phone = data.phone;
  } else {
    name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '').slice(0, 15) : '';
    if (name.length < 2 || phone.length < 7) return NextResponse.json({ error: 'Enter your full name and a valid phone number.' }, { status: 400 });
  }

  const { data: imported } = await admin.from('question_bank').select('id,category,question_en,question_ne,option_a_en,option_b_en,option_c_en,option_d_en,option_a_ne,option_b_ne,option_c_ne,option_d_ne,correct_option').eq('active', true);
  const picked = imported?.length ? (selectImported(imported) || selectQuestions()) : selectQuestions();
  if (!picked || picked.length !== EXAM.total) {
    return NextResponse.json(
      { error: 'The exam question bank is incomplete. Please contact the administrator.' },
      { status: 503 },
    );
  }

  const now = Date.now();
  const endsAt = new Date(now + EXAM.minutes * 60000).toISOString();
  const attemptRow = { name, phone, question_ids: picked.map((q) => q.id), ends_at: endsAt, ...(pass ? { pass_order_id: pass.id } : {}) };
  const { data, error } = await admin.from('exam_attempts').insert(attemptRow).select('id').single();
  if (error || !data) {
    return NextResponse.json({ error: 'Could not start the exam. Try again in a moment.' }, { status: 500 });
  }
  // Options are shuffled per attempt, so the position of the right answer varies.
  const questions = picked.map((q) => ({ id: q.id, q: q.q, options: shuffle(q.options) }));
  return NextResponse.json({ attemptId: data.id, name, endsAt, serverNow: now, questions });
}
