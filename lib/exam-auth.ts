import 'server-only';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { requirePortalUser } from '@/lib/portal-auth';

export async function requireExamCandidate(request: Request) {
  const auth = await requirePortalUser(request, false);
  if (auth.response) return { user: null, profile: null, response: auth.response };

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id,name,email,phone,portal_type,whatsapp_opt_in')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) {
    return {
      user: null,
      profile: null,
      response: NextResponse.json({ error: 'Could not verify your exam account.' }, { status: 503 }),
    };
  }
  if (!profile || profile.portal_type !== 'exam_candidate') {
    return {
      user: null,
      profile: null,
      response: NextResponse.json({ error: 'Use an exam candidate account to continue.' }, { status: 403 }),
    };
  }

  return { user: auth.user, profile, response: null };
}
