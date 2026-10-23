'use client';
import { supabase } from '@/lib/supabase';

async function authorizationHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error('Could not read your admin session. Sign in again.');
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session has expired. Sign in again.');
  return { Authorization: `Bearer ${token}` };
}

export async function adminGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: await authorizationHeaders(), cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The admin request failed.');
  return body as T;
}

export async function adminPost<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { ...(await authorizationHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The admin request failed.');
  return body as T;
}
