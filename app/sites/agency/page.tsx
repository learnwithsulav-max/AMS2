'use client';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { AuthCard } from '@/components/AuthCard';
import { Btn, Card } from '@/components/ui';
import { Kanban } from '@/components/agency/Kanban';
import { Plans } from '@/components/agency/Plans';
import { Calculator } from '@/components/agency/Calculator';
import { Schemes } from '@/components/agency/Schemes';
import { Profile } from '@/components/agency/Profile';
import { PublicPortfolio } from '@/components/agency/PublicPortfolio';
import { MfaGate } from '@/components/MfaGate';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AgencyInsights } from '@/components/agency/AgencyInsights';
import { AgencyFeedback } from '@/components/agency/AgencyFeedback';
import { TeamNetwork } from '@/components/agency/TeamNetwork';
import { NepaliCalendarWidget } from '@/components/agency/NepaliCalendarWidget';
import { MarketingKit } from '@/components/agency/MarketingKit';
import { calculateAgentTitle } from '@/lib/rules';
import { siteUrl } from '@/lib/brand';
import { AgentDashboard } from '@/components/agency/AgentDashboard';
import { PortalSidebar, type PortalNavGroup } from '@/components/PortalSidebar';

const TABS = [
  { k: 'overview', l: 'Dashboard' },
  { k: 'leads', l: 'Leads' },
  { k: 'plans', l: 'Plans & Policies' },
  { k: 'tdi', l: 'TDI & BDI Calculator', premium: true },
  { k: 'team', l: 'Team Network & Titles', premium: true },
  { k: 'scheme', l: 'Monthly Schemes', premium: true },
  { k: 'calendar', l: 'नेपाली पात्रो & Converter' },
  { k: 'marketing', l: 'Marketing & Banners' },
  { k: 'profile', l: 'Profile & Cadre' },
  { k: 'portfolio', l: 'Public Portfolio' },
  { k: 'insights', l: 'Insights & Leaderboard' },
  { k: 'feedback', l: 'Feedback' },
];

const MENU_GROUPS: PortalNavGroup[] = [
  { label: 'Workspace', items: [{ id: 'overview', label: 'Dashboard' }] },
  { label: 'Sales & clients', items: [{ id: 'leads', label: 'Leads' }, { id: 'plans', label: 'Plans & Policies' }, { id: 'team', label: 'Team Network & Titles', badge: 'Premium' }] },
  { label: 'Tools', items: [{ id: 'tdi', label: 'TDI & BDI Calculator', badge: 'Premium' }, { id: 'scheme', label: 'Monthly Schemes', badge: 'Premium' }, { id: 'calendar', label: 'Nepali Calendar' }, { id: 'marketing', label: 'Marketing & Banners' }, { id: 'insights', label: 'Insights & Leaderboard' }] },
  { label: 'My profile', items: [{ id: 'profile', label: 'Profile & Cadre' }, { id: 'portfolio', label: 'Public Portfolio' }, { id: 'feedback', label: 'Feedback' }] },
];

export default function Agency() {
  const { session, profile, loading, signOut, reload } = useAuth();
  const [tab, setTab] = useState('overview');
  const [subscription, setSubscription] = useState<any>(null);
  const [policiesCount, setPoliciesCount] = useState(0);
  const [policiesPremium, setPoliciesPremium] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('agency_subscriptions')
      .select('plan,status,trial_ends_at,period_ends_at')
      .eq('agent_id', profile.id)
      .maybeSingle()
      .then(({ data }) => setSubscription(data));

    supabase
      .from('policies')
      .select('premium')
      .eq('agent_id', profile.id)
      .then(({ data }) => {
        const rows = data || [];
        setPoliciesCount(rows.length);
        setPoliciesPremium(rows.reduce((s, p) => s + Number(p.premium || 0), 0));
      });
  }, [profile?.id]);

  if (loading)
    return (
      <Shell site="agency">
        <p className="p-10 text-center text-slate-500">Loading...</p>
      </Shell>
    );
  if (!session)
    return (
      <Shell site="agency">
        <AuthCard title="Learn With Sulav · Agent Portal" />
      </Shell>
    );
  if (profile?.portal_type === 'exam_candidate')
    return (
      <Shell site="agency" right={<Btn variant="ghost" onClick={signOut}>Log out</Btn>}>
        <Card className="mx-auto my-16 max-w-md p-8 text-center">
          <h1 className="text-xl font-bold">Agent account required</h1>
          <p className="mt-2 text-slate-600">This account is registered for the exam portal. Use an agent account to continue here.</p>
        </Card>
      </Shell>
    );
  if (!profile)
    return (
      <Shell site="agency" right={<Btn variant="ghost" onClick={signOut}>Log out</Btn>}>
        <p className="p-10 text-center text-slate-600">Setting up your profile. Refresh in a moment.</p>
      </Shell>
    );

  const trialActive =
    subscription?.plan === 'trial' &&
    subscription?.status === 'trial' &&
    new Date(subscription.trial_ends_at).getTime() > Date.now();
  const paidActive =
    subscription?.status === 'active' &&
    subscription?.period_ends_at &&
    new Date(subscription.period_ends_at).getTime() > Date.now();
  const premium = profile.membership === 'premium' || profile.role === 'admin' || trialActive || paidActive;
  const current = TABS.find((x) => x.k === tab) || TABS[0];
  const locked = current.premium && !premium;

  const titleInfo = calculateAgentTitle({
    ownPoliciesCount: policiesCount,
    ownPremium: policiesPremium,
  });

  return (
    <Shell
      site="agency"
      right={
        <div className="flex items-center gap-3">
          <Btn variant="ghost" onClick={signOut}>
            Log out
          </Btn>
        </div>
      }
    >
      <MfaGate>
        <div className="mx-auto max-w-[1500px] px-4 py-6">
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm shadow-sm">
            <span>
              {trialActive
                ? `Free trial · ${Math.max(
                    0,
                    Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000)
                  )} day(s) left · maximum 5 policies`
                : subscription?.status === 'active'
                ? `Agency ${subscription.plan} · active through ${new Date(subscription.period_ends_at).toLocaleDateString()}`
                : 'Agency access requires an active package.'}
            </span>
            <a href="/billing" className="font-bold text-[#F15A24] underline">
              Subscription & Billing
            </a>
          </div>

          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <PortalSidebar
              name={profile.name}
              email={session.user.email}
              photo={profile.avatar_url}
              role={titleInfo.shortName || 'Agent'}
              groups={MENU_GROUPS.map((group) => ({
                ...group,
                items: group.items.map((item) => {
                  const tabInfo = TABS.find((candidate) => candidate.k === item.id);
                  return tabInfo?.premium && !premium ? { ...item, badge: 'Premium' } : item;
                }),
              }))}
              active={tab}
              onSelect={setTab}
            />
            <div className="min-w-0 flex-1">
          {locked ? (
            <Card className="mx-auto max-w-lg p-8 text-center">
              <h2 className="text-xl font-bold">Premium feature</h2>
              <p className="mt-2 text-slate-600">
                {current.l} is part of premium membership. Message Sulav on WhatsApp to activate your account.
              </p>
            </Card>
          ) : tab === 'overview' ? (
            <AgentDashboard profile={profile} subscription={subscription} onNavigate={setTab} />
          ) : tab === 'leads' ? (
            <Kanban uid={profile.id} />
          ) : tab === 'plans' ? (
            <Plans uid={profile.id} />
          ) : tab === 'tdi' ? (
            <Calculator uid={profile.id} />
          ) : tab === 'team' ? (
            <TeamNetwork uid={profile.id} />
          ) : tab === 'scheme' ? (
            <Schemes uid={profile.id} />
          ) : tab === 'calendar' ? (
            <NepaliCalendarWidget />
          ) : tab === 'marketing' ? (
            <MarketingKit
              profile={profile}
              url={typeof window !== 'undefined' ? `${window.location.origin}/${profile.id}` : `${siteUrl('agency')}/${profile.id}`}
            />
          ) : tab === 'profile' ? (
            <Profile profile={profile} reload={reload} />
          ) : tab === 'portfolio' ? (
            <PublicPortfolio profile={profile} />
          ) : tab === 'insights' ? (
            <AgencyInsights uid={profile.id} />
          ) : (
            <AgencyFeedback uid={profile.id} />
          )}
            </div>
          </div>
        </div>
      </MfaGate>
    </Shell>
  );
}
