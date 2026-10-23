import { createServerClient } from '@supabase/ssr';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import type { NextRequest } from 'next/server';
import { getSupabaseConfig } from './config';

export async function updateSession(request: NextRequest) {
  const { url, key } = getSupabaseConfig();
  const refreshedCookies: ResponseCookie[] = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          refreshedCookies.push({ name, value, ...options });
        });
      },
    },
  });

  const { error } = await supabase.auth.getUser();
  if (error && error.name !== 'AuthSessionMissingError') {
    console.error('Supabase middleware could not refresh the session:', error.message);
  }
  return refreshedCookies;
}
