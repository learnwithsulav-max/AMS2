'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/lib/auth';
import { Btn, Card, Field } from './ui';

export function AuthCard({ title, allowRegister = true }: { title: string; allowRegister?: boolean }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [f, setF] = useState<any>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit(e: any) {
    e.preventDefault();
    setBusy(true); setMsg('');
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) setMsg(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
        options: { data: { name: f.name, phone: f.phone, license_no: f.license_no, upline_code: f.upline_code, address: f.address, branch: f.branch } },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg('Account created. Confirm your email, then log in.');
      else if (photo && data.user) { try { await uploadAvatar(data.user.id, photo); } catch { setMsg('Account created, but the photo upload failed. Add it from your profile.'); } }
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Card className="p-6">
        <h1 className="mb-1 text-2xl font-extrabold">{title}</h1>
        <p className="mb-5 text-sm text-slate-600">{mode === 'login' ? 'Log in to continue.' : 'Create your agent profile.'}</p>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {mode === 'register' && (<>
            <Field label="Full name" required value={f.name || ''} onChange={set('name')} />
            <Field label="Phone" required value={f.phone || ''} onChange={set('phone')} />
            <Field label="License number" value={f.license_no || ''} onChange={set('license_no')} />
            <Field label="Upline referral code" placeholder="e.g. LWS1A2B3C" value={f.upline_code || ''} onChange={set('upline_code')} />
            <Field label="Address" value={f.address || ''} onChange={set('address')} />
            <Field label="Branch" value={f.branch || ''} onChange={set('branch')} />
            <Field label="Photo" type="file" accept="image/*" className="sm:col-span-2" onChange={(e: any) => setPhoto(e.target.files?.[0] || null)} />
          </>)}
          <Field label="Email" type="email" required className="sm:col-span-2" value={f.email || ''} onChange={set('email')} />
          <Field label="Password" type="password" required minLength={6} className="sm:col-span-2" value={f.password || ''} onChange={set('password')} />
          {msg && <p className="text-sm text-red-600 sm:col-span-2" role="alert">{msg}</p>}
          <Btn type="submit" disabled={busy} className="sm:col-span-2">{mode === 'login' ? 'Log in' : 'Create account'}</Btn>
        </form>
        {allowRegister && (
          <button className="mt-4 text-sm font-semibold text-brand" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(''); }}>
            {mode === 'login' ? 'New agent? Register' : 'Already registered? Log in'}
          </button>
        )}
      </Card>
    </div>
  );
}
