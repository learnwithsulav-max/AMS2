import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { requireExamCandidate } from '@/lib/exam-auth';

export async function POST(req: Request) {
  const { user, response } = await requireExamCandidate(req);
  if (response) return response;
  const body = await req.json().catch(() => ({}));
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
  const questionId = Number(body.questionId);
  const reportType = String(body.reportType || 'other');
  const details = typeof body.details === 'string' ? body.details.trim().slice(0, 1000) : null;
  if (!attemptId || !Number.isInteger(questionId) || !['wrong_answer', 'unclear', 'translation', 'other'].includes(reportType)) {
    return NextResponse.json({ error: 'Choose a question and report type.' }, { status: 400 });
  }
  const { data: attempt, error: attemptError } = await admin
    .from('exam_attempts')
    .select('question_ids')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (attemptError) return NextResponse.json({ error: 'Could not verify this exam attempt.' }, { status: 503 });
  if (!attempt || (attempt.question_ids as number[]).indexOf(questionId) < 0) {
    return NextResponse.json({ error: 'Question does not belong to that exam attempt.' }, { status: 404 });
  }
  const { error } = await admin.from('question_reports').insert({
    attempt_id: attemptId,
    question_id: questionId,
    report_type: reportType,
    details,
  });
  if (error) return NextResponse.json({ error: 'Could not save your report.' }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
