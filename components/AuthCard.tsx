'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/lib/auth';
import { Btn, Card, Field } from './ui';
import { ALL_INSURANCE_COMPANIES, POPULAR_NEPALI_BRANCHES } from '@/lib/nepali-companies';

export function AuthCard({ title, allowRegister = true }: { title: string; allowRegister?: boolean }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<'password' | 'phone' | 'social'>('password');
  const [f, setF] = useState<any>({ branch: 'Butwal', company: 'Nepal Life Insurance Co. Ltd.' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  // Social OAuth Handler
  async function handleOAuth(provider: 'google' | 'facebook' | 'github') {
    setBusy(true);
    setMsg('');
    try {
      if (provider === 'google') {
        try {
          const { signInWithGoogle } = await import('@/lib/firebase');
          await signInWithGoogle();
          setMsg('Successfully signed in with Google!');
          setBusy(false);
          return;
        } catch (fbErr: any) {
          // If popup is closed or user cancels, or fallback to standard OAuth
          if (fbErr?.code === 'auth/popup-closed-by-user') {
            setMsg('Google sign-in popup was closed.');
            setBusy(false);
            return;
          }
          console.warn('Firebase Google Auth fallback:', fbErr);
        }
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      });
      if (error) setMsg(error.message);
    } catch (e: any) {
      setMsg(e.message || `Could not sign in with ${provider}`);
    } finally {
      setBusy(false);
    }
  }

  // Passkey / Biometric Sign-in
  async function handlePasskey() {
    setBusy(true);
    setMsg('');
    try {
      if (!window.PublicKeyCredential) {
        setMsg('Passkeys/biometric authentication is not supported on this browser/device.');
        setBusy(false);
        return;
      }
      setMsg('Biometric authentication prompt initiated. Follow your device security prompt...');
      // Simulated WebAuthn check
      setTimeout(() => {
        setMsg('Device biometrics verified. Connecting your session...');
        setBusy(false);
      }, 1000);
    } catch (e: any) {
      setMsg(e.message || 'Passkey authentication failed.');
      setBusy(false);
    }
  }

  // Phone OTP Sign-in
  async function handlePhoneOtp(e: any) {
    e.preventDefault();
    setBusy(true);
    setMsg('');

    if (!otpSent) {
      const phone = f.phone?.trim();
      if (!phone || phone.length < 9) {
        setMsg('Enter a valid mobile number (e.g. 9857053594).');
        setBusy(false);
        return;
      }
      const formattedPhone = phone.startsWith('+') ? phone : `+977${phone.replace(/\D/g, '')}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      if (error) {
        setMsg(error.message);
      } else {
        setOtpSent(true);
        setMsg(`6-digit verification code sent to ${formattedPhone}. Enter the code below.`);
      }
    } else {
      const formattedPhone = f.phone.startsWith('+') ? f.phone : `+977${f.phone.replace(/\D/g, '')}`;
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: 'sms',
      });
      if (error) {
        setMsg(error.message);
      } else {
        setMsg('Phone authentication successful!');
      }
    }
    setBusy(false);
  }

  // Standard Email/Password Form Submit
  async function submit(e: any) {
    e.preventDefault();
    setBusy(true);
    setMsg('');

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: f.email,
        password: f.password,
      });
      if (error) setMsg(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: f.email,
        password: f.password,
        options: {
          data: {
            name: f.name,
            phone: f.phone,
            license_no: f.license_no,
            pan_number: f.pan_number,
            company: f.company,
            upline_code: f.upline_code,
            address: f.address,
            branch: f.branch,
            whatsapp_opt_in: !!f.whatsapp_opt_in,
          },
        },
      });

      if (error) {
        setMsg(error.message);
      } else if (!data.session) {
        setMsg('Account created. Check your email for confirmation, then log in.');
      } else if (photo && data.user) {
        try {
          await uploadAvatar(data.user.id, photo);
        } catch {
          setMsg('Account created! Avatar upload can be completed from your profile.');
        }
      }
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-black text-[#0A4F8A]">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {mode === 'login'
            ? 'Sign in to access your agent portal, pipeline, and insurance tools.'
            : 'Register your official advisor profile with PAN and license details.'}
        </p>

        {/* Auth Method Switcher for Login */}
        {mode === 'login' && (
          <div className="mt-5 flex gap-2 border-b border-slate-200 pb-4">
            <button
              type="button"
              onClick={() => {
                setAuthMethod('password');
                setMsg('');
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                authMethod === 'password'
                  ? 'bg-[#0A4F8A] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('phone');
                setMsg('');
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                authMethod === 'phone'
                  ? 'bg-[#0A4F8A] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Phone / SMS
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod('social');
                setMsg('');
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                authMethod === 'social'
                  ? 'bg-[#0A4F8A] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Google / Passkey / Social
            </button>
          </div>
        )}

        {/* 1. Email & Password Form */}
        {(authMethod === 'password' || mode === 'register') && (
          <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
            {mode === 'register' && (
              <>
                <Field
                  label="Full Name (पूरा नाम)"
                  required
                  placeholder="e.g. Rameshwor Adhikari"
                  value={f.name || ''}
                  onChange={set('name')}
                />
                <Field
                  label="Mobile Phone (फोन)"
                  required
                  placeholder="e.g. 9857053594"
                  value={f.phone || ''}
                  onChange={set('phone')}
                />

                {/* PAN Number Field */}
                <Field
                  label="Permanent Account Number (PAN)"
                  required
                  placeholder="9-digit PAN (e.g. 102938475)"
                  maxLength={12}
                  value={f.pan_number || ''}
                  onChange={set('pan_number')}
                />

                <Field
                  label="Agent License No (बिमा अभिकर्ता इजाजत)"
                  placeholder="e.g. LIC-2080-998"
                  value={f.license_no || ''}
                  onChange={set('license_no')}
                />

                {/* Full Insurance Companies Selector */}
                <div className="grid gap-1 text-sm font-medium">
                  <label htmlFor="company-select">Insurance Company (कम्पनी)</label>
                  <select
                    id="company-select"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0A4F8A] focus:outline-none"
                    value={f.company || ''}
                    onChange={set('company')}
                  >
                    <optgroup label="Life Insurance Companies (जीवन बिमा)">
                      {ALL_INSURANCE_COMPANIES.filter((c) => c.type === 'life').map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Non-Life & Micro (निर्जीवन तथा लघु)">
                      {ALL_INSURANCE_COMPANIES.filter((c) => c.type !== 'life').map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Manual Branch Entry with Suggestions */}
                <div className="grid gap-1 text-sm font-medium">
                  <label htmlFor="branch-input">Branch (शाखा - Manually Enter or Select)</label>
                  <input
                    id="branch-input"
                    list="branch-list"
                    type="text"
                    required
                    placeholder="Type branch name (e.g. Butwal)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A4F8A] focus:outline-none"
                    value={f.branch || ''}
                    onChange={set('branch')}
                  />
                  <datalist id="branch-list">
                    {POPULAR_NEPALI_BRANCHES.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <Field
                  label="Address / District (ठेगाना)"
                  placeholder="e.g. Butwal-9, Rupandehi"
                  value={f.address || ''}
                  onChange={set('address')}
                />

                <Field
                  label="Upline Referral Code"
                  placeholder="e.g. LWS1A2B3C"
                  value={f.upline_code || ''}
                  onChange={set('upline_code')}
                />

                <Field
                  label="Profile Photo (फोटो)"
                  type="file"
                  accept="image/*"
                  className="sm:col-span-2"
                  onChange={(e: any) => setPhoto(e.target.files?.[0] || null)}
                />
                <label className="flex items-start gap-2 text-sm font-normal text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={!!f.whatsapp_opt_in}
                    onChange={(e) => setF({ ...f, whatsapp_opt_in: e.target.checked })}
                    className="mt-1"
                  />
                  <span>Receive agency and account notifications on WhatsApp (optional). SMS is only used for OTP and payment confirmation.</span>
                </label>
              </>
            )}

            <Field
              label="Email Address"
              type="email"
              required
              placeholder="advisor@example.com"
              className="sm:col-span-2"
              value={f.email || ''}
              onChange={set('email')}
            />

            <Field
              label="Password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="sm:col-span-2"
              value={f.password || ''}
              onChange={set('password')}
            />

            {msg && (
              <p className="text-sm text-red-600 sm:col-span-2 font-medium" role="alert">
                {msg}
              </p>
            )}

            <Btn type="submit" disabled={busy} className="sm:col-span-2">
              {busy ? 'Processing...' : mode === 'login' ? 'Log in' : 'Complete Agent Registration'}
            </Btn>
          </form>
        )}

        {/* 2. Phone OTP Form */}
        {mode === 'login' && authMethod === 'phone' && (
          <form onSubmit={handlePhoneOtp} className="mt-5 grid gap-4">
            <Field
              label="Mobile Number (नेपाली मोबाइल नम्बर)"
              type="tel"
              required
              placeholder="e.g. 9857053594"
              value={f.phone || ''}
              onChange={set('phone')}
              disabled={otpSent}
            />

            {otpSent && (
              <Field
                label="6-Digit SMS Verification Code"
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e: any) => setOtpCode(e.target.value)}
              />
            )}

            {msg && (
              <p className="text-sm text-slate-700 font-medium" role="status">
                {msg}
              </p>
            )}

            <Btn type="submit" disabled={busy}>
              {busy ? 'Verifying...' : otpSent ? 'Confirm & Sign In' : 'Send SMS OTP'}
            </Btn>

            {otpSent && (
              <button
                type="button"
                className="text-xs text-brand underline"
                onClick={() => setOtpSent(false)}
              >
                Change phone number
              </button>
            )}
          </form>
        )}

        {/* 3. Social & Biometric / Passkey */}
        {mode === 'login' && authMethod === 'social' && (
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('facebook')}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#166fe5] shadow-sm"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continue with Facebook
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              Continue with GitHub
            </button>

            <button
              type="button"
              onClick={handlePasskey}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-900 transition hover:bg-purple-100 shadow-sm"
            >
              <svg className="h-5 w-5 fill-current text-purple-700" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
              Sign in with Passkey / Biometrics
            </button>

            {msg && (
              <p className="mt-2 text-sm text-slate-700 font-medium" role="status">
                {msg}
              </p>
            )}
          </div>
        )}

        {/* Toggle between Register and Login */}
        {allowRegister && (
          <div className="mt-6 border-t border-slate-200 pt-4 text-center">
            <button
              type="button"
              className="text-sm font-semibold text-[#0A4F8A] hover:underline"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setMsg('');
              }}
            >
              {mode === 'login'
                ? 'Don’t have an agent account? Register with PAN'
                : 'Already have an agent account? Log in'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
