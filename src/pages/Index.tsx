import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, FileText, Stethoscope, Droplets, Siren } from "lucide-react";
import Seo, { SITE_URL } from "@/components/Seo";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import CategoryGrid from "@/components/CategoryGrid";
import HomepageLeftMenu from "@/components/HomepageLeftMenu";
import BrandCarousel from "@/components/BrandCarousel";
import PrayerTimesWidget from "@/components/PrayerTimesWidget";
import TopVendors from "@/components/TopVendors";
import HomepageSections from "@/components/HomepageSections";
import FlashDealBanner from "@/components/FlashDealBanner";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { data: siteSettings } = useSiteSettings();
  const { b } = useLanguage();

  useEffect(() => {
    if (siteSettings?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = siteSettings.favicon_url;
    }
  }, [siteSettings]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Sheikh Pharma — Online Medicine Shop & Model Pharmacy in BD"
        description="Order genuine medicines online from Sheikh Pharma. Search by brand or generic name, upload prescriptions, book lab tests — fast home delivery in Bangladesh."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Pharmacy",
            name: "Sheikh Pharma",
            description: "Model pharmacy and online medicine shop in Bangladesh.",
            url: SITE_URL,
            areaServed: "BD",
            priceRange: "৳৳",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Sheikh Pharma",
            url: SITE_URL,
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <Navbar />

      <main>
        <section className="relative">
          {/* Decorative floating gradient blobs */}
          <div className="pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl animate-float" />
          <div className="pointer-events-none absolute top-20 right-0 h-56 w-56 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl animate-float" style={{ animationDelay: "1.2s" }} />
          <div className="container mx-auto px-3 sm:px-4 pt-3 sm:pt-4 flex gap-4 items-start relative">
            <HomepageLeftMenu variant="desktop" />
            <div className="flex-1 min-w-0">
              <HeroBanner />
            </div>
          </div>
        </section>

        {/* Emergency button — directly under hero slider */}
        <div className="container mx-auto px-3 sm:px-4 pt-3">
          <Link
            to="/emergency"
            className="group relative flex items-center justify-center gap-3 px-4 py-3 rounded-2xl text-white font-bold shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden bg-gradient-to-r from-red-600 via-rose-600 to-red-700 ring-2 ring-red-400/40"
          >
            <span className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/25 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <span className="relative flex items-center gap-3">
              <span className="h-9 w-9 rounded-xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40 flex items-center justify-center shrink-0 animate-pulse">
                <Siren className="h-5 w-5" />
              </span>
              <span className="flex flex-col leading-tight text-center items-center">
                <span className="text-base">{b("জরুরি সেবা", "Emergency")}</span>
                <span className="text-[11px] font-medium opacity-90">
                  {b("জরুরি নম্বর দেখতে ও সাথে সাথে কল করতে ট্যাপ করুন", "Tap to view emergency contacts & call instantly")}
                </span>
              </span>
            </span>
          </Link>
        </div>

        <CategoryGrid />
        <div className="container mx-auto px-4 py-3 grid grid-cols-2 gap-3">
          <Link to="/lab-test" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-90 transition-all">
            <Sparkles className="h-4 w-4" />
            {b("ল্যাব টেস্ট", "Lab Test")}
          </Link>
          <Link to="/prescription" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-accent-foreground font-semibold text-sm shadow-md hover:opacity-90 transition-all">
            <FileText className="h-4 w-4" />
            {b("প্রেসক্রিপশন আপলোড", "Prescription")}
          </Link>
          <Link to="/specialist-doctors" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all border border-emerald-400/30">
            <Stethoscope className="h-4 w-4" />
            {b("বিশেষজ্ঞ চিকিৎসক", "Specialist Doctors")}
          </Link>
          <Link to="/blood-bank" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all border border-red-400/30">
            <Droplets className="h-4 w-4" />
            {b("ব্লাড ব্যাংক", "Blood Bank")}
          </Link>
        </div>
        <HomepageLeftMenu variant="mobile" />
        <FlashDealBanner />
        <HomepageSections />
        
        <TopVendors />
        <PrayerTimesWidget />
        <BrandCarousel />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
