import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CustomerContextType {
  customerId: string | null;
  customer: { user_id: string; email: string | null; username: string | null; avatar_url?: string | null; phone?: string | null; address?: string | null } | null;
  loading: boolean;
}

const CustomerContext = createContext<CustomerContextType>({
  customerId: null,
  customer: null,
  loading: true,
});

export const useCustomer = () => useContext(CustomerContext);

export const AdminCustomerProvider = ({ userId, children }: { userId: string; children: ReactNode }) => {
  const [customer, setCustomer] = useState<CustomerContextType["customer"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("user_id, email, username, avatar_url, phone, address")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setCustomer(data ?? null);
        setLoading(false);
      });
  }, [userId]);

  return (
    <CustomerContext.Provider value={{ customerId: userId, customer, loading }}>
      {children}
    </CustomerContext.Provider>
  );
};
