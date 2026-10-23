import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role client: server only (API routes). Bypasses RLS.
export const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-service-key',
  { auth: { persistSession: false } }
);
