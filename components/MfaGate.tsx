'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Btn, Card, Field } from './ui';

type Factor = { id: string; friendly_name?: string };

export function MfaGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [factor, setFactor] = useState<Factor | null>(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const start = useCallback(async () => {
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) { setMessage(aalError.message); return; }
    if (aal.currentLevel === 'aal2') { setReady(true); return; }
    const { data: list, error } = await supabase.auth.mfa.listFactors();
    if (error) { setMessage(error.message); return; }
    const verified = list.totp.find((item) => item.status === 'verified');
    if (verified) { setFactor(verified); return; }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Learn With Sulav authenticator' });
    if (enrollError) { setMessage(enrollError.message); return; }
    setFactor({ id: data.id, friendly_name: data.friendly_name });
    setQr(data.totp.qr_code);
  }, []);

  useEffect(() => { start(); }, [start]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!factor || !/^\d{6}$/.test(code)) { setMessage('Enter the six digit code from your authenticator app.'); return; }
    setBusy(true); setMessage('');
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) { setMessage(challengeError.message); setBusy(false); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
    if (error) setMessage(error.message);
    else { setQr(''); setReady(true); }
    setBusy(false);
  }

  if (ready) return <>{children}</>;
  return <div className="mx-auto max-w-lg px-4 py-12"><Card className="grid gap-4 p-6">
    <h1 className="text-xl font-bold">Secure your account</h1>
    <p className="text-sm text-slate-600">Authenticator app verification is required to use Learn With Sulav portals.</p>
    {qr && <div className="grid justify-items-center gap-2"><img alt="Authenticator setup QR code" className="h-48 w-48" src={qr.startsWith('data:') ? qr : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`} /><p className="text-xs text-slate-500">Scan the QR code with an authenticator app, then enter its six digit code.</p></div>}
    {!qr && <p className="text-sm text-slate-600">Enter the code from your enrolled authenticator app.</p>}
    <form onSubmit={verify} className="grid gap-3"><Field label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}<Btn type="submit" disabled={busy}>{busy ? 'Verifying…' : qr ? 'Enable two factor authentication' : 'Verify and continue'}</Btn></form>
  </Card></div>;
}
