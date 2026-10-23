'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (!browserClient) {
    const { url, key } = getSupabaseConfig();
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
