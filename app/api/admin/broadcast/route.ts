import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { user, response } = await requireAdmin(request);
  if (response) return response;
  const body = await request.json().catch(() => null);
  const audience = body?.audience;
  const subject = typeof body?.subject === 'string' ? body.subject.trim().slice(0, 120) : '';
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 3000) : '';
  if (!['all_registered', 'agents'].includes(audience) || subject.length < 3 || message.length < 5) return NextResponse.json({ error: 'Choose an audience and enter a subject and message.' }, { status: 400 });

  let recipients: string[] = [];
  if (audience === 'agents') {
    const { data, error } = await admin.from('profiles').select('email').eq('role', 'agent').not('email', 'is', null).limit(10000);
    if (error) return NextResponse.json({ error: 'Could not load the agent audience.' }, { status: 500 });
    recipients = (data || []).map(row => row.email).filter((email): email is string => typeof email === 'string' && email.includes('@'));
  } else {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return NextResponse.json({ error: 'Could not load the registered user audience.' }, { status: 500 });
      const users = data.users as any[];
      recipients.push(...users.filter(row => row.id !== user.id && !!row.email).map(row => row.email as string));
      if (users.length < 1000) break;
    }
  }
  recipients = [...new Set(recipients.map(value => value.trim().toLowerCase()).filter(value => value.length <= 320))].slice(0, 20000);
  if (!recipients.length) return NextResponse.json({ error: 'No email addresses are available for this audience.' }, { status: 400 });

  const campaignId = randomUUID();
  for (let i = 0; i < recipients.length; i += 500) {
    const batch = recipients.slice(i, i + 500).map(recipient => ({
      dedupe_key: `admin-broadcast:${campaignId}:${createHash('sha256').update(recipient).digest('hex').slice(0, 24)}`,
      channel: 'email', recipient, subject, message,
    }));
    const { error } = await admin.from('notification_outbox').insert(batch);
    if (error) {
      await admin.from('activity_log').insert({ actor: user.email || user.id, actor_id: user.id, action: 'admin_broadcast_queue_failed', meta: { campaign_id: campaignId, audience, queued_before_failure: Math.min(i, recipients.length), ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null, user_agent: request.headers.get('user-agent')?.slice(0, 500) || null } });
      return NextResponse.json({ error: 'Announcement was only partially queued. Check the notification queue before retrying.' }, { status: 500 });
    }
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
  const { error: auditError } = await admin.from('activity_log').insert({ actor: user.email || user.id, actor_id: user.id, action: 'admin_broadcast_queued', meta: { campaign_id: campaignId, audience, recipient_count: recipients.length, subject, ip, user_agent: request.headers.get('user-agent')?.slice(0, 500) || null } });
  if (auditError) return NextResponse.json({ error: 'Announcement queued, but its audit record could not be written.' }, { status: 500 });
  return NextResponse.json({ queued: recipients.length, campaignId });
}
