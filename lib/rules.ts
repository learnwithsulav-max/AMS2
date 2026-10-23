// Plan catalogue + TDI/BDI engine. Plan descriptions are generic:
// edit PLANS to match your company's exact products and rates.
export type Layer = 'A' | 'B' | 'C' | 'D';
export const LAYERS: Layer[] = ['A', 'B', 'C', 'D'];
export type Mode = 'single' | 'regular';

export const PLANS = [
  { id: 'single', name: 'Single / Limited Premium Plan', mode: 'single' as Mode,
    about: 'Pay one premium (or for a limited period) and stay covered for the whole term. Counts at 20%, 40% or 60% when paid as a single premium, depending on the term.' },
  { id: 'endowment', name: 'Regular Endowment Plan', mode: 'regular' as Mode,
    about: 'Regular premiums give life cover during the term and a maturity benefit with bonus at the end.' },
  { id: 'wholelife', name: 'Endowment Whole Life Plan', mode: 'regular' as Mode,
    about: 'Lifelong cover with an endowment benefit paid at a set age, plus bonus.' },
  { id: 'child', name: 'Child Plan', mode: 'regular' as Mode,
    about: "Builds savings for a child's education or future, with the premium waived if the parent dies or becomes disabled." },
  { id: 'anticipated', name: 'Anticipated Plan (MoneyBack)', mode: 'regular' as Mode,
    about: 'Pays back a fixed share of the sum assured at set intervals during the term, with the balance and bonus at maturity.' },
  { id: 'term', name: 'Term Plan', mode: 'regular' as Mode,
    about: 'Pure risk cover for a fixed term. Pays only if the insured dies within the term.' },
];
export const planName = (id: string) => PLANS.find((p) => p.id === id)?.name || id;

// Share of each premium that counts toward TDI/BDI.
export function weightPct(mode: string, term: number) {
  if (mode !== 'single') return 1; // regular premium plans = 100%
  if (term >= 15) return 0.6;
  if (term >= 10) return 0.4;
  if (term >= 5) return 0.2;
  return 0; // single plans under 5 years do not count
}
export const weighted = (r: any) => Number(r.premium || 0) * weightPct(r.premium_mode, Number(r.term_years || 0));

// Layer A = self at 100%, B = 4%, C = 2%, D = 1%. BDI uses the same table today;
// change BDI separately here if its rates differ.
export const LAYER_RATES: Record<'TDI' | 'BDI', Record<Layer, number>> = {
  TDI: { A: 1, B: 0.04, C: 0.02, D: 0.01 },
  BDI: { A: 1, B: 0.04, C: 0.02, D: 0.01 },
};
export const LAYER_LABEL: Record<Layer, string> = {
  A: 'Layer A (Self)', B: 'Layer B (Direct downline)', C: 'Layer C (Level 2)', D: 'Layer D (Level 3)',
};

// rows: [{layer, premium, premium_mode, term_years}]
export function calcIncentive(rows: any[], kind: 'TDI' | 'BDI') {
  const rates = LAYER_RATES[kind];
  const by: Record<Layer, { count: number; raw: number; weighted: number; credit: number }> = {
    A: { count: 0, raw: 0, weighted: 0, credit: 0 }, B: { count: 0, raw: 0, weighted: 0, credit: 0 },
    C: { count: 0, raw: 0, weighted: 0, credit: 0 }, D: { count: 0, raw: 0, weighted: 0, credit: 0 },
  };
  for (const r of rows) {
    const b = by[r.layer as Layer];
    if (!b) continue;
    b.count++; b.raw += Number(r.premium || 0); b.weighted += weighted(r);
  }
  let totalWeighted = 0, totalCredit = 0;
  for (const l of LAYERS) { by[l].credit = by[l].weighted * rates[l]; totalWeighted += by[l].weighted; totalCredit += by[l].credit; }
  return { by, totalWeighted, totalCredit };
}

// Team layers computed in the browser (admin sees every profile).
export function layersOf(agentId: string, profiles: any[]) {
  const kids = (id: string) => profiles.filter((p) => p.upline_id === id).map((p) => p.id);
  const B = kids(agentId), C = B.flatMap(kids), D = C.flatMap(kids);
  return { A: [agentId], B, C, D } as Record<Layer, string[]>;
}

export const npr = (n: any) => 'NPR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
export const today = () => new Date().toISOString().slice(0, 10);
export const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA'); };
export const monthEnd = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('en-CA'); };
