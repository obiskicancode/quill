'use client'

import type { AnalyticsSettings } from '@/types/content.types'
import { hasConsent, useConsent } from '@/lib/consent'

/**
 * Loads the hotel's analytics or marketing tag, but only after the visitor has granted consent.
 * Nothing is loaded when no provider is configured, so no third-party script ships by default.
 */
export function AnalyticsScripts({ settings }: { settings: AnalyticsSettings }) {
  const { consent } = useConsent()

  if (!hasConsent(consent)) return null
  if (settings.provider === 'none' || !settings.measurementId) return null

  if (settings.provider === 'ga4') {
    return (
      <>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${settings.measurementId}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.measurementId}');`,
          }}
        />
      </>
    )
  }

  if (settings.provider === 'plausible') {
    return <script defer data-domain={settings.measurementId} src="https://plausible.io/js/script.js" />
  }

  if (settings.provider === 'meta_pixel') {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${settings.measurementId}');fbq('track','PageView');`,
        }}
      />
    )
  }

  return null
}
