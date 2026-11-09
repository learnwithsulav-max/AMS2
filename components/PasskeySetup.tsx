'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Btn, Card } from './ui';

export function PasskeySetup() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function addPasskey() {
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      if (!window.isSecureContext || !window.PublicKeyCredential) {
        throw new Error('Passkeys require a supported browser and a secure HTTPS connection.');
      }
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      setMessage('Passkey added to this account.');
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Could not add a passkey.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6 grid gap-3 p-5">
      <h2 className="font-bold">Passkey sign-in</h2>
      <p className="text-sm text-slate-600">Add a passkey after signing in. Your device or password manager will protect it.</p>
      <Btn type="button" variant="ghost" disabled={busy} onClick={() => void addPasskey()}>
        {busy ? 'Setting up…' : 'Add a passkey'}
      </Btn>
      {message && <p className={`text-sm ${isError ? 'text-red-700' : 'text-emerald-700'}`} role={isError ? 'alert' : 'status'}>{message}</p>}
    </Card>
  );
}
