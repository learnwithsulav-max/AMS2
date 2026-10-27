import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { QUESTIONS } from '@/lib/questions';
import { admin } from '@/lib/supabase-admin';
import { EXAM } from '@/lib/brand';
import { requireExamCandidate } from '@/lib/exam-auth';
import { enqueueNotification } from '@/lib/notifications';
import { BRAND } from '@/lib/brand';

export const dynamic = 'force-dynamic';
const GRACE_MS = 120000; // allowance for slow connections after the timer ends

function certId() {
  return `LWS-CERT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${randomBytes(5).toString('hex').toUpperCase()}`;
}

export async function POST(req: Request) {
  const { user, profile, response } = await requireExamCandidate(req);
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
  if (!attemptId) return NextResponse.json({ error: 'A valid exam attempt is required.' }, { status: 400 });
  const { data: at, error: attemptError } = await admin
    .from('exam_attempts')
    .select('id,user_id,name,phone,question_ids,answers,ends_at,submitted_at,score,max_marks,passed,cert_id')
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (attemptError) return NextResponse.json({ error: 'Could not load this exam attempt.' }, { status: 503 });
  if (!at) return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });

  const already = !!at.submitted_at;
  const expired = !already && Date.now() > new Date(at.ends_at).getTime() + GRACE_MS;
  const submittedAnswers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
    ? body.answers as Record<string, unknown>
    : {};
  const given: Record<string, string> = already ? at.answers || {} : {};
  if (!already && !expired) {
    for (const questionId of at.question_ids as number[]) {
      const answer = submittedAnswers[String(questionId)];
      if (typeof answer === 'string' && ['A', 'B', 'C', 'D'].includes(answer)) given[String(questionId)] = answer;
    }
  }

  const ids = at.question_ids as number[];
  const { data: imported, error: questionError } = await admin.from('question_bank').select('id,category,question_en,question_ne,option_a_en,option_b_en,option_c_en,option_d_en,option_a_ne,option_b_ne,option_c_ne,option_d_ne,correct_option').in('id', ids);
  if (questionError) return NextResponse.json({ error: 'Could not load the exam answer key.' }, { status: 503 });
  const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
  for (const row of imported || []) byId.set(Number(row.id), {
    id: Number(row.id), category: row.category,
    q: row.question_en || row.question_ne, ans: row.correct_option,
    options: ['A','B','C','D'].map((key) => ({ k: key, text: row[`option_${key.toLowerCase()}_en`] || row[`option_${key.toLowerCase()}_ne`] })),
  });
  let correct = 0, skipped = 0;
  const review = (at.question_ids as number[]).map((id) => {
    const q = byId.get(id);
    if (!q) throw new Error(`Question ${id} is missing from the exam bank.`);
    const chosen = given[String(id)];
    const ok = chosen === q.ans;
    if (!chosen) skipped++; else if (ok) correct++;
    const text = (k?: string) => q.options.find((o) => o.k === k)?.text || '';
    return { id, q: q.q, chosen: text(chosen), right: text(q.ans), ok, skipped: !chosen };
  });

  const max = review.length * EXAM.pointsPerQuestion;
  const score = correct * EXAM.pointsPerQuestion;
  const passed = score >= Math.ceil((EXAM.passPercent / 100) * max);
  let cert = at.cert_id as string | null;
  let issuedAt = at.submitted_at || new Date().toISOString();

  if (!already) {
    // Issue a uniquely numbered exam outcome certificate for both passing and
    // failing candidates; the visible status badge remains authoritative.
    cert = cert || certId();
    const submitted = new Date().toISOString();
    const { data: saved, error: saveError } = await admin.from('exam_attempts').update({
      submitted_at: new Date().toISOString(), answers: given, score, max_marks: max, passed, cert_id: cert,
    }).eq('id', attemptId).eq('user_id', user.id).is('submitted_at', null).select('id').maybeSingle();
    if (saveError) return NextResponse.json({ error: 'Could not save your exam result.' }, { status: 500 });
    if (!saved) return NextResponse.json({ error: 'This attempt was submitted already. Reload the page to see its result.' }, { status: 409 });
    issuedAt = submitted;
    const { error: logError } = await admin.from('activity_log').insert({
      actor: `Exam participant · ${String(at.phone).slice(-4).padStart(String(at.phone).length, '*')}`,
      action: passed ? 'exam_passed' : 'exam_failed',
      meta: { score, max, expired, ip: reqIp(req), user_agent: req.headers.get('user-agent')?.slice(0, 500) || null },
    });
    if (logError) console.error('Exam result was saved, but activity logging failed:', logError.message);

    const groupLink = passed ? BRAND.links.pass : BRAND.links.fail;
    const resultMessage = `${at.name}, your exam result: ${passed ? 'PASS' : 'FAIL'}. Score: ${score}/${max}.` +
      (passed && cert ? ` Certificate code: ${cert}.` : '') +
      ` Join your ${passed ? 'pass' : 'fail'} WhatsApp group: ${groupLink}`;
    const deliveries = [];
    if (profile.email) {
      deliveries.push(enqueueNotification({
        dedupeKey: `exam-result:${attemptId}`,
        channel: 'email',
        recipient: profile.email,
        subject: `Exam result: ${passed ? 'Pass' : 'Fail'}`,
        message: resultMessage,
      }));
    }
    if (profile.phone && profile.whatsapp_opt_in) {
      deliveries.push(enqueueNotification({
        dedupeKey: `exam-result:${attemptId}`,
        channel: 'whatsapp',
        recipient: profile.phone,
        subject: `Exam result: ${passed ? 'Pass' : 'Fail'}`,
        message: resultMessage,
      }));
    }
    try {
      await Promise.all(deliveries);
    } catch (error) {
      console.error('Exam result was saved, but notifications could not be queued:', error instanceof Error ? error.message : 'unknown error');
    }
  }

  // Backfill an official identifier when an older submitted attempt is opened
  // again; failed legacy attempts were previously stored without one.
  if (!cert) {
    const candidate = certId();
    const { data: issued, error: issueError } = await admin.from('exam_attempts')
      .update({ cert_id: candidate }).eq('id', attemptId).eq('user_id', user.id).is('cert_id', null)
      .select('cert_id').maybeSingle();
    if (issueError) return NextResponse.json({ error: 'Could not issue this exam result certificate.' }, { status: 500 });
    if (issued?.cert_id) cert = issued.cert_id;
    else {
      const { data: current, error: currentError } = await admin.from('exam_attempts').select('cert_id').eq('id', attemptId).eq('user_id', user.id).maybeSingle();
      if (currentError || !current?.cert_id) return NextResponse.json({ error: 'Could not verify this exam result certificate.' }, { status: 500 });
      cert = current.cert_id;
    }
  }

  return NextResponse.json({
    attemptId, name: at.name, score, max, correct, wrong: review.length - correct - skipped, skipped, passed, expired,
    certId: cert, issuedAt, review,
  });
}

function reqIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
}
