'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LAYERS, LAYER_LABEL, LAYER_RATES, calcIncentive, monthEnd, monthStart, npr, weightPct, weighted } from '@/lib/rules';
import { Btn, Card, Field } from '../ui';

export function Calculator({ uid }: { uid: string }) {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [sim, setSim] = useState<any>({ premium: 100000, premium_mode: 'single', term_years: 10 });

  async function run() {
    setErr('');
    const { data, error } = await supabase.rpc('team_production', { root: uid, d_from: from, d_to: to });
    if (error) setErr(error.message); else setRows(data || []);
  }
  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  const tdi = calcIncentive(rows, 'TDI');
  const bdi = calcIncentive(rows, 'BDI');
  const agents: Record<string, any> = {};
  for (const r of rows) {
    const a = (agents[r.agent_id] ||= { name: r.agent_name, layer: r.layer, raw: 0, w: 0 });
    a.raw += Number(r.premium); a.w += weighted(r);
  }

  return (
    <div className="grid gap-6">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="From" type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} />
        <Field label="To" type="date" value={to} onChange={(e: any) => setTo(e.target.value)} />
        <Btn onClick={run}>Calculate</Btn>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {([['TDI', 'Team Development Incentive', tdi], ['BDI', 'Business Development Incentive', bdi]] as const).map(([k, name, r]) => (
          <Card key={k} className="p-5">
            <h3 className="font-bold">{name} ({k})</h3>
            <p className="mt-1 text-sm text-slate-600">Weighted premium {npr(r.totalWeighted)}</p>
            <p className="mt-3 text-3xl font-extrabold text-brand">{npr(r.totalCredit)}</p>
            <p className="text-sm text-slate-500">Qualifying credit after layer rates</p>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-slate-500"><tr><th className="py-1">Layer</th><th>Rate</th><th>Weighted</th><th className="text-right">Credit</th></tr></thead>
              <tbody>
                {LAYERS.map((l) => (
                  <tr key={l} className="border-t border-slate-100">
                    <td className="py-1.5">{LAYER_LABEL[l]}</td><td>{LAYER_RATES[k][l] * 100}%</td>
                    <td>{npr(r.by[l].weighted)}</td><td className="text-right font-semibold">{npr(r.by[l].credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto p-5">
        <h3 className="mb-3 font-bold">Production by team member</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500"><tr><th className="py-1">Agent</th><th>Layer</th><th>Premium</th><th>Weighted</th></tr></thead>
          <tbody>
            {Object.values(agents).map((a: any, i) => (
              <tr key={i} className="border-t border-slate-100"><td className="py-1.5">{a.name}</td><td>{a.layer}</td><td>{npr(a.raw)}</td><td>{npr(a.w)}</td></tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No production in this period.</td></tr>}
          </tbody>
        </table>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-bold">Check a single policy</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Premium (NPR)" type="number" value={sim.premium} onChange={(e: any) => setSim({ ...sim, premium: e.target.value })} />
          <Field label="Mode" as="select" value={sim.premium_mode} onChange={(e: any) => setSim({ ...sim, premium_mode: e.target.value })}>
            <option value="single">Single</option><option value="regular">Regular</option>
          </Field>
          <Field label="Term (years)" type="number" value={sim.term_years} onChange={(e: any) => setSim({ ...sim, term_years: e.target.value })} />
          <div className="self-end text-sm">
            <p>Counts: <b>{weightPct(sim.premium_mode, Number(sim.term_years)) * 100}%</b></p>
            <p>Weighted premium: <b>{npr(weighted(sim))}</b></p>
          </div>
        </div>
      </Card>
    </div>
  );
}
