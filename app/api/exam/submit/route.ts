import { NextResponse } from 'next/server';
import { QUESTIONS } from '@/lib/questions';
import { admin } from '@/lib/supabase-admin';
import { EXAM } from '@/lib/brand';

export const dynamic = 'force-dynamic';
const GRACE_MS = 120000; // allowance for slow connections after the timer ends

function certId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rnd = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `LWS-CERT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${rnd}`;
}

export async function POST(req: Request) {
  const { attemptId, answers } = await req.json().catch(() => ({}));
  const { data: at } = await admin.from('exam_attempts').select('*').eq('id', attemptId).maybeSingle();
  if (!at) return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });

  const already = !!at.submitted_at;
  const expired = !already && Date.now() > new Date(at.ends_at).getTime() + GRACE_MS;
  const given: Record<string, string> = already ? at.answers || {} : expired ? {} : answers || {};

  const ids = at.question_ids as number[];
  const { data: imported } = await admin.from('question_bank').select('id,category,question_en,question_ne,option_a_en,option_b_en,option_c_en,option_d_en,option_a_ne,option_b_ne,option_c_ne,option_d_ne,correct_option').in('id', ids);
  const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
  for (const row of imported || []) byId.set(Number(row.id), {
    id: Number(row.id), category: row.category,
    q: row.question_en || row.question_ne, ans: row.correct_option,
    options: ['A','B','C','D'].map((key) => ({ k: key, text: row[`option_${key.toLowerCase()}_en`] || row[`option_${key.toLowerCase()}_ne`] })),
  });
  let correct = 0, skipped = 0;
  const review = (at.question_ids as number[]).map((id) => {
    const q = byId.get(id)!;
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

  if (!already) {
    cert = passed ? certId() : null;
    await admin.from('exam_attempts').update({
      submitted_at: new Date().toISOString(), answers: given, score, max_marks: max, passed, cert_id: cert,
    }).eq('id', attemptId).is('submitted_at', null);
    await admin.from('activity_log').insert({
      actor: `Exam participant · ${String(at.phone).slice(-4).padStart(String(at.phone).length, '*')}`,
      action: passed ? 'exam_passed' : 'exam_failed',
      meta: { score, max, expired, ip: reqIp(req), user_agent: req.headers.get('user-agent')?.slice(0, 500) || null },
    });
  }

  return NextResponse.json({
    name: at.name, score, max, correct, wrong: review.length - correct - skipped, skipped, passed, expired,
    certId: passed ? cert : null, issuedAt: new Date().toISOString(), review,
  });
}

function reqIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null;
}
