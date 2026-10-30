import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';

const siteUrl = 'https://www.sulavs.com.np';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Learn With Sulav | Insurance Tools & Exam Practice',
  description: 'Practical workspace tools for insurance agents in Nepal, plus timed licensing exam practice for students.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: BRAND.name,
    title: 'Learn With Sulav | Insurance Tools & Exam Practice',
    description: 'Practical workspace tools for insurance agents in Nepal, plus timed licensing exam practice for students.',
    locale: 'en_US',
    images: [{ url: '/logo.png', alt: 'Learn With Sulav logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn With Sulav | Insurance Tools & Exam Practice',
    description: 'Practical workspace tools for insurance agents in Nepal, plus timed licensing exam practice for students.',
    images: ['/logo.png'],
  },
};

export default function RootSiteLayout({ children }: { children: React.ReactNode }) {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    email: BRAND.contact.email,
    telephone: BRAND.contact.phones,
    description: 'Independent insurance tools and exam preparation resources operated by Sulav Sapkota.',
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND.name,
    url: siteUrl,
    inLanguage: ['en', 'ne'],
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    {children}
  </>;
}
