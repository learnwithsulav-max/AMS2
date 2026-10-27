import { NextResponse } from 'next/server';
import { QUESTIONS, QUESTION_CATEGORIES } from '@/lib/questions';
import { admin } from '@/lib/supabase-admin';
import { EXAM } from '@/lib/brand';
import { requireExamCandidate } from '@/lib/exam-auth';

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
  const { user, profile, response } = await requireExamCandidate(req);
  if (response) return response;

  const { data: pass, error: passError } = await admin.from('exam_pass_orders')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (passError) return NextResponse.json({ error: 'Could not verify your exam pass.' }, { status: 503 });
  if (!pass) return NextResponse.json({ error: 'An approved, paid exam pass is required to start.' }, { status: 403 });

  const { data: imported, error: questionError } = await admin.from('question_bank').select('id,category,question_en,question_ne,option_a_en,option_b_en,option_c_en,option_d_en,option_a_ne,option_b_ne,option_c_ne,option_d_ne,correct_option').eq('active', true);
  if (questionError) return NextResponse.json({ error: 'Could not load the exam question bank.' }, { status: 503 });
  const picked = imported?.length ? (selectImported(imported) || selectQuestions()) : selectQuestions();
  if (!picked || picked.length !== EXAM.total) {
    return NextResponse.json(
      { error: 'The exam question bank is incomplete. Please contact the administrator.' },
      { status: 503 },
    );
  }

  const now = Date.now();
  const endsAt = new Date(now + EXAM.minutes * 60000).toISOString();
  const attemptRow = {
    user_id: user.id,
    name: profile.name || user.email || 'Candidate',
    phone: profile.phone || '',
    question_ids: picked.map((q) => q.id),
    ends_at: endsAt,
    pass_order_id: pass.id,
  };
  const { data, error } = await admin.from('exam_attempts').insert(attemptRow).select('id').single();
  if (error || !data) {
    console.error('Exam attempt could not be created:', error?.message || 'No attempt row returned.');
    return NextResponse.json({ error: 'Could not start the exam. Try again in a moment.' }, { status: 500 });
  }
  // Options are shuffled per attempt, so the position of the right answer varies.
  const questions = picked.map((q) => ({ id: q.id, q: q.q, options: shuffle(q.options) }));
  return NextResponse.json({ attemptId: data.id, name: attemptRow.name, endsAt, serverNow: now, questions });
}
