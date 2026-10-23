import 'server-only';
import { createHmac } from 'node:crypto';
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

  const sessionId = (() => {
    try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).session_id as string; }
    catch { return ''; }
  })();
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return { user: null, response: NextResponse.json({ error: 'This admin session is incomplete. Sign in again.' }, { status: 401 }) };
  }
  const { data: sessionAccepted, error: sessionError } = await admin.rpc('claim_admin_session', { p_user_id: auth.user.id, p_session_id: sessionId });
  if (sessionError) {
    console.error('Could not validate the active admin session:', sessionError.message);
    return { user: null, response: NextResponse.json({ error: 'Admin session protection is temporarily unavailable.' }, { status: 503 }) };
  }
  if (sessionAccepted !== true) {
    return { user: null, response: NextResponse.json({ error: 'Another admin session is active. Try again after that session signs out or expires.' }, { status: 409 }) };
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const keyHash = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'lws-admin-rate-limit')
    .update(ip).digest('hex');
  const { data: withinLimit, error: rateError } = await admin.rpc('check_admin_rate_limit', {
    p_key_hash: keyHash, p_limit: 120, p_window_seconds: 60,
  });
  if (rateError) {
    console.error('Could not check admin route rate limit:', rateError.message);
    return { user: null, response: NextResponse.json({ error: 'Admin request protection is temporarily unavailable.' }, { status: 503 }) };
  }
  if (withinLimit !== true) {
    return { user: null, response: NextResponse.json({ error: 'Too many admin requests. Wait a minute and try again.' }, { status: 429 }) };
  }

  return { user: auth.user, response: null };
}
