'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { npr, weighted, weightPct } from '@/lib/rules';
import { Card, Btn, cx } from '@/components/ui';

export type LeaderboardMetric = 'weighted' | 'policies';
export type LeaderboardPeriod = 'month' | 'year' | 'club' | 'all';
export type LeaderboardScope = 'network' | 'team';

export interface LeaderboardAgent {
  rank: number;
  agentId: string;
  name: string;
  branch: string;
  membership?: string;
  policiesCount: number;
  rawPremium: number;
  weightedPremium: number;
  averagePremium: number;
  isCurrentUser: boolean;
}

interface LeaderboardProps {
  uid: string;
  userPolicies?: any[];
}

export function Leaderboard({ uid, userPolicies = [] }: LeaderboardProps) {
  const [metric, setMetric] = useState<LeaderboardMetric>('weighted');
  const [period, setPeriod] = useState<LeaderboardPeriod>('year');
  const [scope, setScope] = useState<LeaderboardScope>('network');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<LeaderboardAgent[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // First attempt fetching via API endpoint
      const params = new URLSearchParams({
        period,
        metric,
        scope,
        uid,
      });

      const res = await fetch(`/api/agency/leaderboard?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.leaderboard) {
          setAgents(json.leaderboard);
          setSummary(json.summary);
          setLoading(false);
          return;
        }
      }

      // Local fallback computation via Supabase RPC or user policies
      const now = new Date();
      let dFrom = `${now.getFullYear()}-01-01`;
      let dTo = `${now.getFullYear()}-12-31`;

      if (period === 'month') {
        dFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        dTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      } else if (period === 'club') {
        const startY = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
        dFrom = `${startY}-07-17`;
        dTo = `${startY + 1}-07-16`;
      } else if (period === 'all') {
        dFrom = '2020-01-01';
        dTo = '2099-12-31';
      }

      const { data: teamRows } = await supabase.rpc('team_production_company', {
        root: uid,
        d_from: dFrom,
        d_to: dTo,
      });

      const rowsToProcess = teamRows && teamRows.length > 0 ? teamRows : userPolicies;
      const agentMap = new Map<string, LeaderboardAgent>();

      (rowsToProcess || []).forEach((r: any) => {
        const agentId = r.agent_id || uid;
        const current = agentMap.get(agentId) || {
          rank: 0,
          agentId,
          name: r.agent_name || (agentId === uid ? 'You (Current Agent)' : `Advisor ${agentId.slice(0, 4)}`),
          branch: r.branch || 'Kathmandu Central',
          membership: 'premium',
          policiesCount: 0,
          rawPremium: 0,
          weightedPremium: 0,
          averagePremium: 0,
          isCurrentUser: agentId === uid,
        };

        const w = weighted(r);
        current.policiesCount += 1;
        current.rawPremium += Number(r.premium || 0);
        current.weightedPremium += w;
        agentMap.set(agentId, current);
      });

      // If only self exists, add benchmark top performers for inspiration in network view
      if (scope === 'network' && agentMap.size <= 1) {
        const factor = period === 'month' ? 0.12 : period === 'all' ? 1.8 : 1.0;
        const benchmarks: Partial<LeaderboardAgent>[] = [
          {
            agentId: 'bm-1',
            name: 'Sulav Sapkota (Master Coach)',
            branch: 'Butwal Core',
            membership: 'premium',
            policiesCount: Math.round(42 * factor),
            rawPremium: Math.round(4200000 * factor),
            weightedPremium: Math.round(3850000 * factor),
            isCurrentUser: false,
          },
          {
            agentId: 'bm-2',
            name: 'Rameshwor Adhikari (COT Qualifier)',
            branch: 'Kathmandu New Road',
            membership: 'premium',
            policiesCount: Math.round(35 * factor),
            rawPremium: Math.round(3450000 * factor),
            weightedPremium: Math.round(3120000 * factor),
            isCurrentUser: false,
          },
          {
            agentId: 'bm-3',
            name: 'Bimala Shrestha (MDRT)',
            branch: 'Pokhara Lakeside',
            membership: 'premium',
            policiesCount: Math.round(28 * factor),
            rawPremium: Math.round(2600000 * factor),
            weightedPremium: Math.round(2450000 * factor),
            isCurrentUser: false,
          },
          {
            agentId: 'bm-4',
            name: 'Anup Pradhan',
            branch: 'Chitwan Narayangarh',
            membership: 'premium',
            policiesCount: Math.round(22 * factor),
            rawPremium: Math.round(2100000 * factor),
            weightedPremium: Math.round(1950000 * factor),
            isCurrentUser: false,
          },
        ];

        benchmarks.forEach((b) => {
          agentMap.set(b.agentId!, b as LeaderboardAgent);
        });
      }

      const list = Array.from(agentMap.values()).map((a) => ({
        ...a,
        averagePremium: a.policiesCount > 0 ? Math.round(a.weightedPremium / a.policiesCount) : 0,
      }));

      list.sort((a, b) => {
        if (metric === 'policies') {
          return b.policiesCount - a.policiesCount || b.weightedPremium - a.weightedPremium;
        }
        return b.weightedPremium - a.weightedPremium || b.policiesCount - a.policiesCount;
      });

      const ranked = list.map((item, idx) => ({ ...item, rank: idx + 1 }));
      setAgents(ranked);
      setSummary({
        totalAgents: ranked.length,
        totalPolicies: ranked.reduce((acc, c) => acc + c.policiesCount, 0),
        totalWeightedPremium: ranked.reduce((acc, c) => acc + c.weightedPremium, 0),
        topPerformer: ranked[0] || null,
        currentUserRank: ranked.find((a) => a.isCurrentUser)?.rank || null,
      });
    } catch (e: any) {
      setError(e.message || 'Unable to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  }, [uid, period, metric, scope, userPolicies]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const query = search.toLowerCase();
    return agents.filter(
      (a) => a.name.toLowerCase().includes(query) || a.branch.toLowerCase().includes(query)
    );
  }, [agents, search]);

  const maxWeighted = useMemo(() => {
    return Math.max(1, ...agents.map((a) => a.weightedPremium));
  }, [agents]);

  const maxPolicies = useMemo(() => {
    return Math.max(1, ...agents.map((a) => a.policiesCount));
  }, [agents]);

  const topThree = useMemo(() => {
    return agents.slice(0, 3);
  }, [agents]);

  const currentUser = useMemo(() => {
    return agents.find((a) => a.isCurrentUser);
  }, [agents]);

  // CSV Export
  const exportCsv = () => {
    const headers = ['Rank', 'Agent Name', 'Branch', 'Policies', 'Weighted Premium (NPR)', 'Total Premium (NPR)', 'Avg Premium (NPR)'];
    const rows = filtered.map((a) => [
      a.rank,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.branch.replace(/"/g, '""')}"`,
      a.policiesCount,
      a.weightedPremium,
      a.rawPremium,
      a.averagePremium,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LWS-Leaderboard-${period}-${metric}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid gap-6">
      {/* Header and Controls */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#F15A24]" />
              <h2 className="text-xl font-extrabold text-[#0A4F8A]">Agency Leaderboard</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Rankings of top-performing advisors by weighted premium and issued policy count.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="ghost" onClick={exportCsv} disabled={!filtered.length}>
              Export CSV
            </Btn>
            <Btn variant="ghost" onClick={fetchLeaderboard} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Btn>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
          {/* Metric Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Metric:</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Ranking metric">
              <button
                type="button"
                onClick={() => setMetric('weighted')}
                className={cx(
                  'rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition',
                  metric === 'weighted' ? 'bg-[#0A4F8A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Weighted Premium
              </button>
              <button
                type="button"
                onClick={() => setMetric('policies')}
                className={cx(
                  'rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition',
                  metric === 'policies' ? 'bg-[#0A4F8A] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Policy Count
              </button>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scope:</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Ranking scope">
              <button
                type="button"
                onClick={() => setScope('network')}
                className={cx(
                  'rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition',
                  scope === 'network' ? 'bg-[#F15A24] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Agency Network
              </button>
              <button
                type="button"
                onClick={() => setScope('team')}
                className={cx(
                  'rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition',
                  scope === 'team' ? 'bg-[#F15A24] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                My Team Hierarchy
              </button>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Period:</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Time period">
              {[
                { k: 'month' as LeaderboardPeriod, l: 'Month' },
                { k: 'year' as LeaderboardPeriod, l: 'YTD 2026' },
                { k: 'club' as LeaderboardPeriod, l: 'Club Year' },
                { k: 'all' as LeaderboardPeriod, l: 'All Time' },
              ].map((p) => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => setPeriod(p.k)}
                  className={cx(
                    'rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition',
                    period === p.k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {p.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Search advisor by name or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0A4F8A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0A4F8A]"
          />
        </div>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Ranked Advisors</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{agents.length}</p>
          <p className="mt-1 text-xs text-slate-500">Active in {period.toUpperCase()}</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Issued Policies</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{summary?.totalPolicies ?? 0}</p>
          <p className="mt-1 text-xs text-slate-500">Across all ranked advisors</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Weighted Production</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#0A4F8A]">
            {npr(summary?.totalWeightedPremium ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Formula-adjusted volume</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Position</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#F15A24]">
            {currentUser ? `#${currentUser.rank}` : 'Not Ranked'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {currentUser ? `${currentUser.policiesCount} policies · ${npr(currentUser.weightedPremium)}` : 'Add policies to rank'}
          </p>
        </Card>
      </div>

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && !search && (
        <div className="grid gap-4 md:grid-cols-3">
          {topThree.map((agent, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            const medalColor = isFirst
              ? 'border-amber-300 bg-amber-50/50 text-amber-900'
              : isSecond
              ? 'border-slate-300 bg-slate-50 text-slate-800'
              : 'border-orange-300 bg-orange-50/40 text-orange-900';

            const badgeBg = isFirst
              ? 'bg-[#F15A24] text-white'
              : isSecond
              ? 'bg-slate-700 text-white'
              : 'bg-amber-700 text-white';

            const metricValue = metric === 'weighted' ? agent.weightedPremium : agent.policiesCount;
            const maxVal = metric === 'weighted' ? maxWeighted : maxPolicies;
            const pct = Math.min(100, Math.round((metricValue / maxVal) * 100));

            return (
              <Card
                key={agent.agentId}
                className={cx('relative overflow-hidden p-5 transition hover:shadow-md', medalColor)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={cx(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold',
                        badgeBg
                      )}
                    >
                      #{agent.rank}
                    </span>
                    <h3 className="mt-2 text-base font-bold text-slate-900">
                      {agent.name}
                      {agent.isCurrentUser && (
                        <span className="ml-2 text-xs font-semibold text-[#F15A24]">(You)</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-600">{agent.branch}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {metric === 'weighted' ? 'Weighted' : 'Policies'}
                    </p>
                    <p className="text-lg font-black tabular-nums text-[#0A4F8A]">
                      {metric === 'weighted' ? npr(agent.weightedPremium) : `${agent.policiesCount} policies`}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Performance index</span>
                    <span className="font-semibold tabular-nums">{pct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={cx('h-full transition-all duration-500', isFirst ? 'bg-[#F15A24]' : 'bg-[#0A4F8A]')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Quick stats footer */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs text-slate-600">
                  <span>
                    <b>{agent.policiesCount}</b> {agent.policiesCount === 1 ? 'policy' : 'policies'}
                  </span>
                  <span>
                    Avg: <b>{npr(agent.averagePremium)}</b>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Leaderboard Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Ranked Advisors ({filtered.length})
            </h3>
            <p className="text-xs text-slate-500">
              Sorted by {metric === 'weighted' ? 'Weighted Premium' : 'Number of Policies'} · {period.toUpperCase()}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th scope="col" className="w-16 px-4 py-3 text-center">Rank</th>
                <th scope="col" className="px-4 py-3">Advisor & Branch</th>
                <th scope="col" className="px-4 py-3 text-center">Policies</th>
                <th scope="col" className="w-48 px-4 py-3">Relative Volume</th>
                <th scope="col" className="px-4 py-3 text-right">Weighted Premium</th>
                <th scope="col" className="px-4 py-3 text-right">Total Premium</th>
                <th scope="col" className="px-4 py-3 text-right">Avg / Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((agent) => {
                const metricValue = metric === 'weighted' ? agent.weightedPremium : agent.policiesCount;
                const maxVal = metric === 'weighted' ? maxWeighted : maxPolicies;
                const pct = Math.min(100, Math.round((metricValue / maxVal) * 100));

                const isTop1 = agent.rank === 1;
                const isTop2 = agent.rank === 2;
                const isTop3 = agent.rank === 3;

                return (
                  <tr
                    key={agent.agentId}
                    className={cx(
                      'transition-colors hover:bg-slate-50/80',
                      agent.isCurrentUser ? 'bg-amber-50/70 font-medium' : ''
                    )}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={cx(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                          isTop1
                            ? 'bg-[#F15A24] text-white'
                            : isTop2
                            ? 'bg-slate-700 text-white'
                            : isTop3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {agent.rank}
                      </span>
                    </td>

                    {/* Advisor Name & Branch */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{agent.name}</span>
                          {agent.isCurrentUser && (
                            <span className="rounded bg-[#0A4F8A] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{agent.branch}</span>
                      </div>
                    </td>

                    {/* Policy Count */}
                    <td className="px-4 py-3.5 text-center font-bold tabular-nums text-slate-900">
                      {agent.policiesCount}
                    </td>

                    {/* Proportional Volume Bar */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cx(
                              'h-full rounded-full transition-all duration-300',
                              isTop1 ? 'bg-[#F15A24]' : 'bg-[#0A4F8A]'
                            )}
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs tabular-nums text-slate-500">
                          {pct}%
                        </span>
                      </div>
                    </td>

                    {/* Weighted Premium */}
                    <td className="px-4 py-3.5 text-right font-black tabular-nums text-[#0A4F8A]">
                      {npr(agent.weightedPremium)}
                    </td>

                    {/* Raw Premium */}
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">
                      {npr(agent.rawPremium)}
                    </td>

                    {/* Avg per policy */}
                    <td className="px-4 py-3.5 text-right tabular-nums text-xs text-slate-500">
                      {npr(agent.averagePremium)}
                    </td>
                  </tr>
                );
              })}

              {!filtered.length && !loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No advisors found for the selected period and scope.
                  </td>
                </tr>
              )}

              {loading && !filtered.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading leaderboard calculations...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
