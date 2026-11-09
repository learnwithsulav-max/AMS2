'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Btn, Field } from './ui';

type PhoneOtpFormProps = {
  portal: 'agency' | 'exam';
  name?: string;
};

function normalizeNepalPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('977') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits;
  return /^9\d{9}$/.test(local) ? `+977${local}` : '';
}

export function PhoneOtpForm({ portal, name = '' }: PhoneOtpFormProps) {
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      const normalizedPhone = normalizeNepalPhone(phone);
      if (!normalizedPhone) throw new Error('Enter a valid 10-digit Nepali mobile number.');

      if (!sentTo) {
        const { error } = await supabase.auth.signInWithOtp({
          phone: normalizedPhone,
          options: {
            channel,
            data: { name, portal_type: portal === 'exam' ? 'exam_candidate' : 'agent' },
          },
        });
        if (error) throw error;
        setSentTo(normalizedPhone);
        setMessage(`A verification code was requested for ${normalizedPhone} by ${channel === 'sms' ? 'SMS' : 'WhatsApp'}.`);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: sentTo,
        token: code,
        type: 'sms',
      });
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Phone verification succeeded, but no signed-in user was returned.');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('portal_type')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      const expectedPortal = portal === 'exam' ? 'exam_candidate' : 'agent';
      if (!profile || profile.portal_type !== expectedPortal) {
        await supabase.auth.signOut();
        throw new Error('This phone account belongs to a different portal. Use the matching portal account.');
      }
      setMessage('Phone verified. You are signed in.');
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Could not complete phone sign-in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {!sentTo && (
        <>
          <Field
            label="Nepali mobile number"
            type="tel"
            required
            autoComplete="tel"
            placeholder="9857053594"
            value={phone}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)}
          />
          <label className="grid gap-1 text-sm font-medium">
            Send code by
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              value={channel}
              onChange={(event) => setChannel(event.target.value as 'sms' | 'whatsapp')}
            >
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
        </>
      )}
      {sentTo && (
        <Field
          label="6-digit verification code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
      )}
      {message && <p className={`text-sm ${isError ? 'text-red-700' : 'text-slate-700'}`} role={isError ? 'alert' : 'status'}>{message}</p>}
      <Btn type="submit" disabled={busy}>{busy ? 'Please wait…' : sentTo ? 'Verify and sign in' : 'Send verification code'}</Btn>
      {sentTo && (
        <button type="button" className="text-sm font-semibold text-[#0A4F8A] underline" onClick={() => { setSentTo(''); setCode(''); setMessage(''); }}>
          Change phone number or delivery method
        </button>
      )}
    </form>
  );
}
