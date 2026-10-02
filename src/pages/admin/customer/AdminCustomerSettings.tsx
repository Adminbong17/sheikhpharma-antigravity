import { useCustomer } from "@/contexts/CustomerContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, MapPin, Star } from "lucide-react";

interface Address {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  division: string;
  zilla: string | null;
  upazilla: string | null;
  is_default: boolean;
}

const AdminCustomerSettings = () => {
  const { customer, customerId } = useCustomer();

  const { data: addresses = [] } = useQuery({
    queryKey: ["admin-customer-addresses", customerId],
    queryFn: async () => {
      const { data } = await (supabase.from("user_addresses" as any) as any)
        .select("*")
        .eq("user_id", customerId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      return (data || []) as Address[];
    },
    enabled: !!customerId,
  });

  return (
    <div className="p-6 max-w-xl">
      <h1 className="mb-4 text-xl font-bold">Profile Settings</h1>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
        <Shield className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-primary">You are viewing this profile in Admin Mode. Changes cannot be made here.</p>
      </div>

      <Card className="mb-4">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-4 pb-2">
            {(customer as any)?.avatar_url ? (
              <img src={(customer as any).avatar_url} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {(customer?.username || customer?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{customer?.username || customer?.email?.split("@")[0]}</p>
              <p className="text-sm text-muted-foreground">{customer?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input value={customer?.username || ""} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={customer?.email || ""} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={(customer as any)?.phone || ""} disabled className="opacity-60" placeholder="Not set" />
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Saved Addresses
          </h2>
          {addresses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No addresses saved.</p>
          )}
          {addresses.map((addr) => (
            <div key={addr.id} className={`rounded-lg border p-3 space-y-1 ${addr.is_default ? "border-primary/40 bg-primary/5" : "bg-background"}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{addr.full_name}</p>
                {addr.is_default && (
                  <span className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded px-1.5 py-0.5">
                    <Star className="h-3 w-3" /> Default
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{addr.phone}</p>
              <p className="text-xs text-foreground/80">{addr.address}</p>
              <p className="text-xs text-muted-foreground">
                {[addr.upazilla, addr.zilla, addr.division].filter(Boolean).join(", ")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCustomerSettings;
