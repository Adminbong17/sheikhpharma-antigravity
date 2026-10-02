import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PosRegisterSessions from "@/pages/pos/PosRegisterSessions";
import SalesReturns from "@/pages/pos/SalesReturns";
import StockTransfers from "@/pages/pos/StockTransfers";
import PosReports from "@/pages/pos/PosReports";
import StaffCommissions from "@/pages/pos/StaffCommissions";

function useVendorId() {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("vendors").select("id").eq("user_id", user.id).limit(1).maybeSingle();
      setVendorId(data?.id ?? null);
      setLoading(false);
    })();
  }, [user]);
  return { vendorId, loading };
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function withVendor<P extends { vendorId?: string | null; scope: "admin" | "vendor" }>(
  Comp: React.ComponentType<P>,
) {
  return function VendorWrapped() {
    const { vendorId, loading } = useVendorId();
    if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
    if (!vendorId) return <div className="p-4 text-sm text-destructive">No vendor account linked.</div>;
    return <Comp vendorId={vendorId} scope="vendor" {...({} as any)} />;
  };
}

export const VendorPosSessions = withVendor(PosRegisterSessions);
export const VendorSalesReturns = withVendor(SalesReturns);
export const VendorStockTransfers = withVendor(StockTransfers);
export const VendorPosReports = withVendor(PosReports);
export const VendorStaffCommissions = withVendor(StaffCommissions);
