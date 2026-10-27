import { NextResponse } from 'next/server';
import { requireExamCandidate } from '@/lib/exam-auth';
import { admin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user, response } = await requireExamCandidate(request);
  if (response) return response;

  const now = new Date().toISOString();
  const [{ data: pass, error: passError }, { data: pending, error: pendingError }] = await Promise.all([
    admin
      .from('exam_pass_orders')
      .select('id,expires_at')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('billing_orders')
      .select('id,status')
      .eq('user_id', user.id)
      .eq('product', 'exam_pass')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (passError || pendingError) {
    console.error('Exam access lookup failed:', passError?.message || pendingError?.message);
    return NextResponse.json({ error: 'Could not check exam access.' }, { status: 503 });
  }
  return NextResponse.json({
    active: !!pass,
    expiresAt: pass?.expires_at || null,
    pending: !!pending,
  });
}
