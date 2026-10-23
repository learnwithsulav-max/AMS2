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
  const name = String(body.name || '').trim().slice(0, 80);
  const phone = String(body.phone || '').replace(/\D/g, '').slice(0, 15);
  if (name.length < 2 || phone.length < 7) return NextResponse.json({ error: 'Enter your full name and a valid phone number.' }, { status: 400 });

  const picked = selectQuestions();
  if (!picked || picked.length !== EXAM.total) {
    return NextResponse.json(
      { error: 'The exam question bank is incomplete. Please contact the administrator.' },
      { status: 503 },
    );
  }

  const now = Date.now();
  const endsAt = new Date(now + EXAM.minutes * 60000).toISOString();
  const { data, error } = await admin.from('exam_attempts')
    .insert({ name, phone, question_ids: picked.map((q) => q.id), ends_at: endsAt }).select('id').single();
  if (error || !data) return NextResponse.json({ error: 'Could not start the exam. Try again in a moment.' }, { status: 500 });

  // Options are shuffled per attempt, so the position of the right answer varies.
  const questions = picked.map((q) => ({ id: q.id, q: q.q, options: shuffle(q.options) }));
  return NextResponse.json({ attemptId: data.id, name, endsAt, serverNow: now, questions });
}
