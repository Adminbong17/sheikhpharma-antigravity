import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VendorContextType {
  vendorId: string | null;
  vendor: any | null;
  loading: boolean;
  isImpersonating: boolean;
}

const VendorContext = createContext<VendorContextType>({
  vendorId: null,
  vendor: null,
  loading: true,
  isImpersonating: false,
});

export const useVendor = () => useContext(VendorContext);

/** For regular vendors — looks up vendor by auth user_id */
export const VendorProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("vendors")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setVendor(data);
        setLoading(false);
      });
  }, [user]);

  return (
    <VendorContext.Provider value={{ vendorId: vendor?.id ?? null, vendor, loading, isImpersonating: false }}>
      {children}
    </VendorContext.Provider>
  );
};

/** For admin impersonation — uses a specific vendorId */
export const AdminVendorProvider = ({ vendorId, children }: { vendorId: string; children: ReactNode }) => {
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("vendors")
      .select("*")
      .eq("id", vendorId)
      .maybeSingle()
      .then(({ data }) => {
        setVendor(data);
        setLoading(false);
      });
  }, [vendorId]);

  return (
    <VendorContext.Provider value={{ vendorId: vendor?.id ?? null, vendor, loading, isImpersonating: true }}>
      {children}
    </VendorContext.Provider>
  );
};
