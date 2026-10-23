import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client: server only (API routes). Bypasses RLS.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

export const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

