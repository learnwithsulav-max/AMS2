'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PLANS, npr, planName, today, weightPct, weighted } from '@/lib/rules';
import { Badge, Btn, Card, Field, Modal } from '../ui';
import { jsPDF } from 'jspdf';
import { PolicyDocuments } from './PolicyDocuments';
import { ContactPhone } from '@/components/ContactPhone';
import { ALL_INSURANCE_COMPANIES } from '@/lib/nepali-companies';

export function Plans({ uid }: { uid: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [upgradePrompt, setUpgradePrompt] = useState(false);
  const [documentPolicy, setDocumentPolicy] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const draftKey = `lws:policy-drafts:${uid}`;

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('policies').select('*').eq('agent_id', uid).order('issue_date', { ascending: false });
    setRows(data || []);
    if (error) setMessage(error.message);
    const { data: sub } = await supabase.from('agency_subscriptions').select('*').eq('agent_id', uid).maybeSingle();
    setSubscription(sub);
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

  useEffect(() => {
    window.addEventListener('online', syncDrafts);
    void syncDrafts();
    return () => window.removeEventListener('online', syncDrafts);
  }, [syncDrafts]);

  async function save(e: any) {
    e.preventDefault();
    const row = {
      client_draft_id: crypto.randomUUID(),
      agent_id: uid,
      family_group: form.family_group?.trim() || null,
      company: form.company?.trim() || null,
      client_name: form.client_name,
      client_email: form.client_email?.trim() || null,
      client_phone: form.client_phone?.trim() || null,
      client_dob: form.client_dob || null,
      client_address: form.client_address?.trim() || null,
      nominee_name: form.nominee_name?.trim() || null,
      nominee_relation: form.nominee_relation?.trim() || null,
      plan_type: form.plan_type,
      premium_mode: form.premium_mode,
      term_years: Number(form.term_years),
      premium: Number(form.premium),
      sum_assured: form.sum_assured ? Number(form.sum_assured) : null,
      issue_date: form.issue_date,
      next_due_date: form.next_due_date || null,
      collection_date: form.collection_date || null,
      grace_period_end: form.grace_period_end || null,
      maturity_date: form.maturity_date || null,
      survival_benefit_date: form.survival_benefit_date || null,
      commission_gross: Number(form.commission_gross || 0),
    };

    if (!navigator.onLine) {
      const updated = [...drafts, row];
      localStorage.setItem(draftKey, JSON.stringify(updated));
      setDrafts(updated);
      setMessage('Saved offline. This draft will sync when you are back online.');
      setForm(null);
      return;
    }

    const { error } = await supabase.from('policies').insert(row);
    if (error) {
      // In case client_email or other custom columns haven't had migration run, gracefully strip optional columns
      const safeRow = {
        client_draft_id: row.client_draft_id,
        agent_id: row.agent_id,
        client_name: row.client_name,
        plan_type: row.plan_type,
        premium_mode: row.premium_mode,
        term_years: row.term_years,
        premium: row.premium,
        sum_assured: row.sum_assured,
        issue_date: row.issue_date,
        next_due_date: row.next_due_date,
        collection_date: row.collection_date,
        company: row.company,
        family_group: row.family_group,
        commission_gross: row.commission_gross,
      };
      const retry = await supabase.from('policies').insert(safeRow);
      if (retry.error) {
        setMessage(retry.error.message);
        return;
      }
    }

    setMessage('Policy recorded successfully.');
    setForm(null);
    load();
  }

  async function del(id: string) {
    if (!confirm('Are you sure you want to delete this policy record?')) return;
    const { error } = await supabase.from('policies').delete().eq('id', id);
    if (error) setMessage(error.message);
    else { setMessage('Policy removed.'); load(); }
  }

  const currentYear = new Date().getFullYear();
  const trialPlan = subscription?.plan === 'trial';
  const trial = trialPlan && subscription?.status === 'trial' && new Date(subscription.trial_ends_at).getTime() > Date.now();
  const trialDays = trialPlan && subscription?.trial_ends_at ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0;
  const yearPolicies = rows.filter((row) => new Date(`${row.issue_date}T00:00:00`).getFullYear() === currentYear);
  const upcoming = rows.filter((row) => row.collection_date && new Date(`${row.collection_date}T00:00:00`) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.collection_date.localeCompare(b.collection_date)).slice(0, 8);

  function downloadTaxSummary() {
    const pdf = new jsPDF();
    const total = (field: string) => yearPolicies.reduce((sum, row) => sum + Number(row[field] || 0), 0);
    pdf.setFillColor(10, 79, 138);
    pdf.rect(0, 0, 210, 32, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.text('Learn With Sulav · Annual Commission Tax Summary', 14, 20);
    pdf.setTextColor(45, 55, 72);
    pdf.setFontSize(11);
    pdf.text(`Agent ID: ${uid}`, 14, 42);
    pdf.text(`Fiscal Year: ${currentYear}`, 14, 50);
    pdf.text(`Policies: ${yearPolicies.length}`, 14, 58);
    pdf.text(`Gross commission: NPR ${total('commission_gross').toFixed(2)}`, 14, 66);
    pdf.text(`TDS withheld: NPR ${total('commission_tds').toFixed(2)}`, 14, 74);
    pdf.text(`Net commission: NPR ${total('commission_net').toFixed(2)}`, 14, 82);
    pdf.setFontSize(9);
    pdf.text('Powered by Learn With Sulav | Managed & Developed by Sulav Sapkota', 14, 280);
    pdf.save(`lws-annual-tax-summary-${currentYear}.pdf`);
  }

  return (
    <div className="grid gap-8">
      {subscription && (
        <Card className={`sticky top-2 z-20 flex flex-wrap items-center justify-between gap-4 p-4 ${trialPlan && (!trial || trialDays <= 2) ? 'border-orange-300 bg-orange-50' : ''}`}>
          <div>
            <h2 className="font-bold">Agency Plan: {subscription.plan === 'trial' ? '7 Day Trial' : subscription.plan === 'basic' ? 'Basic' : 'Pro'}</h2>
            <p className="text-sm text-slate-600">
              {trialPlan ? `Full dashboard · up to 5 policies · ${trial ? `ends ${new Date(subscription.trial_ends_at).toLocaleDateString()}` : 'trial expired'}` : `${subscription.status}${subscription.period_ends_at ? ` · through ${new Date(subscription.period_ends_at).toLocaleDateString()}` : ''}`}
              {trialPlan && (!trial || trialDays <= 2) ? ` · ${trial ? `${trialDays} day${trialDays === 1 ? '' : 's'} remaining` : 'upgrade to continue'}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold">{rows.length}{trialPlan ? '/5' : ''} policies</span>
            {drafts.length > 0 && <span className="text-amber-700">{drafts.length} offline draft(s)</span>}
            <a href="/billing" className="rounded-lg bg-[#F15A24] px-4 py-2 font-semibold text-white">Upgrade</a>
          </div>
        </Card>
      )}

      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}

      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h2 className="font-bold">Commission & Tax Summary · {currentYear}</h2>
          <p className="text-sm text-slate-600">
            Gross {npr(yearPolicies.reduce((s, p) => s + Number(p.commission_gross || 0), 0))} · TDS {npr(yearPolicies.reduce((s, p) => s + Number(p.commission_tds || 0), 0))} · Net {npr(yearPolicies.reduce((s, p) => s + Number(p.commission_net || 0), 0))}
          </p>
        </div>
        <Btn variant="ghost" onClick={downloadTaxSummary}>Annual Tax PDF</Btn>
      </Card>

      <Card className="p-4">
        <h2 className="font-bold">Upcoming Collections & Due Dates</h2>
        {upcoming.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {upcoming.map((row) => (
              <div key={row.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm flex items-center justify-between">
                <div>
                  <span className="font-semibold">{row.collection_date}</span> · {row.client_name} · {npr(row.premium)}
                </div>
                {row.client_phone && <ContactPhone phone={row.client_phone} name={row.client_name} showText={false} />}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Add collection dates to policies to track upcoming client renewals.</p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold">{p.name}</h3>
              <Badge tone={p.mode === 'single' ? 'gold' : 'blue'}>
                {p.mode === 'single' ? '20% (0-9y) / 40% (10-14y) / 60% (15y+)' : '100% count'}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{p.about}</p>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Client Policies ({rows.length})</h2>
            <p className="text-xs text-slate-500">Record, organize and connect with policyholders via phone and WhatsApp</p>
          </div>
          <Btn onClick={() => trialPlan && (!trial || rows.length + drafts.length >= 5) ? setUpgradePrompt(true) : setForm({ plan_type: 'endowment', premium_mode: 'regular', term_years: 15, issue_date: today() })}>
            + Add Policy
          </Btn>
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {['Client & Contact', 'Company', 'Plan', 'Mode & Term', 'Premium', 'Weightage', 'Weighted Premium', 'Issued', 'Nominee', 'Actions'].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium">
                    <div className="font-bold text-slate-900">{r.client_name}</div>
                    {r.client_phone ? (
                      <ContactPhone phone={r.client_phone} name={r.client_name} />
                    ) : r.phone ? (
                      <ContactPhone phone={r.phone} name={r.client_name} />
                    ) : null}
                    {r.client_address && <div className="text-[11px] text-slate-500">{r.client_address}</div>}
                  </td>
                  <td className="px-3 py-2">{r.company || '—'}</td>
                  <td className="px-3 py-2">{planName(r.plan_type)}</td>
                  <td className="px-3 py-2 capitalize">{r.premium_mode} · {r.term_years} yrs</td>
                  <td className="px-3 py-2 font-semibold">{npr(r.premium)}</td>
                  <td className="px-3 py-2">{weightPct(r.premium_mode, r.term_years) * 100}%</td>
                  <td className="px-3 py-2 font-bold text-[#0A4F8A]">{npr(weighted(r))}</td>
                  <td className="px-3 py-2 text-xs">{r.issue_date}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.nominee_name ? (
                      <div>
                        <b>{r.nominee_name}</b>
                        {r.nominee_relation && <span className="text-slate-500"> ({r.nominee_relation})</span>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button className="text-xs font-semibold text-[#0A4F8A] underline" onClick={() => setDocumentPolicy(r)}>
                        Vault
                      </button>
                      <button className="text-xs font-semibold text-slate-600 hover:text-slate-900" onClick={() => setSelectedDetail(r)}>
                        View
                      </button>
                      <button className="text-xs text-red-600 hover:underline" onClick={() => del(r.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-500">
                    No policies entered yet. Click "+ Add Policy" to record your client policies.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Policy Details Modal */}
      {selectedDetail && (
        <Modal title={`Policyholder Details · ${selectedDetail.client_name}`} onClose={() => setSelectedDetail(null)}>
          <div className="grid gap-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4">
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Client Name:</span>
                <p className="font-bold text-slate-900">{selectedDetail.client_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Contact:</span>
                <div>
                  <ContactPhone phone={selectedDetail.client_phone || selectedDetail.phone} name={selectedDetail.client_name} />
                </div>
              </div>
              {selectedDetail.client_email && (
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Email:</span>
                  <p className="text-slate-800">{selectedDetail.client_email}</p>
                </div>
              )}
              {selectedDetail.client_dob && (
                <div>
                  <span className="text-xs text-slate-500 uppercase font-semibold">Date of Birth (DOB):</span>
                  <p className="text-slate-800">{selectedDetail.client_dob}</p>
                </div>
              )}
              {selectedDetail.client_address && (
                <div className="col-span-2">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Address:</span>
                  <p className="text-slate-800">{selectedDetail.client_address}</p>
                </div>
              )}
              {selectedDetail.nominee_name && (
                <div className="col-span-2 border-t pt-2">
                  <span className="text-xs text-slate-500 uppercase font-semibold">Nominee:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedDetail.nominee_name} {selectedDetail.nominee_relation ? `(${selectedDetail.nominee_relation})` : ''}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Company:</span>
                <p className="font-semibold">{selectedDetail.company || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Plan:</span>
                <p className="font-semibold">{planName(selectedDetail.plan_type)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Premium Mode:</span>
                <p className="capitalize">{selectedDetail.premium_mode} ({selectedDetail.term_years} Years)</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Collected Premium:</span>
                <p className="font-bold text-slate-900">{npr(selectedDetail.premium)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Weighted Premium:</span>
                <p className="font-black text-[#0A4F8A]">{npr(weighted(selectedDetail))}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Net Commission:</span>
                <p className="font-semibold text-emerald-700">{npr(selectedDetail.commission_net || 0)}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Policy Modal */}
      {form && (
        <Modal title="Add New Client Policy" onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Client Full Name (बीमितको पूरा नाम)"
              required
              className="sm:col-span-2"
              placeholder="e.g. Binod Sharma"
              value={form.client_name || ''}
              onChange={set('client_name')}
            />

            {/* Email, Phone, DOB, Address, Nominee fields */}
            <Field
              label="Client Mobile (फोन / WhatsApp)"
              type="tel"
              placeholder="e.g. 9847303594"
              value={form.client_phone || ''}
              onChange={set('client_phone')}
            />

            <Field
              label="Client Email (इमेल)"
              type="email"
              placeholder="client@example.com"
              value={form.client_email || ''}
              onChange={set('client_email')}
            />

            <Field
              label="Date of Birth (जन्म मिति AD/BS)"
              type="date"
              value={form.client_dob || ''}
              onChange={set('client_dob')}
            />

            <Field
              label="Client Address (ठेगाना)"
              placeholder="e.g. Butwal-4, Rupandehi"
              value={form.client_address || ''}
              onChange={set('client_address')}
            />

            <Field
              label="Nominee Name (इच्छाइएको व्यक्तिको नाम)"
              placeholder="e.g. Sita Sharma"
              value={form.nominee_name || ''}
              onChange={set('nominee_name')}
            />

            <Field
              label="Nominee Relation (नाता)"
              placeholder="e.g. Wife / Husband / Mother / Son"
              value={form.nominee_relation || ''}
              onChange={set('nominee_relation')}
            />

            {/* Insurance Company Selector with full Nepali Companies */}
            <div className="grid gap-1 text-sm font-medium sm:col-span-2">
              <label htmlFor="policy-company">Insurance Company (बिमा कम्पनी)</label>
              <select
                id="policy-company"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0A4F8A] focus:outline-none"
                value={form.company || ''}
                onChange={set('company')}
              >
                <option value="">Select Insurance Company</option>
                <optgroup label="Life Insurance Companies">
                  {ALL_INSURANCE_COMPANIES.filter((c) => c.type === 'life').map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Non-Life & Micro">
                  {ALL_INSURANCE_COMPANIES.filter((c) => c.type !== 'life').map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <Field
              label="Family Group"
              value={form.family_group || ''}
              onChange={set('family_group')}
              placeholder="e.g. Sharma Family Group"
            />

            <Field
              label="Plan Type"
              as="select"
              value={form.plan_type}
              onChange={(e: any) => setForm({ ...form, plan_type: e.target.value, premium_mode: PLANS.find((p) => p.id === e.target.value)?.mode })}
            >
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Field>

            <Field label="Premium Mode" as="select" value={form.premium_mode} onChange={set('premium_mode')}>
              <option value="regular">Regular</option>
              <option value="single">Single Premium</option>
            </Field>

            <Field
              label="Term (Years)"
              type="number"
              min="1"
              required
              value={form.term_years}
              onChange={set('term_years')}
            />

            <Field
              label="Collected Premium (NPR)"
              type="number"
              min="0"
              required
              placeholder="e.g. 50000"
              value={form.premium || ''}
              onChange={set('premium')}
            />

            <Field
              label="Gross Commission (NPR)"
              type="number"
              min="0"
              placeholder="e.g. 10000"
              value={form.commission_gross || ''}
              onChange={set('commission_gross')}
            />

            <Field
              label="Sum Assured (NPR)"
              type="number"
              min="0"
              placeholder="e.g. 1000000"
              value={form.sum_assured || ''}
              onChange={set('sum_assured')}
            />

            <Field
              label="Issue Date"
              type="date"
              required
              value={form.issue_date}
              onChange={set('issue_date')}
            />

            <Field
              label="Collection Date"
              type="date"
              value={form.collection_date || ''}
              onChange={set('collection_date')}
            />

            <Field
              label="Next Due Date"
              type="date"
              value={form.next_due_date || ''}
              onChange={set('next_due_date')}
            />

            <Field
              label="Grace Period Ends"
              type="date"
              value={form.grace_period_end || ''}
              onChange={set('grace_period_end')}
            />

            <p className="text-sm text-slate-600 sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <b>Weightage Rule:</b> Counts as {weightPct(form.premium_mode, Number(form.term_years)) * 100}% of the premium for TDI, BDI, MDRT, and Club member status.
            </p>

            <Btn type="submit" className="sm:col-span-2">Save Client Policy</Btn>
          </form>
        </Modal>
      )}

      {upgradePrompt && (
        <Modal title="Choose an Agency Package" onClose={() => setUpgradePrompt(false)}>
          <p className="text-sm text-slate-600">The free trial supports up to five policies. Choose Agent Basic or Agent Pro to manage unlimited client records.</p>
          <a href="/billing" className="mt-4 inline-flex rounded-lg bg-[#F15A24] px-4 py-2.5 text-sm font-semibold text-white">View Subscription Packages</a>
        </Modal>
      )}

      {documentPolicy && (
        <Modal title={`Policy Documents · ${documentPolicy.client_name}`} onClose={() => setDocumentPolicy(null)}>
          <PolicyDocuments policyId={documentPolicy.id} />
        </Modal>
      )}
    </div>
  );
}
