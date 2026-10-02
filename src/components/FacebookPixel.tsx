import { useEffect, useRef } from "react";
import { useMarketingSettings } from "@/hooks/useMarketingSettings";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

const FacebookPixel = () => {
  const { data: settings } = useMarketingSettings();
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!settings?.pixel_enabled || !settings.facebook_pixel_id || injectedRef.current) return;

    // Prevent duplicate injection
    injectedRef.current = true;

    // Facebook Pixel base code
    const f = window;
    const b = document;
    const e = "script";

    if (f.fbq) return; // Already loaded

    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    const s = b.getElementsByTagName(e)[0];
    s?.parentNode?.insertBefore(t, s);

    window.fbq("init", settings.facebook_pixel_id);
    window.fbq("track", "PageView");

    // Add noscript fallback
    const noscript = document.createElement("noscript");
    const img = document.createElement("img");
    img.height = 1;
    img.width = 1;
    img.style.display = "none";
    img.src = `https://www.facebook.com/tr?id=${settings.facebook_pixel_id}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);

    return () => {
      // Cleanup noscript on unmount
      if (noscript.parentNode) noscript.parentNode.removeChild(noscript);
    };
  }, [settings?.pixel_enabled, settings?.facebook_pixel_id]);

  return null;
};

export default FacebookPixel;
