import 'server-only';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';

export async function requireAdmin(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) {
    return { user: null, response: NextResponse.json({ error: 'Sign in as an administrator to continue.' }, { status: 401 }) };
  }

  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) {
    return { user: null, response: NextResponse.json({ error: 'Your session is invalid or expired. Sign in again.' }, { status: 401 }) };
  }

  // The access token has been validated by getUser above; require Supabase's
  // signed MFA assurance claim for every privileged admin request.
  let aal = 'aal1';
  try {
    const payload = token.split('.')[1];
    aal = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).aal || 'aal1';
  } catch { /* invalid tokens are already rejected by getUser */ }
  if (aal !== 'aal2') {
    return { user: null, response: NextResponse.json({ error: 'Complete authenticator verification to continue.' }, { status: 403 }) };
  }

  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (profileError) {
    console.error('Could not verify admin profile:', profileError.message);
    return { user: null, response: NextResponse.json({ error: 'Could not verify administrator access.' }, { status: 500 }) };
  }
  if (profile?.role !== 'admin') {
    return { user: null, response: NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 }) };
  }

  return { user: auth.user, response: null };
}
