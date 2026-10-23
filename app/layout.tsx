import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import type { Viewport } from 'next';

export const metadata = {
  title: 'Learn With Sulav',
  description: 'Smart tools, training portals and mentorship for insurance agents and professionals.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Learn With Sulav',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Learn With Sulav' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#0A4F8A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo.png" />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
