'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PLANS, npr, planName, today, weightPct, weighted } from '@/lib/rules';
import { Badge, Btn, Card, Field, Modal } from '../ui';
import { jsPDF } from 'jspdf';
import { PolicyDocuments } from './PolicyDocuments';

export function Plans({ uid }: { uid: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [upgradePrompt, setUpgradePrompt] = useState(false);
  const [documentPolicy, setDocumentPolicy] = useState<any>(null);
  const draftKey = `lws:policy-drafts:${uid}`;
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('policies').select('*').eq('agent_id', uid).order('issue_date', { ascending: false });
    setRows(data || []);
    if (error) setMessage(error.message);
    const { data: sub } = await supabase.from('agency_subscriptions').select('*').eq('agent_id', uid).maybeSingle(); setSubscription(sub);
  }, [uid]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    try { setDrafts(JSON.parse(localStorage.getItem(draftKey) || '[]')); } catch { setDrafts([]); }
  }, [draftKey]);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const syncDrafts = useCallback(async () => {
    if (!navigator.onLine) return;
    let queued: any[] = [];
    try { queued = JSON.parse(localStorage.getItem(draftKey) || '[]'); } catch { return; }
    const pending: any[] = [];
    for (const draft of queued) {
      const { error } = await supabase.from('policies').upsert(draft, { onConflict: 'client_draft_id', ignoreDuplicates: true });
      if (error) pending.push(draft);
    }
    localStorage.setItem(draftKey, JSON.stringify(pending)); setDrafts(pending);
    if (queued.length && !pending.length) { setMessage('Offline policy drafts synced.'); await load(); }
  }, [draftKey, load]);
  useEffect(() => { window.addEventListener('online', syncDrafts); void syncDrafts(); return () => window.removeEventListener('online', syncDrafts); }, [syncDrafts]);

  async function save(e: any) {
    e.preventDefault();
    const row = {
      client_draft_id: crypto.randomUUID(), agent_id: uid, family_group: form.family_group?.trim() || null, company: form.company?.trim() || null,
      client_name: form.client_name, plan_type: form.plan_type, premium_mode: form.premium_mode,
      term_years: Number(form.term_years), premium: Number(form.premium), sum_assured: form.sum_assured ? Number(form.sum_assured) : null,
      issue_date: form.issue_date, next_due_date: form.next_due_date || null, collection_date: form.collection_date || null,
      commission_gross: Number(form.commission_gross || 0),
    };
    if (!navigator.onLine) {
      const updated = [...drafts, row]; localStorage.setItem(draftKey, JSON.stringify(updated)); setDrafts(updated); setMessage('Saved offline. This draft will sync when you are back online.'); setForm(null); return;
    }
    const { error } = await supabase.from('policies').insert(row);
    if (error) { setMessage(error.message); return; }
    setMessage('Policy saved.'); setForm(null); load();
  }
  async function del(id: string) { if (confirm('Delete this policy?')) { await supabase.from('policies').delete().eq('id', id); load(); } }
  const currentYear = new Date().getFullYear();
  const trialPlan = subscription?.plan === 'trial';
  const trialEnds = new Date(subscription?.trial_ends_at || 0).getTime();
  const trial = trialPlan && subscription?.status === 'trial' && trialEnds > Date.now();
  const trialDays = trial ? Math.ceil((trialEnds - Date.now()) / 86400000) : 0;
  const yearPolicies = rows.filter((row) => new Date(`${row.issue_date}T00:00:00`).getFullYear() === currentYear);
  const upcoming = rows.filter((row) => row.collection_date && new Date(`${row.collection_date}T00:00:00`) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.collection_date.localeCompare(b.collection_date)).slice(0, 8);
  function downloadTaxSummary() {
    const pdf = new jsPDF();
    const total = (field: string) => yearPolicies.reduce((sum, row) => sum + Number(row[field] || 0), 0);
    pdf.setFontSize(18); pdf.text(`Annual Commission Tax Summary ${currentYear}`, 14, 18);
    pdf.setFontSize(11); pdf.text(`Agent account: ${uid}`, 14, 28); pdf.text(`Policies: ${yearPolicies.length}`, 14, 38);
    pdf.text(`Gross commission: NPR ${total('commission_gross').toFixed(2)}`, 14, 46);
    pdf.text(`TDS withheld: NPR ${total('commission_tds').toFixed(2)}`, 14, 54);
    pdf.text(`Net commission: NPR ${total('commission_net').toFixed(2)}`, 14, 62);
    pdf.setFontSize(9); pdf.text('Issue date · Company · Gross · TDS · Net', 14, 76);
    yearPolicies.slice(0, 30).forEach((row, i) => pdf.text(`${row.issue_date} · ${row.company || '-'} · ${Number(row.commission_gross || 0).toFixed(2)} · ${Number(row.commission_tds || 0).toFixed(2)} · ${Number(row.commission_net || 0).toFixed(2)}`, 14, 84 + i * 6));
    pdf.save(`lws-annual-tax-summary-${currentYear}.pdf`);
  }

  return (
    <div className="grid gap-8">
      {subscription && <Card className={`sticky top-2 z-20 flex flex-wrap items-center justify-between gap-4 p-4 ${trialPlan && (!trial || trialDays <= 2) ? 'border-orange-300 bg-orange-50' : ''}`}><div><h2 className="font-bold">Agency plan: {subscription.plan === 'trial' ? '7 day trial' : subscription.plan === 'basic' ? 'Basic' : 'Pro'}</h2><p className="text-sm text-slate-600">{trialPlan ? `Full dashboard · up to 5 policies · ${trial ? `ends ${new Date(subscription.trial_ends_at).toLocaleDateString()}` : 'trial expired'}` : `${subscription.status}${subscription.period_ends_at ? ` · through ${new Date(subscription.period_ends_at).toLocaleDateString()}` : ''}`}{trialPlan && (!trial || trialDays <= 2) ? ` · ${trial ? `${trialDays} day${trialDays===1?'':'s'} remaining` : 'upgrade to continue'}` : ''}</p></div><div className="flex items-center gap-3 text-sm"><span className="font-semibold">{rows.length}{trialPlan?'/5':''} policies</span>{drafts.length > 0 && <span className="text-amber-700">{drafts.length} offline draft(s)</span>}<a href="/billing" className="rounded-lg bg-[#F15A24] px-4 py-2 font-semibold text-white">Upgrade</a></div></Card>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4"><div><h2 className="font-bold">Commission tax summary · {currentYear}</h2><p className="text-sm text-slate-600">Gross {npr(yearPolicies.reduce((s,p) => s + Number(p.commission_gross || 0), 0))} · TDS {npr(yearPolicies.reduce((s,p) => s + Number(p.commission_tds || 0), 0))} · Net {npr(yearPolicies.reduce((s,p) => s + Number(p.commission_net || 0), 0))}</p></div><Btn variant="ghost" onClick={downloadTaxSummary}>Annual tax PDF</Btn></Card>
      <Card className="p-4"><h2 className="font-bold">Upcoming collections</h2>{upcoming.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{upcoming.map((row) => <p key={row.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold">{row.collection_date}</span> · {row.client_name} · {row.family_group || 'Individual'} · {npr(row.premium)}</p>)}</div> : <p className="mt-2 text-sm text-slate-600">Add collection dates to policies to track monthly collections.</p>}</Card>
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
          <Btn onClick={() => trialPlan && (!trial || rows.length + drafts.length >= 5) ? setUpgradePrompt(true) : setForm({ plan_type: 'endowment', premium_mode: 'regular', term_years: 15, issue_date: today() })}>Add policy</Btn>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr>
              {['Client', 'Family', 'Company', 'Plan', 'Mode', 'Term', 'Premium', 'Counts', 'Weighted', 'Issued', 'Collection', 'Net commission', 'Next due', 'Documents', ''].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{r.client_name}</td><td className="px-3 py-2">{r.family_group || '-'}</td><td className="px-3 py-2">{r.company || '-'}</td><td className="px-3 py-2">{planName(r.plan_type)}</td>
                  <td className="px-3 py-2 capitalize">{r.premium_mode}</td><td className="px-3 py-2">{r.term_years} yrs</td>
                  <td className="px-3 py-2">{npr(r.premium)}</td><td className="px-3 py-2">{weightPct(r.premium_mode, r.term_years) * 100}%</td>
                  <td className="px-3 py-2 font-semibold">{npr(weighted(r))}</td><td className="px-3 py-2">{r.issue_date}</td>
                  <td className="px-3 py-2">{r.collection_date || '-'}</td><td className="px-3 py-2">{npr(r.commission_net || 0)}</td><td className="px-3 py-2">{r.next_due_date || '-'}</td>
                  <td className="px-3 py-2"><button className="font-semibold text-[#0A4F8A] underline" onClick={() => setDocumentPolicy(r)}>Vault</button></td><td className="px-3 py-2"><button className="text-red-600" onClick={() => del(r.id)}>Delete</button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={14} className="px-3 py-8 text-center text-slate-500">No policies yet. Add your first policy to see weighted premium.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>

      {form && (
        <Modal title="Add policy" onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Client name" required className="sm:col-span-2" value={form.client_name || ''} onChange={set('client_name')} />
            <Field label="Family group" value={form.family_group || ''} onChange={set('family_group')} placeholder="e.g. Shrestha family" />
            <Field label="Insurance company" value={form.company || ''} onChange={set('company')} placeholder="Company for TDS rules" />
            <Field label="Plan" as="select" value={form.plan_type} onChange={(e: any) => setForm({ ...form, plan_type: e.target.value, premium_mode: PLANS.find((p) => p.id === e.target.value)?.mode })}>
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Field>
            <Field label="Premium mode" as="select" value={form.premium_mode} onChange={set('premium_mode')}>
              <option value="regular">Regular</option><option value="single">Single</option>
            </Field>
            <Field label="Term (years)" type="number" min="1" required value={form.term_years} onChange={set('term_years')} />
            <Field label="Premium (NPR)" type="number" min="0" required value={form.premium || ''} onChange={set('premium')} />
            <Field label="Gross commission (NPR)" type="number" min="0" value={form.commission_gross || ''} onChange={set('commission_gross')} />
            <Field label="Sum assured (NPR)" type="number" min="0" value={form.sum_assured || ''} onChange={set('sum_assured')} />
            <Field label="Issue date" type="date" required value={form.issue_date} onChange={set('issue_date')} />
            <Field label="Next due date" type="date" value={form.next_due_date || ''} onChange={set('next_due_date')} />
            <Field label="Collection date" type="date" value={form.collection_date || ''} onChange={set('collection_date')} />
            <p className="text-sm text-slate-600 sm:col-span-2">
              Counts as {weightPct(form.premium_mode, Number(form.term_years)) * 100}% of the premium for TDI and BDI.
            </p>
            <Btn type="submit" className="sm:col-span-2">Save policy</Btn>
          </form>
        </Modal>
      )}
      {upgradePrompt && <Modal title="Choose an agency pass" onClose={() => setUpgradePrompt(false)}><p className="text-sm text-slate-600">The free trial supports up to five policies. Choose Agent Basic for Rs 499 / 180 days or Agent Pro for Rs 899 / 365 days to add more.</p><a href="/billing" className="mt-4 inline-flex rounded-lg bg-[#F15A24] px-4 py-2.5 text-sm font-semibold text-white">View subscription packages</a></Modal>}
      {documentPolicy && <Modal title={`Policy documents · ${documentPolicy.client_name}`} onClose={() => setDocumentPolicy(null)}><PolicyDocuments policyId={documentPolicy.id}/></Modal>}
    </div>
  );
}
