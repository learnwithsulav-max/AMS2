export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missing = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !key && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ].filter(Boolean);
  if (!url || !key) {
    throw new Error(`Missing required Supabase browser configuration: ${missing.join(', ')}`);
  }
  return { url, key };
}
