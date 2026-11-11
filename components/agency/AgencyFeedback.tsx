'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/brand';
import { Btn, Card, Field } from '@/components/ui';

export function AgencyFeedback({ uid }: { uid: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [kind, setKind] = useState('feature_request');
  const [category, setCategory] = useState('other');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('agency_feedback')
      .select('id,kind,category,title,details,status,created_at')
      .eq('agent_id', uid)
      .order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    setRows(data || []);
  }, [uid]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const { error } = await supabase.from('agency_feedback').insert({
      agent_id: uid,
      kind,
      category,
      title: title.trim(),
      details: details.trim(),
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setTitle('');
    setDetails('');
    setMessage('Thanks. Your feedback is in the admin review queue.');
    await load();
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-5">
      <header>
        <h1 className="text-2xl font-extrabold text-[#0A4F8A]">Feature request or bug report</h1>
        <p className="mt-1 text-sm text-slate-600">
          Send a request directly to the Learn With Sulav admin team. Prefer email?{' '}
          <a className="font-semibold text-[#0A4F8A] underline" href={`mailto:${BRAND.contact.emails.feedback}`}>
            {BRAND.contact.emails.feedback}
          </a>.
        </p>
      </header>
      <Card className="p-5">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Type" as="select" value={kind} onChange={(event: any) => setKind(event.target.value)}>
            <option value="feature_request">Feature request</option>
            <option value="bug_report">Bug report</option>
          </Field>
          <Field label="Category" as="select" value={category} onChange={(event: any) => setCategory(event.target.value)}>
            {['policies', 'commission', 'team', 'billing', 'marketing', 'other'].map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Field>
          <Field label="Title" required maxLength={140} className="sm:col-span-2" value={title} onChange={(event: any) => setTitle(event.target.value)} />
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">
            Details
            <textarea required minLength={5} maxLength={3000} rows={5} value={details} onChange={(event) => setDetails(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" />
          </label>
          <Btn type="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit feedback'}</Btn>
          {message && <p role="status" className="self-center text-sm text-slate-600">{message}</p>}
        </form>
      </Card>
      <section className="grid gap-3">
        <h2 className="font-bold">Your submissions</h2>
        {rows.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <b>{row.title}</b>
              <span className="text-sm capitalize text-[#0A4F8A]">{row.status}</span>
            </div>
            <p className="mt-1 text-xs capitalize text-slate-500">
              {row.kind.replace('_', ' ')} · {row.category} · {new Date(row.created_at).toLocaleDateString()}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{row.details}</p>
          </Card>
        ))}
        {!rows.length && <p className="text-sm text-slate-500">No feedback submitted yet.</p>}
      </section>
    </div>
  );
}
