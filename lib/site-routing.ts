import type { SiteKey } from '@/lib/brand';

const PORTALS = new Set<SiteKey>(['agency', 'exam', 'admin']);
const DEFAULT_ROOT_DOMAIN = 'sulavs.com.np';

function hostname(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return new URL(`https://${value}`).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return '';
  }
}

function isPreviewHost(host: string): boolean {
  return host.endsWith('.vercel.app');
}

export function resolveSite(hostHeader: string | null, requestedSite: string | null): SiteKey {
  const host = hostname(hostHeader);
  const root = hostname(process.env.NEXT_PUBLIC_ROOT_DOMAIN || DEFAULT_ROOT_DOMAIN).replace(/^www\./, '');

  if (requestedSite && PORTALS.has(requestedSite as SiteKey) && isPreviewHost(host)) {
    return requestedSite as SiteKey;
  }

  if (host === root || host === `www.${root}`) return 'root';
  if (host.endsWith(`.${root}`)) {
    const subdomain = host.slice(0, -(root.length + 1));
    if (!subdomain.includes('.') && PORTALS.has(subdomain as SiteKey)) return subdomain as SiteKey;
  }

  // Unrecognized hosts use the public landing portal.
  return 'root';
}
