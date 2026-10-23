'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid?: string) => {
    if (!uid) return setProfile(null);
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data);
  }, []);

  useEffect(() => {
    let on = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!on) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (on) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      loadProfile(s?.user.id);
    });
    return () => { on = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  return {
    session, profile, loading,
    reload: () => loadProfile(session?.user.id),
    signOut: () => supabase.auth.signOut(),
  };
}

export async function uploadAvatar(uid: string, file: File) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${uid}/avatar.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  await supabase.from('profiles').update({ avatar_url: `${data.publicUrl}?v=${Date.now()}` }).eq('id', uid);
}
