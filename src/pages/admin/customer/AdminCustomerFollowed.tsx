import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { Link } from "react-router-dom";

const AdminCustomerFollowed = () => {
  const { userId } = useParams<{ userId: string }>();

  const { data: follows = [] } = useQuery({
    queryKey: ["admin-customer-follows", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_follows")
        .select("*, vendors(id, store_name, logo_url)")
        .eq("user_id", userId!);
      return data || [];
    },
    enabled: !!userId,
  });

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold">Followed Stores</h1>
      {follows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Store className="h-14 w-14 opacity-20" />
          <p className="font-medium">No followed stores</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {follows.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="flex items-center gap-3 p-4">
                {f.vendors?.logo_url ? (
                  <img src={f.vendors.logo_url} alt={f.vendors.store_name} className="h-10 w-10 rounded-full object-cover border" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{f.vendors?.store_name || "Store"}</p>
                  <Link to={`/store/${f.vendors?.id}`} className="text-xs text-primary hover:underline" target="_blank">
                    View Store
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCustomerFollowed;
