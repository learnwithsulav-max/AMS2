import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { admin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { response } = await requireAdmin(request);
  if (response) return response;
  const { data, error } = await admin.rpc('admin_health_stats');
  if (error) {
    console.error('Admin health summary failed:', error.message);
    return NextResponse.json({ error: 'System health summary is unavailable.' }, { status: 503 });
  }
  return NextResponse.json({ stats: data });
}
