'use client';

import { FormEvent, useState } from 'react';
import { Btn, cx } from './ui';

type FormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = { name: '', email: '', subject: '', message: '' };

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim() || values.name.trim().length < 2) errors.name = 'Please enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (!values.subject.trim()) errors.subject = 'Please add a subject.';
  if (!values.message.trim() || values.message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';
  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (status !== 'idle') setStatus('idle');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    window.setTimeout(() => {
      setStatus('success');
      setValues(initialValues);
    }, 900);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-slate-200 bg-white p-5 text-ink shadow-xl sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <FloatingField id="contact-name" label="Full name" value={values.name} error={errors.name} onChange={(value) => update('name', value)} autoComplete="name" />
        <FloatingField id="contact-email" label="Email address" type="email" value={values.email} error={errors.email} onChange={(value) => update('email', value)} autoComplete="email" />
        <FloatingField id="contact-subject" label="Subject" value={values.subject} error={errors.subject} onChange={(value) => update('subject', value)} className="sm:col-span-2" />
        <FloatingField id="contact-message" label="Your message" value={values.message} error={errors.message} onChange={(value) => update('message', value)} multiline className="sm:col-span-2" />
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="text-sm" role="status">
          {status === 'success' && <p className="font-semibold text-emerald-700">Thanks — your message has been sent.</p>}
          {status === 'error' && Object.keys(errors).length === 0 && <p className="font-semibold text-red-700">Something went wrong. Please try again.</p>}
        </div>
        <Btn type="submit" disabled={status === 'loading'} className="min-w-36">
          {status === 'loading' ? 'Sending…' : 'Send message'}
        </Btn>
      </div>
    </form>
  );
}

function FloatingField({ id, label, value, error, onChange, type = 'text', multiline = false, className, autoComplete }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void; type?: string; multiline?: boolean; className?: string; autoComplete?: string }) {
  const controlClass = cx('peer w-full rounded-xl border bg-white px-4 pb-2.5 pt-6 text-sm text-ink outline-none transition placeholder:text-transparent focus:ring-4', error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : 'border-slate-300 focus:border-navy focus:ring-navy/10');
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <div className="relative">
        {multiline ? <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder=" " rows={4} className={controlClass} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /> : <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder=" " autoComplete={autoComplete} className={controlClass} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />}
        <label htmlFor={id} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-slate-500 transition-all peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-semibold peer-focus:text-navy peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-semibold">
          {label}
        </label>
      </div>
      {error && <p id={`${id}-error`} className="px-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
