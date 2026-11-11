import 'server-only';
import { admin } from '@/lib/supabase-admin';
import { AGENCY_PACKAGES, EXAM_PACKAGES } from '@/lib/packages';

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

  let email = profile.email;
  if (!email) {
    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
    if (authError) throw new Error(`Could not load registered email address: ${authError.message}`);
    email = authUser.user.email || null;
  }

  const jobs = [];
  if (email) {
    jobs.push(enqueueNotification({ dedupeKey, channel: 'email', recipient: email, subject, message }));
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

export async function enqueueBillingInvoiceNotification({
  userId,
  orderId,
  packageCode,
  amount,
  baseAmount = amount,
  status,
  expiresAt,
}: {
  userId: string;
  orderId: string;
  packageCode: string;
  baseAmount?: number;
  amount: number;
  status: 'unpaid' | 'under_review' | 'approved' | 'paid' | 'rejected';
  expiresAt?: string | null;
}) {
  const pkg = [...AGENCY_PACKAGES, ...EXAM_PACKAGES].find((item) => item.code === packageCode);
  const packageName = pkg?.name.en || (packageCode === 'exam_pass' ? 'Exam Practice Pass' : packageCode);
  const statusLabel = {
    unpaid: 'UNPAID',
    under_review: 'UNDER REVIEW',
    approved: 'APPROVED BY ADMIN',
    paid: 'PAID — PAYMENT PROVIDER VERIFIED',
    rejected: 'PAYMENT REJECTED',
  }[status];
  const statusNote = {
    unpaid: 'Complete payment using the method selected at checkout.',
    under_review: 'Your payment proof was received and is awaiting administrator review.',
    approved: expiresAt ? `Your payment was approved by an administrator. Access is active until ${expiresAt.slice(0, 10)}.` : 'Your payment was approved by an administrator.',
    paid: expiresAt ? `Your payment was confirmed by the payment provider. Access is active until ${expiresAt.slice(0, 10)}.` : 'Your payment was confirmed by the payment provider.',
    rejected: 'Your payment proof was not approved. Contact payment support before submitting another payment.',
  }[status];
  const message = [
    'Learn With Sulav — Payment invoice (not a VAT invoice)',
    `Invoice reference: ${orderId}`,
    `Package: ${packageName}`,
    `Package price: Rs ${baseAmount.toLocaleString('en-NP')} (NPR)`,
    ...(baseAmount > amount ? [`Discount: −Rs ${(baseAmount - amount).toLocaleString('en-NP')}`] : []),
    'VAT: Rs 0 — not charged (seller is PAN-registered, not VAT-registered)',
    `Total: Rs ${amount.toLocaleString('en-NP')} (NPR)`,
    `Status: ${statusLabel}`,
    statusNote,
  ].join('\n');

  await enqueueUserNotification({
    userId,
    dedupeKey: `billing-invoice:${orderId}:${status}`,
    subject: `Learn With Sulav invoice ${statusLabel.toLowerCase()} — ${orderId}`,
    message,
  });
}
