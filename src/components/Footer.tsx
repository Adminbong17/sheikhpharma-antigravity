import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

type PaymentMethod = {
  id: string;
  name: string;
  logo_url: string;
  is_active: boolean;
};

const Footer = () => {
  const { data: siteSettings } = useSiteSettings();
  const siteName = siteSettings?.site_name || "Sheikh Pharma";
  const { t, b } = useLanguage();

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods-footer"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("payment_methods" as any) as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as PaymentMethod[];
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <footer className="mt-8 border-t bg-card">
      <div className="container mx-auto grid gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <h3 className="mb-3 text-lg font-bold text-primary">{siteName}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("footer.tagline")}
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-foreground">{t("footer.customer_service")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/page/help-center" className="hover:text-primary transition-colors">{t("footer.help_center")}</Link></li>
            <li><Link to="/page/how-to-buy" className="hover:text-primary transition-colors">{t("footer.how_to_buy")}</Link></li>
            <li><Link to="/page/returns-refunds" className="hover:text-primary transition-colors">{t("footer.returns")}</Link></li>
            <li><Link to="/page/contact-us" className="hover:text-primary transition-colors">{t("footer.contact_us")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-foreground">{t("footer.about_us")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/page/about" className="hover:text-primary transition-colors">{t("footer.about_company")} {siteName}</Link></li>
            <li><Link to="/careers" className="hover:text-primary transition-colors">{t("footer.careers")}</Link></li>
            <li><Link to="/page/privacy-policy" className="hover:text-primary transition-colors">{t("footer.privacy_policy")}</Link></li>
            <li><Link to="/page/terms-conditions" className="hover:text-primary transition-colors">{t("footer.terms")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-foreground">{t("footer.payment_methods")}</h4>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((pm) => (
                <img
                  key={pm.id}
                  src={pm.logo_url}
                  alt={pm.name}
                  title={pm.name}
                  className="h-8 w-auto object-contain rounded"
                />
              ))
            ) : (
              <>
                <span className="text-2xl">💳</span>
                <span className="text-2xl">🏦</span>
                <span className="text-2xl">📱</span>
              </>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/vendor/apply" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              {t("footer.become_seller")}
            </Link>
            <Link to="/install" className="inline-flex items-center justify-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
              📲 {t("footer.download_app")}
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © 2026 {siteName}. {t("footer.rights")}
      </div>
    </footer>
  );
};

export default Footer;
