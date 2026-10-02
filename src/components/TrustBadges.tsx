import { ShieldCheck, RotateCcw, BadgeCheck } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const TrustBadges = () => (
  <ScrollReveal>
    <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border-2 border-primary bg-card p-3 mb-6">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span>Secure Payment</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <RotateCcw className="h-4 w-4 text-primary" />
        <span>Easy Return Within 7 Days</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <BadgeCheck className="h-4 w-4 text-primary" />
        <span>100% Authentic Products</span>
      </div>
    </div>
  </ScrollReveal>
);

export default TrustBadges;
