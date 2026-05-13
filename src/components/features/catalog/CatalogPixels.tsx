import Script from "next/script"
import type { CatalogConfig } from "@/types"

interface Props {
  config: CatalogConfig
}

export function CatalogPixels({ config }: Props) {
  return (
    <>
      {/* Google Tag Manager */}
      {config.gtm_container_id && (
        <>
          <Script id="gtm" strategy="afterInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${config.gtm_container_id}');
          `}</Script>
          {/* GTM noscript é adicionado pelo layout */}
        </>
      )}

      {/* Google Analytics 4 */}
      {config.ga4_measurement_id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4_measurement_id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${config.ga4_measurement_id}', { send_page_view: true });
          `}</Script>
        </>
      )}

      {/* Meta Pixel */}
      {config.meta_pixel_id && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${config.meta_pixel_id}');
fbq('track', 'PageView');
        `}</Script>
      )}

      {/* TikTok Pixel */}
      {config.tiktok_pixel_id && (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances",
  "debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],
  ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
  for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
  ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
  ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
  ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,
  ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";
  n.async=!0;n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];
  e.parentNode.insertBefore(n,e)};ttq.load('${config.tiktok_pixel_id}');ttq.page();
}(window, document, 'ttq');
        `}</Script>
      )}
    </>
  )
}
