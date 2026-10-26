'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LAYERS, LAYER_LABEL, npr, weighted, calculateAgentTitle } from '@/lib/rules';
import { Btn, Card, Field } from '@/components/ui';
import { ContactPhone } from '@/components/ContactPhone';

const date = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function TeamNetwork({ uid }: { uid: string }) {
  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-01-01`);
  const [to, setTo] = useState(date(today));
  const [rows, setRows] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, any>>(new Map());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [teamRes, profilesRes] = await Promise.all([
      supabase.rpc('team_production_company', { root: uid, d_from: from, d_to: to }),
      supabase.from('profiles').select('id, name, phone, branch, referral_code, license_no'),
    ]);

    setBusy(false);
    if (teamRes.error) {
      setError(teamRes.error.message);
      return;
    }
    setError('');
    setRows(teamRes.data || []);

    const pMap = new Map<string, any>();
    (profilesRes.data || []).forEach((p: any) => pMap.set(p.id, p));
    setProfileMap(pMap);
  }, [uid, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const members = new Map<string, any>();
  for (const r of rows) {
    const prof = profileMap.get(r.agent_id);
    const a = members.get(r.agent_id) || {
      id: r.agent_id,
      name: r.agent_name || prof?.name || 'Agent',
      phone: prof?.phone || null,
      branch: prof?.branch || 'Branch',
      layer: r.layer,
      policies: 0,
      premium: 0,
      weighted: 0,
      companies: new Set<string>(),
    };
    a.policies++;
    a.premium += Number(r.premium || 0);
    a.weighted += weighted(r);
    if (r.company) a.companies.add(r.company);
    members.set(r.agent_id, a);
  }

  const ordered = [...members.values()].sort(
    (a, b) => String(a.layer).localeCompare(String(b.layer)) || a.name.localeCompare(b.name)
  );
  const total = ordered.reduce((a, m) => a + m.premium, 0);
  const layerTotals = LAYERS.map((layer) => ({
    layer,
    ...ordered
      .filter((m) => m.layer === layer)
      .reduce(
        (a, m) => ({
          agents: a.agents + 1,
          policies: a.policies + m.policies,
          premium: a.premium + m.premium,
        }),
        { agents: 0, policies: 0, premium: 0 }
      ),
  }));

  return (
    <div className="grid gap-5">
      <header>
        <h1 className="text-2xl font-extrabold text-[#0A4F8A]">Team Network & Cadre Hierarchy</h1>
        <p className="mt-1 text-sm text-slate-600">
          Downline production from the recorded upline tree with instant WhatsApp connection and official title designations.
        </p>
      </header>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="From Date" type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} />
        <Field label="To Date" type="date" value={to} onChange={(e: any) => setTo(e.target.value)} />
        <Btn onClick={load} disabled={busy}>
          {busy ? 'Loading…' : 'Refresh Team'}
        </Btn>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Active Producers in Tree</p>
          <b className="text-2xl text-slate-900 tabular-nums">{members.size}</b>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Team Issued Policies</p>
          <b className="text-2xl text-slate-900 tabular-nums">{rows.length}</b>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total Team Premium</p>
          <b className="text-2xl text-[#0A4F8A] tabular-nums">{npr(total)}</b>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <div className="p-4 border-b">
          <h2 className="font-bold text-slate-900">Layer Performance Summary</h2>
          <p className="text-xs text-slate-500">TDI/BDI layer distribution (A = Self, B = Direct Downline, C = Level 2, D = Level 3)</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Layer', 'Producers', 'Policies', 'Collected Premium'].map((x) => (
                <th className="px-4 py-2 font-semibold text-slate-700" key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {layerTotals.map((x) => (
              <tr className="border-t" key={x.layer}>
                <td className="px-4 py-2 font-medium">{LAYER_LABEL[x.layer]}</td>
                <td className="px-4 py-2 tabular-nums">{x.agents}</td>
                <td className="px-4 py-2 tabular-nums">{x.policies}</td>
                <td className="px-4 py-2 font-semibold tabular-nums">{npr(x.premium)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto">
        <div className="p-4 border-b">
          <h2 className="font-bold text-slate-900">Advisors in the Reporting Tree</h2>
          <p className="text-xs text-slate-500">
            Directly connect with downline advisors via WhatsApp or phone. Titles are calculated based on production rules.
          </p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Advisor & Contact', 'Designation / Title', 'Layer', 'Policies', 'Premium', 'Weighted Premium', 'Companies'].map((x) => (
                <th className="px-3 py-2 font-semibold text-slate-700" key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((a) => {
              const titleInfo = calculateAgentTitle({
                ownPoliciesCount: a.policies,
                ownPremium: a.premium,
                totalTeamBusiness: a.premium,
              });

              return (
                <tr key={a.id} className="border-t hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-medium">
                    <div className="font-bold text-slate-900">{a.name}</div>
                    {a.phone && <ContactPhone phone={a.phone} name={a.name} />}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-[#0A4F8A]">
                      {titleInfo.name}
                    </span>
                  </td>
                  <td className="px-3 py-2">{LAYER_LABEL[a.layer as keyof typeof LAYER_LABEL] || a.layer}</td>
                  <td className="px-3 py-2 tabular-nums font-bold text-slate-900">{a.policies}</td>
                  <td className="px-3 py-2 tabular-nums">{npr(a.premium)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold text-[#0A4F8A]">{npr(a.weighted)}</td>
                  <td className="px-3 py-2 text-xs">{[...a.companies].join(', ') || '—'}</td>
                </tr>
              );
            })}
            {!ordered.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No team policies recorded in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
