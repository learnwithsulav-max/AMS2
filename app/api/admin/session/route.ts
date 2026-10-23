import { NextResponse } from 'next/server';
import { getAdminRequestIp, requireAdmin } from '@/lib/admin-auth';
import { admin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  const { user, response } = await requireAdmin(request);
  if (response) return response;
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1] || '';
  const sessionId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).session_id as string;
  const { error } = await admin.rpc('release_admin_session', { p_user_id: user.id, p_session_id: sessionId });
  if (error) {
    console.error('Could not release admin session:', error.message);
    return NextResponse.json({ error: 'Could not safely release the admin session.' }, { status: 503 });
  }
  const { error: auditError } = await admin.from('activity_log').insert({ actor: user.email || user.id, actor_id: user.id, action: 'admin_session_released', meta: { ip: getAdminRequestIp(request), user_agent: request.headers.get('user-agent')?.slice(0, 500) || null } });
  if (auditError) console.error('Admin session released, but its audit row could not be written:', auditError.message);
  return NextResponse.json({ ok: true });
}
