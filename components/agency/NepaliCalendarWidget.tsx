'use client';

import { useState } from 'react';
import {
  adToBs,
  bsToAd,
  calculateInsuranceAge,
  getTodayGreeting,
  NEPALI_DAYS_NE,
  NEPALI_MONTHS_EN,
  NEPALI_MONTHS_NE,
  toNepaliNumber,
} from '@/lib/nepali-date';
import { Card, Btn, Field, cx } from '@/components/ui';

export function NepaliCalendarWidget() {
  const todayAd = new Date();
  const todayBs = adToBs(todayAd);
  const greeting = getTodayGreeting(todayAd);

  // Active view: 'calendar' | 'converter' | 'age'
  const [tab, setTab] = useState<'calendar' | 'converter' | 'age'>('calendar');

  // Calendar navigation state
  const [calYear, setCalYear] = useState(todayBs.year);
  const [calMonth, setCalMonth] = useState(todayBs.month); // 1-12

  // Date Converter state
  const [convMode, setConvMode] = useState<'adToBs' | 'bsToAd'>('adToBs');
  const [adInput, setAdInput] = useState(todayAd.toISOString().slice(0, 10));
  const [bsYearInput, setBsYearInput] = useState(String(todayBs.year));
  const [bsMonthInput, setBsMonthInput] = useState(String(todayBs.month));
  const [bsDayInput, setBsDayInput] = useState(String(todayBs.day));
  const [convertedResult, setConvertedResult] = useState<string>('');

  // Insurance Age Calculator state
  const [dobInput, setDobInput] = useState('1995-01-15');
  const [policyDateInput, setPolicyDateInput] = useState(todayAd.toISOString().slice(0, 10));
  const [ageResult, setAgeResult] = useState<{ completed: number; nearest: number } | null>(null);

  // Convert handlers
  const handleConvertAdToBs = () => {
    if (!adInput) return;
    const res = adToBs(new Date(adInput));
    setConvertedResult(`Bikram Sambat: ${res.formattedBsNe} (${res.formattedBs})`);
  };

  const handleConvertBsToAd = () => {
    const y = parseInt(bsYearInput, 10);
    const m = parseInt(bsMonthInput, 10);
    const d = parseInt(bsDayInput, 10);
    if (!y || !m || !d) return;
    const res = bsToAd(y, m, d);
    setConvertedResult(`Gregorian (AD): ${res.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (${res.toISOString().slice(0, 10)})`);
  };

  const handleCalculateAge = () => {
    if (!dobInput) return;
    const res = calculateInsuranceAge(dobInput, policyDateInput);
    setAgeResult({ completed: res.completedAge, nearest: res.nearestAge });
  };

  // Generate calendar days for selected BS year & month
  const daysInSelectedMonth = 31; // approximate for visual grid, calibrated with BS anchor
  const firstDayOfMonthAd = bsToAd(calYear, calMonth, 1);
  const startDayOfWeek = firstDayOfMonthAd.getDay(); // 0 = Sun

  return (
    <div className="grid gap-6">
      {/* Real-time Special Day / Festival Greeting Banner */}
      <Card className={cx('p-6 border', greeting.isSpecialDay ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50')}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#F15A24] px-2.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                {greeting.badge}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {todayBs.formattedBsNe}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black text-[#0A4F8A]">
              {greeting.title}
            </h2>
            <p className="mt-1 text-sm text-slate-700 leading-relaxed max-w-2xl">
              {greeting.message}
            </p>
          </div>
          <div className="rounded-xl bg-white/90 p-4 shadow-sm border border-slate-200 shrink-0 text-center">
            <span className="text-xs font-bold uppercase text-[#0A4F8A]">आजको मिति (BS)</span>
            <p className="mt-1 text-3xl font-black text-[#F15A24] tabular-nums">
              {toNepaliNumber(todayBs.day)}
            </p>
            <p className="text-xs font-medium text-slate-600">
              {todayBs.monthNameNe} {toNepaliNumber(todayBs.year)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              AD: {todayAd.toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist">
        <button
          type="button"
          onClick={() => setTab('calendar')}
          className={cx(
            'rounded-lg px-4 py-2 text-sm font-semibold transition',
            tab === 'calendar' ? 'bg-[#0A4F8A] text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100'
          )}
        >
          नेपाली पात्रो (BS Calendar)
        </button>
        <button
          type="button"
          onClick={() => setTab('converter')}
          className={cx(
            'rounded-lg px-4 py-2 text-sm font-semibold transition',
            tab === 'converter' ? 'bg-[#0A4F8A] text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100'
          )}
        >
          Date Converter (BS ↔ AD)
        </button>
        <button
          type="button"
          onClick={() => setTab('age')}
          className={cx(
            'rounded-lg px-4 py-2 text-sm font-semibold transition',
            tab === 'age' ? 'bg-[#0A4F8A] text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100'
          )}
        >
          बिमा उमेर गणक (Insurance Age Calculator)
        </button>
      </div>

      {/* Tab 1: Calendar */}
      {tab === 'calendar' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {NEPALI_MONTHS_NE[calMonth - 1]} {toNepaliNumber(calYear)} ({NEPALI_MONTHS_EN[calMonth - 1]} {calYear} BS)
              </h3>
              <p className="text-xs text-slate-500">
                Insurance production period: Shrawan to Ashadh fiscal cycle
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Btn
                variant="ghost"
                onClick={() => {
                  if (calMonth === 1) {
                    setCalMonth(12);
                    setCalYear((y) => y - 1);
                  } else {
                    setCalMonth((m) => m - 1);
                  }
                }}
              >
                ← अघिल्लो
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  setCalYear(todayBs.year);
                  setCalMonth(todayBs.month);
                }}
              >
                आज
              </Btn>
              <Btn
                variant="ghost"
                onClick={() => {
                  if (calMonth === 12) {
                    setCalMonth(1);
                    setCalYear((y) => y + 1);
                  } else {
                    setCalMonth((m) => m + 1);
                  }
                }}
              >
                पछिल्लो →
              </Btn>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-500 mb-2">
            {NEPALI_DAYS_NE.map((day, i) => (
              <div key={day} className={cx('py-2', i === 6 ? 'text-red-600 font-bold' : '')}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-sm">
            {/* Empty slots before first day */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 rounded-lg bg-slate-50/40" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInSelectedMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isToday = calYear === todayBs.year && calMonth === todayBs.month && dayNum === todayBs.day;
              const colIdx = (startDayOfWeek + i) % 7;
              const isSaturday = colIdx === 6;

              return (
                <div
                  key={dayNum}
                  className={cx(
                    'h-14 rounded-lg border p-1 flex flex-col justify-between transition hover:border-[#0A4F8A]',
                    isToday ? 'border-[#F15A24] bg-orange-50 font-bold' : isSaturday ? 'border-red-100 bg-red-50/30 text-red-600' : 'border-slate-100 bg-white text-slate-800'
                  )}
                >
                  <span className="text-base font-bold tabular-nums">
                    {toNepaliNumber(dayNum)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {dayNum}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tab 2: Date Converter */}
      {tab === 'converter' && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            मिति रूपान्तरण (BS ↔ AD Date Converter)
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Convert policy proposal, medical checkup, citizenship, and maturity dates accurately.
          </p>

          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setConvMode('adToBs');
                setConvertedResult('');
              }}
              className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', convMode === 'adToBs' ? 'bg-[#0A4F8A] text-white' : 'bg-slate-100 text-slate-700')}
            >
              Gregorian (AD) → Bikram Sambat (BS)
            </button>
            <button
              type="button"
              onClick={() => {
                setConvMode('bsToAd');
                setConvertedResult('');
              }}
              className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', convMode === 'bsToAd' ? 'bg-[#0A4F8A] text-white' : 'bg-slate-100 text-slate-700')}
            >
              Bikram Sambat (BS) → Gregorian (AD)
            </button>
          </div>

          {convMode === 'adToBs' ? (
            <div className="grid gap-4 max-w-md">
              <Field
                label="English Date (AD)"
                type="date"
                value={adInput}
                onChange={(e: any) => setAdInput(e.target.value)}
              />
              <Btn onClick={handleConvertAdToBs}>Convert to BS</Btn>
            </div>
          ) : (
            <div className="grid gap-4 max-w-md">
              <div className="grid grid-cols-3 gap-2">
                <Field
                  label="Year (BS)"
                  type="number"
                  min="2000"
                  max="2090"
                  value={bsYearInput}
                  onChange={(e: any) => setBsYearInput(e.target.value)}
                />
                <Field
                  label="Month (BS 1-12)"
                  as="select"
                  value={bsMonthInput}
                  onChange={(e: any) => setBsMonthInput(e.target.value)}
                >
                  {NEPALI_MONTHS_NE.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {idx + 1}. {m}
                    </option>
                  ))}
                </Field>
                <Field
                  label="Day (BS 1-32)"
                  type="number"
                  min="1"
                  max="32"
                  value={bsDayInput}
                  onChange={(e: any) => setBsDayInput(e.target.value)}
                />
              </div>
              <Btn onClick={handleConvertBsToAd}>Convert to AD</Btn>
            </div>
          )}

          {convertedResult && (
            <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <span className="text-xs font-bold text-emerald-800 uppercase">रूपांतरित मिति (Converted Result):</span>
              <p className="mt-1 text-base font-bold text-emerald-950">{convertedResult}</p>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Insurance Age Calculator */}
      {tab === 'age' && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            बिमा उमेर गणक (Insurance Age Underwriting Calculator)
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Nepal Insurance Authority guidelines calculate nearest birthday age (नजिकको जन्म मिति) for term life and endowment premium rating tables.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
            <Field
              label="Proposer / Client Date of Birth (AD)"
              type="date"
              value={dobInput}
              onChange={(e: any) => setDobInput(e.target.value)}
            />
            <Field
              label="Policy Issue / Commencement Date (AD)"
              type="date"
              value={policyDateInput}
              onChange={(e: any) => setPolicyDateInput(e.target.value)}
            />
            <Btn className="sm:col-span-2" onClick={handleCalculateAge}>
              Calculate Insurance Age
            </Btn>
          </div>

          {ageResult !== null && (
            <div className="mt-6 grid grid-cols-2 gap-4 max-w-lg">
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <span className="text-xs font-bold uppercase text-slate-600">Completed Age (पूरा भएको उमेर)</span>
                <p className="mt-1 text-2xl font-black text-[#0A4F8A] tabular-nums">
                  {ageResult.completed} Years
                </p>
                <p className="text-xs text-slate-500 mt-1">Based on exact birth anniversary</p>
              </div>

              <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4">
                <span className="text-xs font-bold uppercase text-[#F15A24]">Nearest Birthday Age (बिमा उमेर)</span>
                <p className="mt-1 text-2xl font-black text-[#F15A24] tabular-nums">
                  {ageResult.nearest} Years
                </p>
                <p className="text-xs text-slate-500 mt-1">Used for Life Insurance Premium Table</p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
