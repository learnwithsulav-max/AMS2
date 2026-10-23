import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// Multi-domain routing: one Next.js app serves four portals.
//   sulavs.com.np         -> /sites/root
//   agency.sulavs.com.np  -> /sites/agency
//   exam.sulavs.com.np    -> /sites/exam
//   admin.sulavs.com.np   -> /sites/admin
// Preview/dev override: add ?site=exam (also works on *.vercel.app).
const SITES = ['agency', 'exam', 'admin'];

export async function middleware(req: NextRequest) {
  const refreshedCookies = await updateSession(req);
  const url = req.nextUrl.clone();
  const response = url.pathname.startsWith('/sites')
    ? NextResponse.redirect(new URL('/', req.url))
    : (() => {
      const host = (req.headers.get('host') || '').split(':')[0];
      let site = url.searchParams.get('site') || host.split('.')[0];
      if (!SITES.includes(site)) site = 'root';
      url.pathname = `/sites/${site}${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url, { request: req });
    })();

  refreshedCookies.forEach(({ name, value, ...options }) => response.cookies.set(name, value, options));
  return response;
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'] };
