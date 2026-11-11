'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/brand';
import { Btn } from './ui';

type Portal = 'agency' | 'exam';
type Provider = 'google' | 'facebook' | 'custom:tiktok' | 'custom:instagram';

const providers: { id: Provider; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'custom:tiktok', label: 'TikTok' },
  { id: 'custom:instagram', label: 'Instagram' },
];

const callbackErrors: Record<string, string> = {
  provider_failed: 'Sign-in was cancelled or the provider could not complete it. Please try again.',
  wrong_portal: 'This account belongs to a different portal. Use the matching portal account.',
  profile_unavailable: 'We could not prepare your account. Please try again or contact support.',
};

export function AuthMethods({ portal }: { portal: Portal }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function signIn(provider: Provider) {
    setBusy(true);
    setMessage('');
    try {
      const callback = new URL('/api/auth/callback', window.location.origin);
      callback.searchParams.set('portal', portal);
      if (portal === 'exam') callback.searchParams.set('signup', 'true');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback.toString() },
      });
      if (error) setMessage(error.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start sign-in.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithPasskey() {
    setBusy(true);
    setMessage('');
    try {
      if (!window.isSecureContext || !window.PublicKeyCredential) {
        throw new Error('Passkeys require a supported browser and a secure HTTPS connection.');
      }
      const { error } = await supabase.auth.signInWithPasskey();
      if (error) setMessage(error.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Passkey sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold text-slate-700">Continue with</p>
      {providers.map(({ id, label }) => (
        <Btn key={id} type="button" variant="ghost" disabled={busy} onClick={() => void signIn(id)}>
          {busy ? 'Please wait…' : `Continue with ${label}`}
        </Btn>
      ))}
      <Btn type="button" variant="ghost" disabled={busy} onClick={() => void signInWithPasskey()}>
        Sign in with a passkey
      </Btn>
      {message && <p className="text-sm font-medium text-red-700" role="alert">{message}</p>}
      <p className="text-xs leading-relaxed text-slate-500">
        Sign-in trouble? <a className="font-semibold underline" href={`mailto:${BRAND.contact.emails.support}`}>Contact support</a>.
      </p>
    </div>
  );
}

export function AuthCallbackMessage() {
  const [message] = useState(() => {
    if (typeof window === 'undefined') return '';
    const code = new URLSearchParams(window.location.search).get('auth_error');
    return code ? callbackErrors[code] || callbackErrors.provider_failed : '';
  });
  if (!message) return null;
  return (
    <div className="grid gap-1">
      <p className="text-sm font-medium text-red-700" role="alert">{message}</p>
      <p className="text-xs text-slate-500">
        Need help? <a className="font-semibold underline" href={`mailto:${BRAND.contact.emails.support}`}>Contact support</a>.
      </p>
    </div>
  );
}
