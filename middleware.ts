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

  const host = req.headers.get('host')?.split(':')[0]?.toLowerCase().replace(/\.$/, '') || '';
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'sulavs.com.np').replace(/^www\./i, '').toLowerCase();
  const isAgencyHost = host === `agency.${rootDomain}`;
  const portfolioSlug = url.pathname.match(/^\/([a-z0-9.-]+)\/?$/i)?.[1];
  const isPortfolioPath = isAgencyHost && Boolean(portfolioSlug) && !['billing', 'login', 'signup', 'api'].includes(portfolioSlug.toLowerCase());
  const portalPath = site === 'exam' && url.pathname === '/exam' ? '/' : url.pathname;

  const response = url.pathname.startsWith('/sites')
    ? NextResponse.redirect(new URL('/', req.url))
    : (() => {
      url.pathname = isPortfolioPath
        ? `/sites/root/agents/${portfolioSlug}`
        : `/sites/${site}${portalPath === '/' ? '' : portalPath}`;
      return NextResponse.rewrite(url, { request: req });
    })();

  if (requestedSite && ['root', 'agency', 'exam', 'admin'].includes(requestedSite)) {
    response.cookies.set('lsw_site', requestedSite, { path: '/', httpOnly: false, sameSite: 'lax' });
  }

  refreshedCookies.forEach(({ name, value, ...options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:avif|css|csv|eot|gif|ico|jpe?g|js|json|map|pdf|png|svg|txt|webmanifest|webp|woff2?)$).*)'] };
