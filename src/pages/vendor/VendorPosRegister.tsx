import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PosRegister from "@/components/pos/PosRegister";

export default function VendorPosRegister() {
  const { user } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      setVendorId(data?.id ?? null);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  if (!vendorId) return <div className="p-4 text-sm text-destructive">No vendor account linked.</div>;

  return (
    <div className="p-2 sm:p-4">
      <PosRegister scope="vendor" vendorId={vendorId} />
    </div>
  );
}
