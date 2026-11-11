import { NextResponse, type NextRequest } from 'next/server';
import { admin } from '@/lib/supabase-admin';
import { createClient } from '@/utils/supabase/server';

type CallbackError = 'provider_failed' | 'wrong_portal' | 'profile_unavailable';

function redirectWithError(request: NextRequest, error: CallbackError) {
  const url = new URL('/', request.url);
  url.searchParams.set('auth_error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const portal = request.nextUrl.searchParams.get('portal');
  const isExamSignup = portal === 'exam' && request.nextUrl.searchParams.get('signup') === 'true';
  if (!code || !['agency', 'exam'].includes(portal || '')) {
    return redirectWithError(request, 'provider_failed');
  }

  const supabase = await createClient();
  const { data: auth, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError || !auth.user) return redirectWithError(request, 'provider_failed');

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id,portal_type,name,created_at')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError || !profile) return redirectWithError(request, 'profile_unavailable');

  const requestedType = portal === 'exam' ? 'exam_candidate' : 'agent';
  if (profile.portal_type !== requestedType) {
    const profileCreatedAt = Date.parse(profile.created_at || '');
    const userCreatedAt = Date.parse(auth.user.created_at || '');
    const profileCreatedWithUser = Number.isFinite(profileCreatedAt)
      && Number.isFinite(userCreatedAt)
      && Math.abs(profileCreatedAt - userCreatedAt) < 120_000;

    if (!isExamSignup || !profileCreatedWithUser || profile.portal_type !== 'agent') {
      return redirectWithError(request, 'wrong_portal');
    }

    const name = auth.user.user_metadata.full_name
      || auth.user.user_metadata.name
      || auth.user.email?.split('@')[0]
      || null;
    const { data: updatedProfile, error: updateError } = await admin
      .from('profiles')
      .update({ portal_type: 'exam_candidate', ...(name && !profile.name ? { name } : {}) })
      .eq('id', auth.user.id)
      .eq('portal_type', 'agent')
      .select('id')
      .maybeSingle();
    if (updateError || !updatedProfile) return redirectWithError(request, 'profile_unavailable');
  } else if (!profile.name) {
    const name = auth.user.user_metadata.full_name
      || auth.user.user_metadata.name
      || auth.user.email?.split('@')[0];
    if (name) {
      const { error: updateError } = await admin
        .from('profiles')
        .update({ name })
        .eq('id', auth.user.id);
      if (updateError) return redirectWithError(request, 'profile_unavailable');
    }
  }

  const requestedNext = request.nextUrl.searchParams.get('next');
  const safeNext = requestedNext
    && requestedNext.startsWith('/')
    && !requestedNext.startsWith('//')
    && !requestedNext.includes('\\')
    ? requestedNext
    : '/';
  const destination = new URL(safeNext, request.url);
  if (destination.origin !== request.nextUrl.origin) return NextResponse.redirect(new URL('/', request.url));
  return NextResponse.redirect(destination);
}
