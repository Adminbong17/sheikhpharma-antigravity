import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ClipboardList, Search, Phone, MapPin, Calendar, FlaskConical } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrency } from "@/contexts/CurrencyContext";
import BackButton from "@/components/BackButton";

type Booking = {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_division: string | null;
  customer_zilla: string | null;
  customer_upazilla: string | null;
  items: any[];
  service_charge: number;
  total: number;
  status: string;
  payment_status: string;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const AdminLabTestBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();

  const fetchBookings = async () => {
    const { data, error } = await (supabase.from("lab_test_bookings" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setBookings(data);
    if (error) toast.error("Failed to load bookings");
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase.from("lab_test_bookings" as any) as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Update failed");
    else { toast.success(`Status updated to ${status}`); fetchBookings(); }
  };

  const filtered = bookings.filter(b => {
    const matchesSearch = !search || 
      b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_phone?.includes(search);
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <BackButton className="mb-1" />
      <div className="flex items-center gap-2">
        <FlaskConical className="h-6 w-6 text-primary" />
        <h1 className="text-xl md:text-2xl font-bold">Lab Test Bookings</h1>
        <Badge variant="secondary" className="ml-auto">{filtered.length}</Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-10">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No bookings found</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <Card key={b.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{b.customer_name || "N/A"}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{b.customer_phone || "N/A"}</span>
                    </div>
                  </div>
                  <Badge className={statusColors[b.status] || "bg-muted"}>{b.status}</Badge>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{[b.customer_address, b.customer_upazilla, b.customer_zilla, b.customer_division].filter(Boolean).join(", ") || "N/A"}</span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-medium text-foreground">Tests:</p>
                  {(b.items || []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-muted-foreground">
                      <span>{item.name || item.test_name}</span>
                      <span>{formatPrice(item.price || 0)} × {item.quantity || 1}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <div className="space-y-0.5">
                    <p>Total: <strong>{formatPrice(b.total)}</strong></p>
                    <p className="text-xs text-muted-foreground">Service: {formatPrice(b.service_charge)} • Payment: <Badge variant={b.payment_status === "paid" ? "default" : "destructive"} className="text-[10px] h-4">{b.payment_status}</Badge></p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(b.created_at), "dd MMM yyyy, hh:mm a")}</span>
                  </div>
                </div>

                {b.notes && <p className="text-xs text-muted-foreground bg-muted rounded p-2">📝 {b.notes}</p>}

                <div className="flex gap-2 flex-wrap">
                  {b.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(b.id, "confirmed")}>Confirm</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(b.id, "cancelled")}>Cancel</Button>
                    </>
                  )}
                  {b.status === "confirmed" && (
                    <Button size="sm" onClick={() => updateStatus(b.id, "completed")}>Complete</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLabTestBookings;
