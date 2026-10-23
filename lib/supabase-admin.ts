import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client: server only (API routes). Bypasses RLS.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for protected server APIs.');
}

export const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
