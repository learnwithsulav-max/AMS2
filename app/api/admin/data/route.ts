import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { admin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const TABLES = {
  profiles: { columns: 'id,email,name,phone,license_no,address,branch,avatar_url,upline_id,referral_code,role,membership,status,created_at', order: 'created_at', search: 'name' },
  exam_attempts: { columns: 'id,name,phone,ends_at,submitted_at,score,max_marks,passed,cert_id,created_at', order: 'created_at', search: 'name' },
  leads: { columns: 'id,agent_id,name,phone,stage,plan_interest,est_premium,follow_up_date,renewal_date,notes,created_at', order: 'created_at', search: 'name' },
  policies: { columns: 'id,agent_id,client_name,plan_type,premium_mode,term_years,premium,sum_assured,issue_date,next_due_date,created_at', order: 'issue_date', search: 'client_name' },
  schemes: { columns: 'id,title,month_label,target,criteria,active,created_at', order: 'created_at', search: 'title' },
  scheme_status: { columns: 'id,scheme_id,agent_id,achieved,status,note,created_at', order: 'created_at', search: 'note' },
  activity_log: { columns: 'id,actor,action,meta,created_at', order: 'created_at', search: 'actor' },
  exam_pass_settings: { columns: 'id,price,currency,active,payment_instructions,updated_at', order: 'updated_at', search: null },
  exam_pass_orders: { columns: 'id,name,phone,amount,currency,payment_method,receipt_reference,status,reviewed_by,reviewed_at,created_at', order: 'created_at', search: 'name' },
} as const;

type TableName = keyof typeof TABLES;

export async function GET(request: Request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const url = new URL(request.url);
  const table = url.searchParams.get('table') as TableName | null;
  if (!table || !(table in TABLES)) return NextResponse.json({ error: 'Choose a valid admin data table.' }, { status: 400 });

  const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10) || 1;
  const page = Math.min(1_000_000, Math.max(1, requestedPage));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('pageSize') || '50', 10) || 50));
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const config = TABLES[table];
  const columns: string = config.columns;
  const orderColumn: string = config.order;
  let query = admin.from(table).select(columns, { count: 'exact' }).order(orderColumn, { ascending: false }).order('id', { ascending: false }).range(start, end);

  const search = url.searchParams.get('search')?.trim().replace(/[,%()]/g, '').slice(0, 100);
  if (search && config.search) query = query.ilike(config.search, `%${search}%`);
  const status = url.searchParams.get('status');
  const membership = url.searchParams.get('membership');
  const role = url.searchParams.get('role');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (table === 'profiles' && status) query = query.eq('status', status);
  if (table === 'profiles' && membership) query = query.eq('membership', membership);
  if (table === 'profiles' && role) query = query.eq('role', role);
  if (table === 'policies' && from) query = query.gte('issue_date', from);
  if (table === 'policies' && to) query = query.lte('issue_date', to);

  const { data, count, error } = await query;
  if (error) {
    console.error(`Admin data query failed for ${table}:`, error.message);
    return NextResponse.json({ error: `Could not load ${table.replace('_', ' ')}. Please try again.` }, { status: 500 });
  }

  return NextResponse.json({ data: data || [], count: count || 0, page, pageSize });
}
