'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PLANS, npr, planName, today, weightPct, weighted } from '@/lib/rules';
import { Badge, Btn, Card, Field, Modal } from '../ui';

export function Plans({ uid }: { uid: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from('policies').select('*').eq('agent_id', uid).order('issue_date', { ascending: false });
    setRows(data || []);
  }, [uid]);
  useEffect(() => { load(); }, [load]);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save(e: any) {
    e.preventDefault();
    await supabase.from('policies').insert({
      agent_id: uid, client_name: form.client_name, plan_type: form.plan_type, premium_mode: form.premium_mode,
      term_years: Number(form.term_years), premium: Number(form.premium), sum_assured: form.sum_assured ? Number(form.sum_assured) : null,
      issue_date: form.issue_date, next_due_date: form.next_due_date || null,
    });
    setForm(null); load();
  }
  async function del(id: string) { if (confirm('Delete this policy?')) { await supabase.from('policies').delete().eq('id', id); load(); } }

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold">{p.name}</h3>
              <Badge tone={p.mode === 'single' ? 'gold' : 'blue'}>{p.mode === 'single' ? '20 / 40 / 60%' : '100% count'}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{p.about}</p>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">My policies</h2>
          <Btn onClick={() => setForm({ plan_type: 'endowment', premium_mode: 'regular', term_years: 15, issue_date: today() })}>Add policy</Btn>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr>
              {['Client', 'Plan', 'Mode', 'Term', 'Premium', 'Counts', 'Weighted', 'Issued', 'Next due', ''].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{r.client_name}</td><td className="px-3 py-2">{planName(r.plan_type)}</td>
                  <td className="px-3 py-2 capitalize">{r.premium_mode}</td><td className="px-3 py-2">{r.term_years} yrs</td>
                  <td className="px-3 py-2">{npr(r.premium)}</td><td className="px-3 py-2">{weightPct(r.premium_mode, r.term_years) * 100}%</td>
                  <td className="px-3 py-2 font-semibold">{npr(weighted(r))}</td><td className="px-3 py-2">{r.issue_date}</td>
                  <td className="px-3 py-2">{r.next_due_date || '-'}</td>
                  <td className="px-3 py-2"><button className="text-red-600" onClick={() => del(r.id)}>Delete</button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No policies yet. Add your first policy to see weighted premium.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>

      {form && (
        <Modal title="Add policy" onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Client name" required className="sm:col-span-2" value={form.client_name || ''} onChange={set('client_name')} />
            <Field label="Plan" as="select" value={form.plan_type} onChange={(e: any) => setForm({ ...form, plan_type: e.target.value, premium_mode: PLANS.find((p) => p.id === e.target.value)?.mode })}>
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Field>
            <Field label="Premium mode" as="select" value={form.premium_mode} onChange={set('premium_mode')}>
              <option value="regular">Regular</option><option value="single">Single</option>
            </Field>
            <Field label="Term (years)" type="number" min="1" required value={form.term_years} onChange={set('term_years')} />
            <Field label="Premium (NPR)" type="number" min="0" required value={form.premium || ''} onChange={set('premium')} />
            <Field label="Sum assured (NPR)" type="number" min="0" value={form.sum_assured || ''} onChange={set('sum_assured')} />
            <Field label="Issue date" type="date" required value={form.issue_date} onChange={set('issue_date')} />
            <Field label="Next due date" type="date" value={form.next_due_date || ''} onChange={set('next_due_date')} />
            <p className="text-sm text-slate-600 sm:col-span-2">
              Counts as {weightPct(form.premium_mode, Number(form.term_years)) * 100}% of the premium for TDI and BDI.
            </p>
            <Btn type="submit" className="sm:col-span-2">Save policy</Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}
