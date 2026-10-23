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

  useEffect(() => {
    if (!session) return;
    const key = `lws:last-active:${session.user.id}`;
    const stamp = () => { try { localStorage.setItem(key, String(Date.now())); } catch { /* storage may be disabled */ } };
    const activity = () => {
      const now = Date.now();
      if (now - lastWrite > 15000) { lastWrite = now; stamp(); }
    };
    let lastWrite = 0;
    stamp();
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    const timer = window.setInterval(() => {
      let last = Date.now();
      try { last = Number(localStorage.getItem(key)) || last; } catch { /* use current time */ }
      if (Date.now() - last >= 15 * 60 * 1000) supabase.auth.signOut();
    }, 15000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, activity));
      window.clearInterval(timer);
    };
  }, [session]);

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
