'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LAYERS, LAYER_LABEL, LAYER_RATES, calcIncentive, monthEnd, monthStart, npr, weightPct, weighted, type CompanyRateMap } from '@/lib/rules';
import { Btn, Card, Field } from '../ui';
import { jsPDF } from 'jspdf';
import { ALL_INSURANCE_COMPANIES } from '@/lib/nepali-companies';
import { BRAND } from '@/lib/brand';

export function Calculator({ uid }: { uid: string }) {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());
  const [rows, setRows] = useState<any[]>([]);
  const [companyRates, setCompanyRates] = useState<CompanyRateMap>({});
  const [err, setErr] = useState('');
  const [sim, setSim] = useState<any>({ premium: 100000, premium_mode: 'single', term_years: 10 });

  // Formal Quotation with Official Logo Stamp
  const [quoteData, setQuoteData] = useState({
    clientName: 'Suman Shrestha',
    clientAge: '32',
    company: 'Nepal Life Insurance Co. Ltd.',
    planName: 'Endowment Life Plan with Bonus',
    sumAssured: '1000000',
    termYears: '15',
    premiumMode: 'regular',
    annualPremium: '72500',
    bonusRate: '65', // NPR 65 per thousand
  });

  async function run() {
    setErr('');
    const [{ data, error }, { data: config }] = await Promise.all([
      supabase.rpc('team_production_company', { root: uid, d_from: from, d_to: to }),
      supabase.from('company_rules').select('company,tdi_rules,bdi_rules'),
    ]);
    if (error) setErr(error.message);
    else setRows(data || []);

    const parsed: CompanyRateMap = {};
    for (const row of config || []) {
      const normalize = (value: any) =>
        Object.fromEntries(
          Object.entries(value || {})
            .filter(([key, rate]) => ['A', 'B', 'C', 'D'].includes(key) && Number.isFinite(Number(rate)))
            .map(([key, rate]) => [key, Number(rate) / 100])
        );
      parsed[String(row.company).toLowerCase()] = { TDI: normalize(row.tdi_rules), BDI: normalize(row.bdi_rules) };
    }
    setCompanyRates(parsed);
  }

  useEffect(() => {
    run();
    /* eslint-disable-next-line */
  }, []);

  const tdi = calcIncentive(rows, 'TDI', companyRates);
  const bdi = calcIncentive(rows, 'BDI', companyRates);
  const agents: Record<string, any> = {};
  for (const r of rows) {
    const a = (agents[r.agent_id] ||= { name: r.agent_name, layer: r.layer, raw: 0, w: 0 });
    a.raw += Number(r.premium);
    a.w += weighted(r);
  }

  // Generate Official Branded Quotation with Logo Stamp
  async function downloadQuotationPdf() {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header Navy Ribbon
    pdf.setFillColor(10, 79, 138);
    pdf.rect(0, 0, 210, 36, 'F');
    pdf.setFillColor(241, 90, 36);
    pdf.rect(0, 36, 210, 2.5, 'F');

    // Load Logo for stamp
    const logoImg = await new Promise<HTMLImageElement | null>((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = '/logo.png';
    });

    if (logoImg) {
      pdf.addImage(logoImg, 'PNG', 14, 5, 26, 26);
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LEARN WITH SULAV', logoImg ? 44 : 14, 18);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Life Insurance Premium & Benefit Quotation', logoImg ? 44 : 14, 25);
    pdf.setFontSize(8);
    pdf.text('Smart Tools, Training & Coaching · Managed by Sulav Sapkota', logoImg ? 44 : 14, 30);

    // Client & Proposal Block
    pdf.setTextColor(45, 55, 72);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROPOSAL & CLIENT DETAILS', 14, 50);

    pdf.setFillColor(247, 250, 252);
    pdf.roundedRect(14, 54, 182, 36, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    pdf.text(`Client Name: ${quoteData.clientName}`, 20, 62);
    pdf.text(`Age: ${quoteData.clientAge} Years`, 120, 62);
    pdf.text(`Company: ${quoteData.company}`, 20, 70);
    pdf.text(`Plan: ${quoteData.planName}`, 120, 70);
    pdf.text(`Policy Term: ${quoteData.termYears} Years`, 20, 78);
    pdf.text(`Premium Mode: ${quoteData.premiumMode.toUpperCase()}`, 120, 78);
    pdf.text(`Date of Quotation: ${new Date().toLocaleDateString('en-GB')}`, 20, 86);
    pdf.text(`Quote Ref: LWS-Q-${Date.now().toString().slice(-6)}`, 120, 86);

    // Financial Analysis Table
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PREMIUM & MATURITY BENEFIT ILLUSTRATION', 14, 102);

    const sa = Number(quoteData.sumAssured || 0);
    const prem = Number(quoteData.annualPremium || 0);
    const term = Number(quoteData.termYears || 0);
    const totalDeposited = prem * (quoteData.premiumMode === 'single' ? 1 : term);
    const bonusPerYear = (sa * Number(quoteData.bonusRate || 0)) / 1000;
    const totalEstBonus = bonusPerYear * term;
    const estMaturityValue = sa + totalEstBonus;

    pdf.setFillColor(10, 79, 138);
    pdf.rect(14, 106, 182, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.text('Particulars', 20, 111.5);
    pdf.text('Illustrative Value (NPR)', 140, 111.5);

    pdf.setTextColor(45, 55, 72);
    const rowsList = [
      ['Sum Assured (बिमांक रकम)', `NPR ${sa.toLocaleString('en-IN')}`],
      ['Estimated Annual Premium (वार्षिक प्रिमियम)', `NPR ${prem.toLocaleString('en-IN')}`],
      ['Total Estimated Deposit across Term', `NPR ${totalDeposited.toLocaleString('en-IN')}`],
      ['Estimated Company Bonus Rate', `NPR ${quoteData.bonusRate} per thousand/year`],
      ['Total Estimated Bonus at Maturity (कुल अनुमानित बोनस)', `NPR ${totalEstBonus.toLocaleString('en-IN')}`],
      ['Estimated Total Maturity Payout (बिमांक + कुल बोनस)', `NPR ${estMaturityValue.toLocaleString('en-IN')}`],
    ];

    rowsList.forEach(([label, val], idx) => {
      const y = 122 + idx * 9;
      if (idx % 2 === 0) {
        pdf.setFillColor(247, 250, 252);
        pdf.rect(14, y - 6, 182, 9, 'F');
      }
      pdf.setFont('helvetica', idx === 5 ? 'bold' : 'normal');
      pdf.text(label, 20, y);
      pdf.text(val, 140, y);
    });

    // Official Learn With Sulav STAMP / SEAL
    pdf.setDrawColor(241, 90, 36);
    pdf.setLineWidth(1);
    pdf.circle(165, 215, 22, 'S');
    pdf.setLineWidth(0.4);
    pdf.circle(165, 215, 20, 'S');

    if (logoImg) {
      pdf.addImage(logoImg, 'PNG', 154, 202, 13, 13);
    }
    pdf.setTextColor(241, 90, 36);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LEARN WITH SULAV', 150, 218);
    pdf.setFontSize(5);
    pdf.text('VERIFIED QUOTATION', 149, 222);
    pdf.text('OFFICIAL ADVISOR SEAL', 147, 225);

    // Advisor signature & contact note
    pdf.setTextColor(45, 55, 72);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Authorized Financial Advisor:', 14, 210);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Agent ID: ${uid}`, 14, 216);
    pdf.text('Learn With Sulav Advisor Network', 14, 221);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text('Direct WhatsApp consultation available through your advisor profile.', 14, 227);

    // Disclaimer
    pdf.setFontSize(7);
    pdf.setTextColor(113, 128, 150);
    pdf.text(
      'Disclaimer: This quotation is an illustrative financial calculation based on stated premium and declared bonus assumptions. Official policy issuance, medical underwriting, and final benefit settlement are governed strictly by the respective Insurance Company in Nepal.',
      14,
      250,
      { maxWidth: 182 }
    );

    // Footer
    pdf.setDrawColor(226, 232, 240);
    pdf.line(14, 270, 196, 270);
    pdf.setFontSize(8);
    pdf.text(BRAND.trustBadge, 14, 276);
    pdf.text('Page 1 of 1', 180, 276);

    pdf.save(`LWS-Quotation-${quoteData.clientName.replace(/\s+/g, '-')}.pdf`);
  }

  return (
    <div className="grid gap-6">
      {/* Official Quotation Generator with Logo Stamp */}
      <Card className="p-6 border border-blue-200 bg-gradient-to-br from-white to-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#F15A24]" />
              <h2 className="text-xl font-bold text-[#0A4F8A]">Official Client Quotation Generator</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Generate and download formal client quotations stamped with the verified Learn With Sulav logo seal.
            </p>
          </div>
          <Btn onClick={downloadQuotationPdf}>Download Stamped Quotation PDF</Btn>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Client Name"
            value={quoteData.clientName}
            onChange={(e: any) => setQuoteData({ ...quoteData, clientName: e.target.value })}
          />
          <Field
            label="Client Age"
            type="number"
            value={quoteData.clientAge}
            onChange={(e: any) => setQuoteData({ ...quoteData, clientAge: e.target.value })}
          />

          <div className="grid gap-1 text-sm font-medium">
            <label htmlFor="quote-company">Insurance Company</label>
            <select
              id="quote-company"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0A4F8A] focus:outline-none"
              value={quoteData.company}
              onChange={(e) => setQuoteData({ ...quoteData, company: e.target.value })}
            >
              {ALL_INSURANCE_COMPANIES.filter((c) => c.type === 'life').map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <Field
            label="Sum Assured (NPR)"
            type="number"
            value={quoteData.sumAssured}
            onChange={(e: any) => setQuoteData({ ...quoteData, sumAssured: e.target.value })}
          />
          <Field
            label="Annual Premium (NPR)"
            type="number"
            value={quoteData.annualPremium}
            onChange={(e: any) => setQuoteData({ ...quoteData, annualPremium: e.target.value })}
          />
          <Field
            label="Term (Years)"
            type="number"
            value={quoteData.termYears}
            onChange={(e: any) => setQuoteData({ ...quoteData, termYears: e.target.value })}
          />
        </div>
      </Card>

      {/* TDI & BDI Incentive Calculation */}
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="From Date" type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} />
        <Field label="To Date" type="date" value={to} onChange={(e: any) => setTo(e.target.value)} />
        <Btn onClick={run}>Calculate Incentives</Btn>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {([['TDI', 'Team Development Incentive', tdi], ['BDI', 'Business Development Incentive', bdi]] as const).map(
          ([k, name, r]) => (
            <Card key={k} className="p-5">
              <h3 className="font-bold text-slate-900">{name} ({k})</h3>
              <p className="mt-1 text-sm text-slate-600">Weighted premium {npr(r.totalWeighted)}</p>
              <p className="mt-3 text-3xl font-black text-[#0A4F8A] tabular-nums">{npr(r.totalCredit)}</p>
              <p className="text-xs text-slate-500">Qualifying credit after layer credit rates</p>
              <table className="mt-4 w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="py-1">Layer</th>
                    <th>Rate</th>
                    <th>Weighted</th>
                    <th className="text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {LAYERS.map((l) => (
                    <tr key={l} className="border-t border-slate-100">
                      <td className="py-1.5">{LAYER_LABEL[l]}</td>
                      <td>{LAYER_RATES[k][l] * 100}% default</td>
                      <td className="tabular-nums">{npr(r.by[l].weighted)}</td>
                      <td className="text-right font-semibold tabular-nums">{npr(r.by[l].credit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )
        )}
      </div>

      {/* Production by Team Member */}
      <Card className="overflow-x-auto p-5">
        <h3 className="mb-3 font-bold text-slate-900">Production by Team Member</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500 border-b">
            <tr>
              <th className="py-1">Advisor</th>
              <th>Layer</th>
              <th>Collected Premium</th>
              <th>Weighted Premium</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(agents).map((a: any, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-1.5 font-medium">{a.name}</td>
                <td>{a.layer}</td>
                <td className="tabular-nums">{npr(a.raw)}</td>
                <td className="tabular-nums font-bold text-[#0A4F8A]">{npr(a.w)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  No production in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Single Policy Weightage Simulator */}
      <Card className="p-5">
        <h3 className="mb-2 font-bold text-slate-900">Single Policy Weightage Simulator</h3>
        <p className="text-xs text-slate-500 mb-4">
          BDI / TDI / MDRT / Club / Scheme Rule: Regular plans count 100%. Single premium plans: 0-9 years count 20%, 10-14 years count 40%, 15+ years count 60%.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Premium (NPR)" type="number" value={sim.premium} onChange={(e: any) => setSim({ ...sim, premium: e.target.value })} />
          <Field label="Mode" as="select" value={sim.premium_mode} onChange={(e: any) => setSim({ ...sim, premium_mode: e.target.value })}>
            <option value="single">Single Premium</option>
            <option value="regular">Regular Premium</option>
          </Field>
          <Field label="Term (Years)" type="number" value={sim.term_years} onChange={(e: any) => setSim({ ...sim, term_years: e.target.value })} />
          <div className="self-end text-sm rounded-lg bg-slate-50 p-3 border">
            <p>Weightage Count: <b className="text-[#0A4F8A]">{weightPct(sim.premium_mode, Number(sim.term_years)) * 100}%</b></p>
            <p>Weighted Premium: <b className="text-[#F15A24]">{npr(weighted(sim))}</b></p>
          </div>
        </div>
      </Card>
    </div>
  );
}
