import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { requireExamCandidate } from '@/lib/exam-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user, response } = await requireExamCandidate(request);
  if (response) return response;

  const { data, error } = await admin.from('exam_attempts')
    .select('id,name,score,max_marks,passed,cert_id,submitted_at')
    .eq('user_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: 'Could not load your exam attempts.' }, { status: 503 });
  return NextResponse.json({ attempts: (data || []).map((attempt) => ({
    id: attempt.id,
    at: attempt.submitted_at,
    name: attempt.name || 'Candidate',
    score: attempt.score,
    max: attempt.max_marks,
    passed: attempt.passed === true,
    certId: attempt.cert_id,
  })) });
}
