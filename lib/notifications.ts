import 'server-only';
import { admin } from '@/lib/supabase-admin';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';

export function toInternationalPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('977')) return `+${digits}`;
  if (digits.startsWith('0')) return `+977${digits.slice(1)}`;
  return `+977${digits}`;
}

export async function enqueueNotification({
  dedupeKey,
  channel,
  recipient,
  subject = null,
  message,
  purpose = 'general',
}: {
  dedupeKey: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string | null;
  message: string;
  purpose?: 'general' | 'payment_confirmation';
}) {
  const address = channel === 'email' ? recipient.trim().toLowerCase() : toInternationalPhone(recipient);
  if (!address) return;
  const { error } = await admin.from('notification_outbox').upsert(
    { dedupe_key: dedupeKey, channel, recipient: address, subject, message, purpose },
    { onConflict: 'dedupe_key,channel,recipient', ignoreDuplicates: true },
  );
  if (error) throw new Error(`Could not enqueue ${channel} notification: ${error.message}`);
}

export async function enqueueUserNotification({
  userId,
  dedupeKey,
  subject,
  message,
  includeSms = false,
  purpose = 'general',
}: {
  userId: string;
  dedupeKey: string;
  subject: string;
  message: string;
  includeSms?: boolean;
  purpose?: 'general' | 'payment_confirmation';
}) {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('email,phone,whatsapp_opt_in')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load notification recipient: ${error.message}`);
  if (!profile) throw new Error('Notification recipient profile was not found.');

  const jobs = [];
  if (profile.email) {
    jobs.push(enqueueNotification({ dedupeKey, channel: 'email', recipient: profile.email, subject, message }));
  }
  if (profile.phone) {
    if (profile.whatsapp_opt_in) {
      jobs.push(enqueueNotification({ dedupeKey, channel: 'whatsapp', recipient: profile.phone, subject, message }));
    }
    if (includeSms) {
      jobs.push(enqueueNotification({
        dedupeKey,
        channel: 'sms',
        recipient: profile.phone,
        message,
        purpose,
      }));
    }
  }
  await Promise.all(jobs);
}
