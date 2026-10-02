import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Aggressively unregister ANY service worker and clear ALL caches on every load.
// This fixes iOS Safari blank-screen / blink loops caused by stale PWA workers.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      regs.forEach((r) => {
        r.unregister().catch(() => {});
      });
    })
    .catch(() => {});
}
if ("caches" in window) {
  caches
    .keys()
    .then((keys) => keys.forEach((k) => caches.delete(k)))
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
