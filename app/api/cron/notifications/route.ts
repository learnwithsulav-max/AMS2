import { NextResponse } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { toInternationalPhone } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
const MAX_ATTEMPTS = 5;

type OutboxRow = {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  subject: string | null;
  message: string;
  purpose: 'general' | 'payment_confirmation';
  attempts: number;
};

function missingConfiguration(channel: OutboxRow['channel']) {
  if (channel === 'email') return !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL;
  if (channel === 'sms') return !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM;
  return !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_TEMPLATE_NAME;
}

async function sendEmail(row: OutboxRow) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: row.recipient,
      subject: row.subject || 'Learn With Sulav notification',
      text: row.message,
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}.`);
}

async function sendSms(row: OutboxRow) {
  if (row.purpose !== 'payment_confirmation') {
    throw new Error('SMS is restricted to OTP and payment confirmation.');
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const body = new URLSearchParams({
    To: toInternationalPhone(row.recipient),
    From: process.env.TWILIO_FROM!,
    Body: row.message,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!response.ok) throw new Error(`Twilio returned ${response.status}.`);
}

async function sendWhatsApp(row: OutboxRow) {
  const version = process.env.WHATSAPP_API_VERSION || 'v23.0';
  const response = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toInternationalPhone(row.recipient).replace('+', ''),
      type: 'template',
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' },
        components: [{
          type: 'body',
          parameters: [{ type: 'text', text: row.message.slice(0, 1024) }],
        }],
      },
    }),
  });
  if (!response.ok) throw new Error(`WhatsApp Cloud API returned ${response.status}.`);
}

async function deliver(row: OutboxRow) {
  if (row.channel === 'email') return sendEmail(row);
  if (row.channel === 'sms') return sendSms(row);
  return sendWhatsApp(row);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      configurationRequired: [
        'CRON_SECRET', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN', 'TWILIO_FROM', 'WHATSAPP_ACCESS_TOKEN',
        'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_TEMPLATE_NAME',
      ],
    });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expiredLease = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { error: recoveryError } = await admin
    .from('notification_outbox')
    .update({ status: 'failed', locked_at: null, last_error: 'Delivery worker lease expired.' })
    .eq('status', 'processing')
    .lt('locked_at', expiredLease);
  if (recoveryError) return NextResponse.json({ error: 'Could not recover interrupted notifications.' }, { status: 500 });

  const { data: rows, error } = await admin
    .from('notification_outbox')
    .select('id,channel,recipient,subject,message,purpose,attempts')
    .in('status', ['pending', 'failed'])
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(40);
  if (error) return NextResponse.json({ error: 'Could not load notification queue.' }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows || []) {
    const item = row as OutboxRow;
    if (missingConfiguration(item.channel)) {
      skipped++;
      continue;
    }
    const { data: claimed, error: claimError } = await admin
      .from('notification_outbox')
      .update({ status: 'processing', locked_at: new Date().toISOString() })
      .eq('id', item.id)
      .in('status', ['pending', 'failed'])
      .select('id')
      .maybeSingle();
    if (claimError) {
      console.error('Could not claim notification:', claimError.message);
      failed++;
      continue;
    }
    if (!claimed) continue;

    try {
      await deliver(item);
      const { error: updateError } = await admin.from('notification_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), attempts: item.attempts + 1, last_error: null, locked_at: null })
        .eq('id', item.id)
        .eq('status', 'processing');
      if (updateError) throw new Error(`Message sent but queue update failed: ${updateError.message}`);
      sent++;
    } catch (deliveryError) {
      const message = deliveryError instanceof Error ? deliveryError.message.slice(0, 300) : 'Delivery failed.';
      const { error: updateError } = await admin.from('notification_outbox')
        .update({ status: 'failed', attempts: item.attempts + 1, last_error: message, locked_at: null })
        .eq('id', item.id)
        .eq('status', 'processing');
      if (updateError) console.error('Notification delivery failed and status update failed:', updateError.message);
      failed++;
    }
  }
  return NextResponse.json({ processed: rows?.length || 0, sent, skipped, failed });
}
