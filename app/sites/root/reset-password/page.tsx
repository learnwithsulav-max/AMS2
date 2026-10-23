'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Shell } from '@/components/Shell';
import { Btn, Card } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { siteUrl } from '@/lib/brand';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Checking your recovery link...');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.session) setMessage('This recovery link is invalid or expired. Request a new password recovery email.');
      else {
        setMessage('');
        setReady(true);
      }
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirmation = String(form.get('confirmation') || '');
    if (password.length < 8) return setMessage('Use a password with at least 8 characters.');
    if (password !== confirmation) return setMessage('The passwords do not match.');

    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setDone(true);
      setReady(false);
    }
  }

  return (
    <Shell site="root">
      <div className="mx-auto max-w-lg px-4 py-12">
        <Card className="p-6">
          <h1 className="text-2xl font-extrabold">Set a new password</h1>
          {done ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-emerald-700">Your password has been updated.</p>
              <a className="inline-flex rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white" href={siteUrl('admin')}>
                Continue to Admin Portal
              </a>
            </div>
          ) : ready ? (
            <form onSubmit={submit} className="mt-5 grid gap-4">
              <label className="grid gap-1 text-sm font-medium">
                New password
                <input name="password" type="password" autoComplete="new-password" minLength={8} required className="rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Confirm new password
                <input name="confirmation" type="password" autoComplete="new-password" minLength={8} required className="rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
              <Btn type="submit" disabled={busy}>{busy ? 'Saving...' : 'Update password'}</Btn>
            </form>
          ) : (
            <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>
          )}
        </Card>
      </div>
    </Shell>
  );
}
