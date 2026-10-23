'use client';
import { Shell } from '@/components/Shell';
import { AuthCard } from '@/components/AuthCard';
import { MfaGate } from '@/components/MfaGate';
import { Billing } from '@/components/agency/Billing';
import { useAuth } from '@/lib/auth';

export default function AgencyBillingPage(){const {session,loading}=useAuth();if(loading)return <Shell site="agency"><p className="p-10 text-center">Loading…</p></Shell>;if(!session)return <Shell site="agency"><AuthCard title="Agent portal"/></Shell>;return <Shell site="agency"><MfaGate><Billing/></MfaGate></Shell>}
