import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, Calendar, MapPin, Phone, Building2 } from "lucide-react";
import { format } from "date-fns";

type Booking = {
  id: string;
  items: any[];
  total: number;
  service_charge: number;
  status: string;
  payment_status: string;
  transaction_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_division: string | null;
  customer_zilla: string | null;
  customer_upazilla: string | null;
  notes: string | null;
  created_at: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabel: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const MyLabTests = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-lab-bookings", user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("lab_test_bookings" as any) as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []) as Booking[];
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-4 max-w-lg md:max-w-2xl">
        <BackButton className="mb-2" />
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-bold">My Lab Tests</h1>
            <p className="text-xs text-muted-foreground">{bookings.length} booking(s)</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-7 w-7 border-3 border-primary border-t-transparent rounded-full" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No lab test bookings yet</p>
            <p className="text-xs mt-1">Book a lab test to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Card key={b.id} className="overflow-hidden">
                <CardContent className="p-3 space-y-2.5">
                  {/* Header: Status + Date */}
                  <div className="flex items-center justify-between">
                    <Badge className={statusColors[b.status] || "bg-muted"}>
                      {statusLabel[b.status] || b.status}
                    </Badge>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(b.created_at), "dd MMM yyyy, hh:mm a")}
                    </div>
                  </div>

                  {/* Test items */}
                  <div className="space-y-1.5">
                    {(b.items || []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-2.5 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FlaskConical className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs font-semibold truncate">{item.name || item.test_name}</span>
                        </div>
                        <span className="text-xs font-bold text-primary shrink-0 ml-2">
                          {formatPrice(item.price || 0)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Center info if available */}
                  {(b.items || []).some((item: any) => item.center_name) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {(b.items || []).find((item: any) => item.center_name)?.center_name}
                      </span>
                    </div>
                  )}

                  {/* Location */}
                  {(b.customer_address || b.customer_division) && (
                    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>{[b.customer_address, b.customer_upazilla, b.customer_zilla, b.customer_division].filter(Boolean).join(", ")}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {b.notes && (
                    <p className="text-[11px] text-muted-foreground bg-muted rounded-lg px-2.5 py-1.5">📝 {b.notes}</p>
                  )}

                  {/* Footer: Total + Payment */}
                  <div className="flex items-center justify-between border-t pt-2">
                    <div>
                      <p className="text-sm font-bold">{formatPrice(b.total)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Service: {formatPrice(b.service_charge)}
                      </p>
                    </div>
                    <Badge variant={b.payment_status === "paid" ? "default" : "destructive"} className="text-[10px] h-5">
                      {b.payment_status === "paid" ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLabTests;
