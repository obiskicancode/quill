import { Figtree, Young_Serif } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AnalyticsScripts } from '@/components/AnalyticsScripts';
import { ConsentBanner } from '@/components/ConsentBanner';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HideOnCheckout } from '@/components/HideOnCheckout';
import { StickyBookBar } from '@/components/StickyBookBar';
import { WhatsAppFab } from '@/components/WhatsAppFab';
import { getConsentSettings, getHotelSettings } from '@/lib/content/data';
import { site } from '@/lib/site';
import { ConsentProvider } from '@/providers/consent.provider';

import './globals.css';

const display = Young_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});
const body = Figtree({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: book direct`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: site.name,
    description: site.description,
    type: 'website',
    locale: 'en_NG',
  },
};

export const viewport: Viewport = {
  themeColor: '#1C2126',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const consent = getConsentSettings();
  const analytics = getHotelSettings().analytics;
  return (
    <html lang="en-NG" className={`${display.variable} ${body.variable}`}>
      <body className="min-w-[250px] font-sans text-body antialiased">
        <ConsentProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:text-white"
          >
            Skip to main content
          </a>
          <HideOnCheckout>
            <Header />
          </HideOnCheckout>
          <main id="main">{children}</main>
          <HideOnCheckout>
            <Footer />
            <StickyBookBar />
          </HideOnCheckout>
          <HideOnCheckout>
            <WhatsAppFab />
          </HideOnCheckout>
          <ConsentBanner
            enabled={consent.enabled}
            privacyHref={consent.privacyPolicyHref}
          />
          <AnalyticsScripts settings={analytics} />
        </ConsentProvider>
      </body>
    </html>
  );
}
