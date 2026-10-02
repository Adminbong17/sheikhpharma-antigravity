import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Wifi, Zap, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { data: siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name || "Sheikh Pharma";
  const appIcon = siteSettings?.favicon_url || "/pwa-192.png";

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    const ua = window.navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto w-full">
        <div className="w-full mb-4">
          <BackButton />
        </div>

        {/* App Icon */}
        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg mb-6 bg-white border border-border">
          <img src={appIcon} alt={siteName} className="w-full h-full object-contain p-1" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2 text-center">{siteName} অ্যাপ ইনস্টল করুন</h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">
          আপনার ফোনে ইনস্টল করুন — কোনো Play Store দরকার নেই!
        </p>

        {/* Features */}
        <div className="w-full space-y-3 mb-8">
          {[
            { icon: Zap, label: "দ্রুত লোড হয়", desc: "Native app-এর মতো স্পিড" },
            { icon: Wifi, label: "Offline সাপোর্ট", desc: "ইন্টারনেট ছাড়াও কিছু কাজ করে" },
            { icon: Smartphone, label: "Home Screen-এ থাকবে", desc: "যেকোনো সময় সহজে খুলুন" },
            { icon: ShieldCheck, label: "নিরাপদ ও আপডেট", desc: "সবসময় সর্বশেষ ভার্সন" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4 bg-card rounded-xl p-4 border border-border">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Install Button or Already Installed */}
        {isInstalled ? (
          <div className="w-full bg-card border border-primary/30 rounded-xl p-4 text-center">
            <p className="text-primary font-semibold">✅ অ্যাপ ইতিমধ্যে ইনস্টল হয়েছে!</p>
            <p className="text-muted-foreground text-sm mt-1">আপনি Home Screen থেকে অ্যাপটি খুলতে পারবেন।</p>
          </div>
        ) : deferredPrompt ? (
          <Button className="w-full h-12 text-base gap-2" onClick={handleInstall}>
            <Download className="h-5 w-5" />
            Android-এ ইনস্টল করুন
          </Button>
        ) : isIOS ? (
          <div className="w-full bg-card border border-border rounded-xl p-5 text-sm text-foreground space-y-2">
            <p className="font-semibold text-center mb-3">iPhone-এ ইনস্টল করতে:</p>
            <p>1. Safari browser-এ এই পেজটি খুলুন</p>
            <p>2. নিচে <strong>Share</strong> বাটনে ট্যাপ করুন (□↑)</p>
            <p>3. <strong>"Add to Home Screen"</strong> সিলেক্ট করুন</p>
            <p>4. <strong>"Add"</strong> বাটনে চাপুন</p>
          </div>
        ) : (
          <div className="w-full bg-card border border-border rounded-xl p-5 text-sm text-foreground space-y-2">
            <p className="font-semibold text-center mb-3">Android-এ ইনস্টল করতে:</p>
            <p>1. Chrome browser-এ এই পেজটি খুলুন</p>
            <p>2. উপরে ডানদিকে <strong>⋮ Menu</strong> ট্যাপ করুন</p>
            <p>3. <strong>"Add to Home screen"</strong> সিলেক্ট করুন</p>
            <p>4. <strong>"Add"</strong> বাটনে চাপুন</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6">
          এটি একটি Progressive Web App (PWA) — Play Store ছাড়াই ইনস্টল হবে।
        </p>
      </div>

      <Footer />
    </div>
  );
}
