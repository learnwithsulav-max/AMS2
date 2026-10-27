'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Btn, Card, Field } from '../ui';

export function ExamAccount() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', whatsappOptIn: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const set = (key: Exclude<keyof typeof form, 'whatsappOptIn'>) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setIsError(false);

    const result = mode === 'register'
      ? await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              name: form.name.trim(),
              phone: form.phone.trim(),
              portal_type: 'exam_candidate',
              whatsapp_opt_in: form.whatsappOptIn,
            },
          },
        })
      : await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      setIsError(true);
      return;
    }

    if (mode === 'register' && !result.data.session) {
      setMessage('Registration received. Verify your email, then log in to complete payment and access the exam.');
      return;
    }
    setMessage(mode === 'register' ? 'Exam account created.' : 'Signed in.');
  }

  return (
    <Card className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-extrabold text-[#0A4F8A]">
        {mode === 'register' ? 'Register for the exam' : 'Candidate login'}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Create a candidate account, submit payment, and sign in to start an exam. Agent accounts cannot start exams.
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        {mode === 'register' && (
          <>
            <Field label="Full name" required maxLength={100} value={form.name} onChange={set('name')} />
            <Field label="Mobile / WhatsApp number" required type="tel" maxLength={20} value={form.phone} onChange={set('phone')} />
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.whatsappOptIn}
                onChange={(event) => setForm((current) => ({ ...current, whatsappOptIn: event.target.checked }))}
                className="mt-1"
              />
              <span>I agree to receive exam results and account notifications on WhatsApp. Email will also be used; SMS is only for OTP and payment confirmation.</span>
            </label>
          </>
        )}
        <Field label="Email address" type="email" required value={form.email} onChange={set('email')} />
        <Field label="Password" type="password" required minLength={8} value={form.password} onChange={set('password')} />
        {message && <p role={isError ? 'alert' : 'status'} className={`text-sm ${isError ? 'text-red-700' : 'text-slate-700'}`}>{message}</p>}
        <Btn type="submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'register' ? 'Create candidate account' : 'Log in'}</Btn>
      </form>
      <button
        type="button"
        className="mt-4 text-sm font-semibold text-[#0A4F8A] underline"
        onClick={() => {
          setMode(mode === 'register' ? 'login' : 'register');
          setMessage('');
        }}
      >
        {mode === 'register' ? 'Already registered? Log in' : 'Need a candidate account? Register'}
      </button>
    </Card>
  );
}
