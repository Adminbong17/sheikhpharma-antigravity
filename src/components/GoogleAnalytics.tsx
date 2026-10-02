import { useEffect, useRef } from "react";
import { useMarketingSettings } from "@/hooks/useMarketingSettings";

const GoogleAnalytics = () => {
  const { data: settings } = useMarketingSettings();
  const gaInjected = useRef(false);
  const gtmInjected = useRef(false);

  // Google Analytics (GA4)
  useEffect(() => {
    if (!settings?.ga_enabled || !settings.google_analytics_id || gaInjected.current) return;
    gaInjected.current = true;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${settings.google_analytics_id}`;
    document.head.appendChild(script);

    const inline = document.createElement("script");
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${settings.google_analytics_id}');
    `;
    document.head.appendChild(inline);
  }, [settings?.ga_enabled, settings?.google_analytics_id]);

  // Google Tag Manager
  useEffect(() => {
    if (!settings?.gtm_enabled || !settings.gtm_id || gtmInjected.current) return;
    gtmInjected.current = true;

    const script = document.createElement("script");
    script.textContent = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${settings.gtm_id}');
    `;
    document.head.appendChild(script);

    // noscript iframe fallback
    const noscript = document.createElement("noscript");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${settings.gtm_id}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }, [settings?.gtm_enabled, settings?.gtm_id]);

  return null;
};

export default GoogleAnalytics;
