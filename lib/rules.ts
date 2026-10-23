// Plan catalogue + TDI/BDI engine. Plan descriptions are generic:
// edit PLANS to match your company's exact products and rates.
export type Layer = 'A' | 'B' | 'C' | 'D';
export const LAYERS: Layer[] = ['A', 'B', 'C', 'D'];
export type Mode = 'single' | 'regular';

export const PLANS = [
  { id: 'single', name: 'Single / Limited Premium Plan', mode: 'single' as Mode,
    about: 'Pay one premium (or for a limited period) and stay covered for the whole term. Counts at 20% (0-9 yrs), 40% (10-14 yrs) or 60% (15+ yrs) when paid as a single premium.' },
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

// Share of each premium that counts toward TDI/BDI, MDRT, Club member, and monthly schemes.
// Rule:
// - Regular premium: 100%
// - Single premium:
//   - 0-9 years: 20%
//   - 10-14 years: 40%
//   - 15 years and above: 60%
export function weightPct(mode: string, term: number): number {
  if (mode !== 'single') return 1; // regular premium plans = 100%
  const t = Number(term || 0);
  if (t >= 15) return 0.6; // 15 years and above: 60%
  if (t >= 10) return 0.4; // 10-14 years: 40%
  return 0.2;              // 0-9 years: 20%
}

export const weighted = (r: any) => Number(r.premium || 0) * weightPct(r.premium_mode, Number(r.term_years || 0));

// Official Cadre / Designation Title Hierarchy for Learn With Sulav insurance agents
export type AgentTitleCode = 'CAM' | 'STAR_AM' | 'SAM' | 'AM' | 'IA' | 'FR' | 'OA';

export interface AgentTitleInfo {
  code: AgentTitleCode;
  name: string;
  shortName: string;
  badgeTone: 'gold' | 'blue' | 'purple' | 'emerald' | 'amber' | 'slate';
  description: string;
  nextTitle?: {
    name: string;
    requirement: string;
  };
}

export function calculateAgentTitle(stats: {
  ownPoliciesCount: number;
  ownPremium: number;
  activeDownlineCount?: number;
  agencyManagersUnderCount?: number;
  totalTeamBusiness?: number;
}): AgentTitleInfo {
  const {
    ownPoliciesCount = 0,
    ownPremium = 0,
    activeDownlineCount = 0,
    agencyManagersUnderCount = 0,
    totalTeamBusiness = 0,
  } = stats;

  const totalBusiness = Math.max(ownPremium, totalTeamBusiness);

  // Chief Agency Manager (CAM): Cross 3.5 Crore (35,000,000)
  if (totalBusiness >= 35000000) {
    return {
      code: 'CAM',
      name: 'Chief Agency Manager (CAM)',
      shortName: 'Chief AM',
      badgeTone: 'gold',
      description: 'Supreme executive agency cadre. Exceeded NPR 3.5 Crore milestone.',
    };
  }

  // Star Agency Manager: 1 Crore (10,000,000) with team business
  if (totalBusiness >= 10000000) {
    return {
      code: 'STAR_AM',
      name: 'Star Agency Manager',
      shortName: 'Star AM',
      badgeTone: 'gold',
      description: 'NPR 1 Crore+ executive business cadre achieved.',
      nextTitle: {
        name: 'Chief Agency Manager (CAM)',
        requirement: `NPR ${Number(35000000 - totalBusiness).toLocaleString('en-IN')} remaining to cross NPR 3.5 Crore`,
      },
    };
  }

  // Senior Agency Manager (SAM): Active agents > 15, 3 AMs under tree, team business >= 60 Lakhs (6,000,000)
  if (activeDownlineCount >= 15 && agencyManagersUnderCount >= 3 && totalBusiness >= 6000000) {
    return {
      code: 'SAM',
      name: 'Senior Agency Manager (SAM)',
      shortName: 'Senior AM',
      badgeTone: 'purple',
      description: '15+ active producers, 3 AMs developed, NPR 60 Lakhs+ team business.',
      nextTitle: {
        name: 'Star Agency Manager',
        requirement: `NPR ${Number(10000000 - totalBusiness).toLocaleString('en-IN')} remaining to reach NPR 1 Crore`,
      },
    };
  }

  // Agency Manager (AM): 3 active downlines + 3 Lakhs (300,000) personal collected in fiscal year
  if (activeDownlineCount >= 3 && ownPremium >= 300000) {
    return {
      code: 'AM',
      name: 'Agency Manager (AM)',
      shortName: 'Agency Manager',
      badgeTone: 'blue',
      description: '3+ active downlines with NPR 3 Lakhs+ personal collection.',
      nextTitle: {
        name: 'Senior Agency Manager (SAM)',
        requirement: '15 active agents, 3 AMs in tree, and NPR 60 Lakhs team business',
      },
    };
  }

  // Insurance Advisor (IA): 5 policies with 2 Lakhs (200,000) premium
  if (ownPoliciesCount >= 5 && ownPremium >= 200000) {
    return {
      code: 'IA',
      name: 'Insurance Advisor',
      shortName: 'Insurance Advisor',
      badgeTone: 'emerald',
      description: '5+ issued policies with NPR 2 Lakhs+ personal premium.',
      nextTitle: {
        name: 'Agency Manager (AM)',
        requirement: '3 active agents in downline & NPR 3 Lakhs personal collection',
      },
    };
  }

  // Field Representative (FR): 2 policies with 1 Lakh (100,000) premium
  if (ownPoliciesCount >= 2 && ownPremium >= 100000) {
    return {
      code: 'FR',
      name: 'Field Representative',
      shortName: 'Field Rep',
      badgeTone: 'amber',
      description: '2+ policies with NPR 1 Lakh+ premium.',
      nextTitle: {
        name: 'Insurance Advisor',
        requirement: '5 policies and NPR 2 Lakhs premium',
      },
    };
  }

  // Ordinary Agent (OA): Base rank
  return {
    code: 'OA',
    name: 'Ordinary Agent',
    shortName: 'Ordinary Agent',
    badgeTone: 'slate',
    description: 'Foundation rank. Issue 2 policies with NPR 1 Lakh premium to become Field Representative.',
    nextTitle: {
      name: 'Field Representative',
      requirement: '2 policies with NPR 1 Lakh premium',
    },
  };
}

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
export type CompanyRateMap = Record<string, Partial<Record<'TDI' | 'BDI', Partial<Record<Layer, number>>>>>;
export function calcIncentive(rows: any[], kind: 'TDI' | 'BDI', companyRates: CompanyRateMap = {}) {
  const by: Record<Layer, { count: number; raw: number; weighted: number; credit: number }> = {
    A: { count: 0, raw: 0, weighted: 0, credit: 0 }, B: { count: 0, raw: 0, weighted: 0, credit: 0 },
    C: { count: 0, raw: 0, weighted: 0, credit: 0 }, D: { count: 0, raw: 0, weighted: 0, credit: 0 },
  };
  for (const r of rows) {
    const b = by[r.layer as Layer];
    if (!b) continue;
    const amount = weighted(r);
    const rates = companyRates[String(r.company || '').toLowerCase()]?.[kind] || {};
    const rate = rates[r.layer as Layer] ?? LAYER_RATES[kind][r.layer as Layer];
    b.count++; b.raw += Number(r.premium || 0); b.weighted += amount; b.credit += amount * rate;
  }
  let totalWeighted = 0, totalCredit = 0;
  for (const l of LAYERS) { totalWeighted += by[l].weighted; totalCredit += by[l].credit; }
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
