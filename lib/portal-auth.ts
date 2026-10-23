import 'server-only';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';

export async function requirePortalUser(request: Request, mfa = true) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return { user: null, response: NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }) };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { user: null, response: NextResponse.json({ error: 'Your session expired. Sign in again.' }, { status: 401 }) };
  if (mfa) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      if (payload.aal !== 'aal2') return { user: null, response: NextResponse.json({ error: 'Complete authenticator verification first.' }, { status: 403 }) };
    } catch { return { user: null, response: NextResponse.json({ error: 'Your session is invalid.' }, { status: 401 }) }; }
  }
  return { user: data.user, response: null };
}
