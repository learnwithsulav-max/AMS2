import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { resolveSite } from '@/lib/site-routing';

// Multi-domain routing: one Next.js app serves four portals.
//   sulavs.com.np         -> /sites/root
//   agency.sulavs.com.np  -> /sites/agency
//   exam.sulavs.com.np    -> /sites/exam
//   admin.sulavs.com.np   -> /sites/admin
// Vercel preview override: add ?site=exam on a *.vercel.app deployment.
export async function middleware(req: NextRequest) {
  const refreshedCookies = await updateSession(req);
  const url = req.nextUrl.clone();
  const requestedSite = url.searchParams.get('site');
  const cookieSite = req.cookies.get('lsw_site')?.value;
  const site = resolveSite(req.headers.get('host'), requestedSite || cookieSite);

  const response = url.pathname.startsWith('/sites')
    ? NextResponse.redirect(new URL('/', req.url))
    : (() => {
      url.pathname = `/sites/${site}${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url, { request: req });
    })();

  if (requestedSite && ['root', 'agency', 'exam', 'admin'].includes(requestedSite)) {
    response.cookies.set('lsw_site', requestedSite, { path: '/', httpOnly: false, sameSite: 'lax' });
  }

  refreshedCookies.forEach(({ name, value, ...options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'] };
