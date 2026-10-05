import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { logActivity } from "@/lib/logActivity";
import { sendOrderSmsNotify } from "@/lib/sendOrderSms";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Search, Eye, Package, Truck, RefreshCw, Wallet, Loader2, Trash2, Send, Pencil, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import ManualOrderDialog from "@/components/ManualOrderDialog";
import { sendToCashBook } from "@/lib/cashbook";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { OrderInvoicePrint } from "@/components/OrderInvoicePrint";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  order_number?: number;
  payment_method?: string;
  transaction_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_division?: string | null;
  customer_zilla?: string | null;
  customer_upazilla?: string | null;
  order_notes?: string | null;
  customer_email?: string | null;
  customer_username?: string | null;
  order_items?: any[];
  payment_status?: string;
  steadfast_consignment_id?: number | null;
  steadfast_tracking_code?: string | null;
  steadfast_status?: string | null;
  carrybee_consignment_id?: string | null;
  carrybee_status?: string | null;
  pathao_consignment_id?: string | null;
  pathao_status?: string | null;
  is_pos_sale?: boolean | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const callSteadfast = async (action: string, method: 'GET' | 'POST', body?: object) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const url = `${SUPABASE_URL}/functions/v1/steadfast?action=${action}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
};

const callCarryBee = async (action: string, method: 'GET' | 'POST', body?: object, extraParams?: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const url = `${SUPABASE_URL}/functions/v1/carrybee?action=${action}${extraParams || ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
};

const callPathao = async (action: string, method: 'GET' | 'POST', body?: object, extraParams?: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const url = `${SUPABASE_URL}/functions/v1/pathao?action=${action}${extraParams || ''}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
};

const AdminOrders = () => {
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "online" | "pos">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sendingToSteadfast, setSendingToSteadfast] = useState(false);
  const [sendingToCarryBee, setSendingToCarryBee] = useState(false);
  const [sendingToPathao, setSendingToPathao] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [refreshingCarryBee, setRefreshingCarryBee] = useState(false);
  const [refreshingPathao, setRefreshingPathao] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [carrybeeBalance, setCarrybeeBalance] = useState<any>(null);
  const [loadingCarrybeeBalance, setLoadingCarrybeeBalance] = useState(false);
  const [courierCheckResult, setCourierCheckResult] = useState<any[] | null>(null);
  const [checkingCourier, setCheckingCourier] = useState(false);
  // phone → {minRatio, couriers} cache so the order table can show trust %
  const [courierCache, setCourierCache] = useState<Record<string, { minRatio: number; couriers: any[] }>>({});
  const [editingOrder, setEditingOrder] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (filteredOrders: Order[]) => {
    const allIds = filteredOrders.map(o => o.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      // Delete order_items first, then orders
      const ids = Array.from(selectedIds);
      await supabase.from("order_items").delete().in("order_id", ids);
      const { error } = await supabase.from("orders").delete().in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length}টি অর্ডার ডিলিট করা হয়েছে`);
      logActivity({ action: "bulk_orders_deleted", details: `Deleted ${ids.length} orders`, entity_type: "order" });
      setSelectedIds(new Set());
      fetchOrders();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name, image_url, price))")
      .order("created_at", { ascending: false });

    const orderData = data || [];
    const userIds = [...new Set(orderData.map((o: any) => o.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, email, username").in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    const finalOrders = orderData.map((o: any) => ({
      ...o,
      customer_email: profileMap.get(o.user_id)?.email,
      customer_username: profileMap.get(o.user_id)?.username,
    }));
    setOrders(finalOrders);

    // Auto-fetch courier trust % for all unique phone numbers
    const phones = [...new Set(finalOrders.map((o: any) => o.customer_phone).filter(Boolean))] as string[];
    if (phones.length === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    const results = await Promise.allSettled(
      phones.map((phone) =>
        fetch(`${SUPABASE_URL}/functions/v1/bdcourier`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ phone }),
        }).then((r) => r.json()).then((d) => ({ phone, data: d }))
      )
    );

    const newCache: Record<string, { minRatio: number; couriers: any[] }> = {};
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { phone, data: d } = result.value;
        if (d.status === 'success' && d.data) {
          const couriers = Object.values(d.data) as any[];
          // Only consider couriers where at least 1 parcel was sent
          const activeCouriers = couriers.filter((c: any) => Number(c.total_parcel ?? 0) > 0);
          const ratios = activeCouriers.map((c: any) => Number(c.success_ratio ?? 0));
          const minRatio = ratios.length > 0 ? Math.min(...ratios) : 0;
          newCache[phone] = { minRatio, couriers };
        }
      }
    }
    setCourierCache(newCache);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: OrderStatus) => {
    // Get order info before updating for notification
    const orderData = orders.find(o => o.id === id);
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Order status updated!");
    logActivity({ action: "order_status_updated", details: `Order ${id.slice(0,8)} → ${status}`, entity_type: "order", entity_id: id });

    // Notify customer about order status change
    if (orderData) {
      const statusLabels: Record<string, string> = {
        processing: "প্রসেসিং হচ্ছে",
        shipped: "শিপ করা হয়েছে",
        delivered: "ডেলিভার করা হয়েছে",
        cancelled: "ক্যান্সেল করা হয়েছে",
        refunded: "রিফান্ড করা হয়েছে",
      };
      await (supabase.from("notifications" as any) as any).insert({
        user_id: orderData.user_id,
        target_role: "user",
        title: `অর্ডার ${statusLabels[status] || status}`,
        body: `আপনার অর্ডার #${orderData.order_number} ${statusLabels[status] || status}।`,
        type: "order",
        action_url: "/dashboard/orders",
      });
      // Send SMS notification
      sendOrderSmsNotify(id, status);
    }

    fetchOrders();
    if (selectedOrder?.id === id) {
      setSelectedOrder(prev => prev ? { ...prev, status } : null);
    }
  };

  const togglePaymentStatus = async (id: string, current: string, order: Order) => {
    const newStatus = current === 'paid' ? 'unpaid' : 'paid';
    const { error } = await supabase.from("orders").update({ payment_status: newStatus } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`পেমেন্ট স্ট্যাটাস: ${newStatus === 'paid' ? 'Paid ✅' : 'Unpaid'}`);
    logActivity({ action: "payment_status_updated", details: `Order #${order.order_number} → ${newStatus}`, entity_type: "order", entity_id: id });

    // Send SMS to admin when marked as paid
    if (newStatus === 'paid') {
      try {
        const { data: smsSettings } = await supabase.from("sms_settings" as any).select("*").limit(1).single();
        if ((smsSettings as any)?.is_enabled && (smsSettings as any)?.admin_phone) {
          const { data: siteSettings } = await supabase.from("site_settings").select("site_name").limit(1).single();
          const siteName = siteSettings?.site_name || "QweekBD";
          const message = `${siteName}: অর্ডার #${String(order.order_number).padStart(11, "0")} পেমেন্ট সম্পন্ন হয়েছে। মোট: ৳${order.total}। গ্রাহক: ${order.customer_name || "N/A"}`;
          await supabase.functions.invoke("send-sms", {
            body: { phone: (smsSettings as any).admin_phone, message, event_type: "payment_confirmed", order_id: id },
          });
        }
      } catch (err) {
        console.error("Payment SMS error:", err);
      }
    }

    fetchOrders();
    if (selectedOrder?.id === id) {
      setSelectedOrder(prev => prev ? { ...prev, payment_status: newStatus } as any : null);
    }
  };

  const sendToSteadfast = async () => {
    if (!selectedOrder) return;
    setSendingToSteadfast(true);
    try {
      const address = [
        selectedOrder.customer_address,
        selectedOrder.customer_upazilla,
        selectedOrder.customer_zilla,
        selectedOrder.customer_division,
      ].filter(Boolean).join(', ');

      const result = await callSteadfast('create', 'POST', {
        order_id: selectedOrder.id,
        invoice: String(selectedOrder.order_number ?? selectedOrder.id),
        recipient_name: selectedOrder.customer_name || 'Customer',
        recipient_phone: selectedOrder.customer_phone || '',
        recipient_address: address || 'N/A',
        cod_amount: selectedOrder.total,
        note: selectedOrder.order_notes || '',
      });

      if (result.status === 200 && result.consignment) {
        toast.success(`Consignment created! Tracking: ${result.consignment.tracking_code}`);
        await fetchOrders();
        // Refresh selected order
        const updated = orders.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder({
          ...updated,
          steadfast_consignment_id: result.consignment.consignment_id,
          steadfast_tracking_code: result.consignment.tracking_code,
          steadfast_status: result.consignment.status,
        });
      } else {
        toast.error(result.message || 'Failed to create consignment');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSendingToSteadfast(false);
    }
  };

  const refreshSteadfastStatus = async () => {
    if (!selectedOrder?.steadfast_tracking_code) return;
    setRefreshingStatus(true);
    try {
      const result = await callSteadfast('refresh_status', 'POST', {
        order_id: selectedOrder.id,
        tracking_code: selectedOrder.steadfast_tracking_code,
      });
      if (result.status === 200) {
        toast.success(`Status: ${result.delivery_status}`);
        setSelectedOrder(prev => prev ? { ...prev, steadfast_status: result.delivery_status } : null);
        fetchOrders();
      } else {
        toast.error('Could not fetch status');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setRefreshingStatus(false);
    }
  };

  // CarryBee functions
  const sendToCarryBee = async () => {
    if (!selectedOrder) return;
    setSendingToCarryBee(true);
    try {
      const address = [
        selectedOrder.customer_address,
        selectedOrder.customer_upazilla,
        selectedOrder.customer_zilla,
        selectedOrder.customer_division,
      ].filter(Boolean).join(', ');

      // Try to resolve city_id & zone_id from address
      let city_id: number | undefined;
      let zone_id: number | undefined;
      if (address.length >= 10) {
        try {
          const addrResult = await callCarryBee('address-details', 'POST', { query: address });
          if (!addrResult.error && addrResult.data) {
            city_id = addrResult.data.city_id;
            zone_id = addrResult.data.zone_id;
          }
        } catch { /* ignore, will try without */ }
      }

      const result = await callCarryBee('create', 'POST', {
        order_id: selectedOrder.id,
        recipient_name: selectedOrder.customer_name || 'Customer',
        recipient_phone: selectedOrder.customer_phone || '',
        recipient_address: address || 'N/A',
        cod_amount: selectedOrder.total,
        note: selectedOrder.order_notes || '',
        city_id,
        zone_id,
      });

      if (!result.error && result.data?.order?.consignment_id) {
        toast.success(`CarryBee order created! ID: ${result.data.order.consignment_id}`);
        await fetchOrders();
        setSelectedOrder(prev => prev ? {
          ...prev,
          carrybee_consignment_id: result.data.order.consignment_id,
          carrybee_status: 'Order Created',
        } : null);
      } else {
        toast.error(result.message || 'Failed to create CarryBee order');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSendingToCarryBee(false);
    }
  };

  const refreshCarryBeeStatus = async () => {
    if (!selectedOrder?.carrybee_consignment_id) return;
    setRefreshingCarryBee(true);
    try {
      const result = await callCarryBee('refresh_status', 'POST', {
        order_id: selectedOrder.id,
        consignment_id: selectedOrder.carrybee_consignment_id,
      });
      if (!result.error && result.data?.transfer_status) {
        toast.success(`Status: ${result.data.transfer_status}`);
        setSelectedOrder(prev => prev ? { ...prev, carrybee_status: result.data.transfer_status } : null);
        fetchOrders();
      } else {
        toast.error('Could not fetch status');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setRefreshingCarryBee(false);
    }
  };

  // Pathao functions
  const sendToPathao = async () => {
    if (!selectedOrder) return;
    setSendingToPathao(true);
    try {
      const address = [
        selectedOrder.customer_address,
        selectedOrder.customer_upazilla,
        selectedOrder.customer_zilla,
        selectedOrder.customer_division,
      ].filter(Boolean).join(', ');

      const totalItems = selectedOrder.order_items?.reduce((s: number, i: any) => s + (i.quantity || 1), 0) || 1;

      const result = await callPathao('create', 'POST', {
        order_id: selectedOrder.id,
        merchant_order_id: String(selectedOrder.order_number),
        recipient_name: selectedOrder.customer_name || 'Customer',
        recipient_phone: selectedOrder.customer_phone || '',
        recipient_address: address || 'N/A',
        cod_amount: selectedOrder.total,
        note: selectedOrder.order_notes || '',
        item_quantity: totalItems,
      });

      if (result.success && result.consignment_id) {
        toast.success(`Pathao order created! ID: ${result.consignment_id}`);
        await fetchOrders();
        setSelectedOrder(prev => prev ? {
          ...prev,
          pathao_consignment_id: result.consignment_id,
          pathao_status: result.order_status || 'Pending',
        } : null);
      } else {
        toast.error(result.error || 'Failed to create Pathao order');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSendingToPathao(false);
    }
  };

  const refreshPathaoStatus = async () => {
    if (!selectedOrder?.pathao_consignment_id) return;
    setRefreshingPathao(true);
    try {
      const result = await callPathao('refresh_status', 'POST', {
        order_id: selectedOrder.id,
        consignment_id: selectedOrder.pathao_consignment_id,
      });
      if (result.success) {
        toast.success(`Status: ${result.order_status}`);
        setSelectedOrder(prev => prev ? { ...prev, pathao_status: result.order_status } : null);
        fetchOrders();
      } else {
        toast.error('Could not fetch status');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setRefreshingPathao(false);
    }
  };

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const result = await callSteadfast('balance', 'GET');
      if (result.status === 200) {
        setBalance(result.current_balance);
      } else {
        toast.error('Could not fetch balance');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setLoadingBalance(false);
    }
  };

  const checkCourier = async () => {
    if (!selectedOrder?.customer_phone) return;
    setCheckingCourier(true);
    setCourierCheckResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bdcourier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ phone: selectedOrder.customer_phone }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        const couriers = Object.values(data.data) as any[];
        setCourierCheckResult(couriers);
        // cache by phone for inline badge display — only active couriers
        const activeCouriers = couriers.filter((c: any) => Number(c.total_parcel ?? 0) > 0);
        const ratios = activeCouriers.map((c: any) => Number(c.success_ratio ?? 0));
        const minRatio = ratios.length > 0 ? Math.min(...ratios) : 0;
        setCourierCache(prev => ({
          ...prev,
          [selectedOrder.customer_phone!]: { minRatio, couriers },
        }));
      } else {
        toast.error(data.error || data.message || 'Courier check failed');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setCheckingCourier(false);
    }
  };

  const filtered = orders.filter(o => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(o.order_number ?? "").includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.toLowerCase().includes(q) ||
      o.customer_email?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesSource =
      sourceFilter === "all" ||
      (sourceFilter === "pos" ? Boolean(o.is_pos_sale) : !o.is_pos_sale);
    return matchesSearch && matchesStatus && matchesSource;
  });

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">Orders</h1>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchBalance}
            disabled={loadingBalance}
            className="gap-1.5 text-xs"
          >
            <Wallet className="h-3.5 w-3.5" />
           {loadingBalance ? "..." : balance !== null ? `৳${balance}` : "Steadfast Balance"}
          </Button>
          <ManualOrderDialog onOrderCreated={fetchOrders} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name, phone, order #..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={sourceFilter} onValueChange={(v: "all" | "online" | "pos") => setSourceFilter(v)}>
            <SelectTrigger className="w-[125px] h-9"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="online">🌐 Online</SelectItem>
              <SelectItem value="pos">🏪 POS Sales</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.keys(statusColors).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <PrintExportButtons
            title="Orders"
            columns={[
              { header: "Order #", accessor: (o) => String(o.order_number ?? 0).padStart(11, "0") },
              { header: "Source", accessor: (o) => o.is_pos_sale ? "POS" : "Online" },
              { header: "Customer", accessor: (o) => o.customer_name || "—" },
              { header: "Phone", accessor: (o) => o.customer_phone || "—" },
              { header: "Status", accessor: (o) => o.status },
              { header: "Payment", accessor: (o) => o.payment_method || "—" },
              { header: "Total", accessor: (o) => o.total },
              { header: "Date", accessor: (o) => new Date(o.created_at).toLocaleDateString() },
            ] satisfies PrintColumn[]}
            data={filtered}
          />
        </div>

        {/* Select All & Bulk Delete bar */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filtered.length > 0 && filtered.every(o => selectedIds.has(o.id))}
            onCheckedChange={() => toggleSelectAll(filtered)}
          />
          <span className="text-sm text-muted-foreground">Select All ({selectedIds.size})</span>
          {selectedIds.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="gap-1.5" disabled={bulkDeleting}>
                  {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete ({selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedIds.size} orders?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete the selected orders and their items. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No orders found</div>
        ) : filtered.map((o) => {
          const cached = o.customer_phone ? courierCache[o.customer_phone] : null;
          const minRatio = cached ? cached.minRatio : null;
          return (
            <div
              key={o.id}
              onClick={() => setSelectedOrder(o)}
              className="rounded-lg border bg-card p-3 space-y-2 active:bg-muted/50 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Checkbox
                    checked={selectedIds.has(o.id)}
                    onCheckedChange={() => toggleSelect(o.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-mono text-xs font-medium">#{String(o.order_number ?? 0).padStart(11, '0')}</span>
                  {o.is_pos_sale && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] px-1 py-0 font-sans font-medium">
                      🏪 POS
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  <Badge className={`${statusColors[o.status]} border-none text-[10px] px-1.5 py-0`}>{o.status}</Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize bg-slate-50 font-medium">
                    {o.payment_method || 'COD'}
                  </Badge>
                  {cached && minRatio !== null && (
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-bold ${minRatio >= 80 ? 'bg-green-100 text-green-700' : minRatio >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {minRatio.toFixed(0)}%
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold">{formatPrice(o.total)}</span>
              </div>
              {(o.customer_name || o.steadfast_tracking_code || o.carrybee_consignment_id || o.pathao_consignment_id) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {o.customer_name && <span>{o.customer_name}</span>}
                  {o.steadfast_tracking_code && <span className="text-primary">SF: {o.steadfast_tracking_code}</span>}
                  {o.carrybee_consignment_id && <span className="text-primary">CB: {o.carrybee_consignment_id}</span>}
                  {o.pathao_consignment_id && <span className="text-primary">PT: {o.pathao_consignment_id}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden sm:block rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && filtered.every(o => selectedIds.has(o.id))}
                  onCheckedChange={() => toggleSelectAll(filtered)}
                />
              </TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Steadfast</TableHead>
              <TableHead>CarryBee</TableHead>
              <TableHead>Pathao</TableHead>
              <TableHead>Trust</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No orders found</TableCell></TableRow>
            ) : filtered.map((o) => {
              const cached = o.customer_phone ? courierCache[o.customer_phone] : null;
              const minRatio = cached ? cached.minRatio : null;
              return (
                <TableRow key={o.id} className={selectedIds.has(o.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(o.id)}
                      onCheckedChange={() => toggleSelect(o.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>#{String(o.order_number ?? 0).padStart(11, '0')}</span>
                      {o.is_pos_sale && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] px-1 py-0 font-sans font-medium">
                          🏪 POS
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[o.status]} border-none`}>{o.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs font-medium bg-slate-50">
                      {o.payment_method || 'COD'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {o.steadfast_tracking_code ? (
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs text-primary">{o.steadfast_tracking_code}</p>
                        {o.steadfast_status && <p className="text-xs text-muted-foreground">{o.steadfast_status}</p>}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {o.carrybee_consignment_id ? (
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs text-primary">{o.carrybee_consignment_id}</p>
                        {o.carrybee_status && <p className="text-xs text-muted-foreground">{o.carrybee_status}</p>}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {o.pathao_consignment_id ? (
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs text-primary">{o.pathao_consignment_id}</p>
                        {o.pathao_status && <p className="text-xs text-muted-foreground">{o.pathao_status}</p>}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {cached && minRatio !== null ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${minRatio >= 80 ? 'bg-green-100 text-green-700' : minRatio >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {minRatio.toFixed(1)}%
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setSelectedOrder(o)}>
                      <Eye className="h-3.5 w-3.5" /> Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Order Details Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setCourierCheckResult(null); setEditingOrder(false); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle>Order Details</SheetTitle>
              {selectedOrder && !editingOrder && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                  setEditForm({
                    customer_name: selectedOrder.customer_name || "",
                    customer_phone: selectedOrder.customer_phone || "",
                    customer_address: selectedOrder.customer_address || "",
                    customer_division: selectedOrder.customer_division || "",
                    customer_zilla: selectedOrder.customer_zilla || "",
                    customer_upazilla: selectedOrder.customer_upazilla || "",
                    payment_method: selectedOrder.payment_method || "cod",
                    order_notes: selectedOrder.order_notes || "",
                    total: selectedOrder.total || 0,
                  });
                  setEditingOrder(true);
                }}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
          </SheetHeader>

          {selectedOrder && editingOrder ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="font-semibold text-sm">Edit Order</p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Customer Name</Label>
                    <Input value={editForm.customer_name} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={editForm.customer_phone} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Address</Label>
                    <Input value={editForm.customer_address} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Division</Label>
                      <Input value={editForm.customer_division} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_division: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Zilla</Label>
                      <Input value={editForm.customer_zilla} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_zilla: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Upazilla</Label>
                      <Input value={editForm.customer_upazilla} onChange={(e) => setEditForm((f: any) => ({ ...f, customer_upazilla: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Payment Method</Label>
                      <Select value={editForm.payment_method} onValueChange={(v) => setEditForm((f: any) => ({ ...f, payment_method: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cod">COD</SelectItem>
                          <SelectItem value="bkash">bKash</SelectItem>
                          <SelectItem value="nagad">Nagad</SelectItem>
                          <SelectItem value="rocket">Rocket</SelectItem>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Total (৳)</Label>
                      <Input type="number" value={editForm.total} onChange={(e) => setEditForm((f: any) => ({ ...f, total: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Order Notes</Label>
                    <Input value={editForm.order_notes} onChange={(e) => setEditForm((f: any) => ({ ...f, order_notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingOrder(false)}>Cancel</Button>
                <Button className="flex-1 gap-1.5" disabled={savingEdit} onClick={async () => {
                  setSavingEdit(true);
                  try {
                    const { error } = await supabase.from("orders").update({
                      customer_name: editForm.customer_name || null,
                      customer_phone: editForm.customer_phone || null,
                      customer_address: editForm.customer_address || null,
                      customer_division: editForm.customer_division || null,
                      customer_zilla: editForm.customer_zilla || null,
                      customer_upazilla: editForm.customer_upazilla || null,
                      payment_method: editForm.payment_method || "cod",
                      total: Number(editForm.total) || 0,
                      order_notes: editForm.order_notes || null,
                    } as any).eq("id", selectedOrder.id);
                    if (error) throw error;
                    toast.success("Order updated!");
                    setEditingOrder(false);
                    fetchOrders();
                    setSelectedOrder((prev: any) => prev ? { ...prev, ...editForm } : null);
                  } catch (e: any) {
                    toast.error(e.message || "Update failed");
                  } finally {
                    setSavingEdit(false);
                  }
                }}>
                  <Save className="h-3.5 w-3.5" /> {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          ) : selectedOrder && (
            <div className="space-y-5">
              {/* Order Info */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono font-medium">{String(selectedOrder.order_number ?? 0).padStart(11, '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(selectedOrder.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize">{selectedOrder.payment_method || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Status</span>
                  <Badge
                    className={`border-none cursor-pointer ${selectedOrder.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    onClick={() => togglePaymentStatus(selectedOrder.id, selectedOrder.payment_status || 'unpaid', selectedOrder)}
                  >
                    {selectedOrder.payment_status === 'paid' ? '✅ Paid' : '❌ Unpaid'}
                  </Badge>
                </div>
                {selectedOrder.transaction_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <span className="font-mono text-xs">{selectedOrder.transaction_id}</span>
                  </div>
                )}
              </div>

              {/* Customer Info */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold mb-2">Customer Details</p>
                {selectedOrder.customer_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{selectedOrder.customer_name}</span>
                  </div>
                )}
                {selectedOrder.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{selectedOrder.customer_phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="truncate max-w-[180px]">{selectedOrder.customer_email || "Unknown"}</span>
                </div>
                {selectedOrder.customer_username && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Username</span>
                    <span>{selectedOrder.customer_username}</span>
                  </div>
                )}
                {selectedOrder.customer_address && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Address</span>
                    <span className="text-right">{selectedOrder.customer_address}</span>
                  </div>
                )}
                {(selectedOrder.customer_division || selectedOrder.customer_zilla || selectedOrder.customer_upazilla) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="text-right">
                      {[selectedOrder.customer_upazilla, selectedOrder.customer_zilla, selectedOrder.customer_division].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {selectedOrder.order_notes && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Notes</span>
                    <span className="italic text-muted-foreground">{selectedOrder.order_notes}</span>
                  </div>
                )}
              </div>

              {/* Steadfast Courier Section */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold flex items-center gap-1.5"><Truck className="h-4 w-4" /> Steadfast Courier</p>
                </div>

                {selectedOrder.steadfast_tracking_code ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consignment ID</span>
                      <span className="font-mono">{selectedOrder.steadfast_consignment_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tracking Code</span>
                      <span className="font-mono font-bold text-primary">{selectedOrder.steadfast_tracking_code}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Delivery Status</span>
                      <span className="capitalize">{selectedOrder.steadfast_status || '—'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                      onClick={refreshSteadfastStatus}
                      disabled={refreshingStatus}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
                      {refreshingStatus ? 'Refreshing...' : 'Refresh Status'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs">No consignment created yet.</p>
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={sendToSteadfast}
                      disabled={sendingToSteadfast}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      {sendingToSteadfast ? 'Creating...' : 'Send to Steadfast'}
                    </Button>
                  </div>
                )}
              </div>

              {/* CarryBee Courier Section */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold flex items-center gap-1.5"><Truck className="h-4 w-4" /> CarryBee Courier</p>
                </div>

                {selectedOrder.carrybee_consignment_id ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consignment ID</span>
                      <span className="font-mono font-bold text-primary">{selectedOrder.carrybee_consignment_id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <span className="capitalize">{selectedOrder.carrybee_status || '—'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                      onClick={refreshCarryBeeStatus}
                      disabled={refreshingCarryBee}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshingCarryBee ? 'animate-spin' : ''}`} />
                      {refreshingCarryBee ? 'Refreshing...' : 'Refresh Status'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs">No CarryBee order created yet.</p>
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={sendToCarryBee}
                      disabled={sendingToCarryBee}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      {sendingToCarryBee ? 'Creating...' : 'Send to CarryBee'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Pathao Courier Section */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold flex items-center gap-1.5"><Truck className="h-4 w-4" /> Pathao Courier</p>
                </div>

                {selectedOrder.pathao_consignment_id ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consignment ID</span>
                      <span className="font-mono font-bold text-primary">{selectedOrder.pathao_consignment_id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <span className="capitalize">{selectedOrder.pathao_status || '—'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                      onClick={refreshPathaoStatus}
                      disabled={refreshingPathao}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshingPathao ? 'animate-spin' : ''}`} />
                      {refreshingPathao ? 'Refreshing...' : 'Refresh Status'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs">No Pathao order created yet.</p>
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={sendToPathao}
                      disabled={sendingToPathao}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      {sendingToPathao ? 'Creating...' : 'Send to Pathao'}
                    </Button>
                  </div>
                )}
              </div>

              {/* BDCourier Check Section */}
              {selectedOrder.customer_phone && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Package className="h-4 w-4" /> Courier Availability
                    </p>
                    <span className="text-xs text-muted-foreground">{selectedOrder.customer_phone}</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={checkCourier}
                    disabled={checkingCourier}
                  >
                    {checkingCourier ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                    {checkingCourier ? 'Checking...' : 'Check Courier'}
                  </Button>

                  {courierCheckResult !== null && (
                    courierCheckResult.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-1">No couriers found for this number.</p>
                    ) : (
                      <div className="space-y-3 pt-1">
                        {/* Summary stats */}
                        {(() => {
                          const totalParcels = courierCheckResult.reduce((s, c) => s + Number(c.total_parcel ?? 0), 0);
                          const successParcels = courierCheckResult.reduce((s, c) => s + Number(c.success_parcel ?? 0), 0);
                          const cancelledParcels = courierCheckResult.reduce((s, c) => s + Number(c.cancelled_parcel ?? 0), 0);
                          const successRate = totalParcels > 0 ? (successParcels / totalParcels) * 100 : 0;
                          return (
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { label: 'Total Orders', value: totalParcels, color: 'text-blue-600' },
                                { label: 'Successful', value: successParcels, color: 'text-green-600' },
                                { label: 'Cancelled', value: cancelledParcels, color: 'text-red-500' },
                                { label: 'Success Rate', value: `${successRate.toFixed(1)}%`, color: successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-500' },
                              ].map(stat => (
                                <div key={stat.label} className="rounded-md border bg-card p-2 text-center">
                                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                                  <p className={`font-bold text-sm ${stat.color}`}>{stat.value}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Courier table */}
                        <div className="rounded-md border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-primary text-primary-foreground">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold">Courier</th>
                                <th className="px-2 py-2 text-center font-semibold">Total</th>
                                <th className="px-2 py-2 text-center font-semibold">Success</th>
                                <th className="px-2 py-2 text-center font-semibold">Cancel</th>
                                <th className="px-2 py-2 text-center font-semibold">Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {courierCheckResult.map((courier: any, i: number) => {
                                const rate = Number(courier.success_ratio ?? 0);
                                return (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        {courier.logo && (
                                          <img src={courier.logo} alt={courier.name} className="h-5 w-14 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                        )}
                                        {!courier.logo && <span className="font-medium">{courier.name}</span>}
                                      </div>
                                    </td>
                                    <td className="px-2 py-2 text-center font-medium">{courier.total_parcel ?? 0}</td>
                                    <td className="px-2 py-2 text-center font-bold text-green-600">{courier.success_parcel ?? 0}</td>
                                    <td className="px-2 py-2 text-center font-bold text-red-500">{courier.cancelled_parcel ?? 0}</td>
                                    <td className="px-2 py-2 text-center">
                                      <span className={`font-bold ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                        {rate.toFixed(1)}%
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Status Update */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold mb-1">Status</p>
                <Select value={selectedOrder.status} onValueChange={(v) => updateStatus(selectedOrder.id, v as OrderStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      <Badge className={`${statusColors[selectedOrder.status]} border-none`}>{selectedOrder.status}</Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(statusColors).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Order Items */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="font-semibold text-sm">Items</p>
                {selectedOrder.order_items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.products?.image_url ? (
                      <img src={item.products.image_url} alt={item.products.name} className="h-12 w-12 rounded-md object-cover border" />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.products?.name || item.product_name || "Product"}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center rounded-lg border bg-primary/5 px-4 py-3">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">{formatPrice(selectedOrder.total)}</span>
              </div>

              {/* Invoice Print */}
              <OrderInvoicePrint order={selectedOrder} />

              {/* Send to Cash Book */}
              <Button variant="outline" className="w-full gap-2" onClick={async () => {
                try {
                  await sendToCashBook({
                    type: "cash_in",
                    amount: Number(selectedOrder.total),
                    transaction_id: `ORD-${selectedOrder.order_number}`,
                    description: `${selectedOrder.customer_name || "Order"} - ${selectedOrder.payment_method}`,
                    category: "Order Delivery",
                    transaction_date: new Date().toISOString().split("T")[0],
                  });
                  toast.success("Cash Book এ পাঠানো হয়েছে!");
                } catch { toast.error("Failed to send"); }
              }}>
                <Send className="h-4 w-4" /> Send to Cash Book
              </Button>
              {/* Delete Order */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2">
                    <Trash2 className="h-4 w-4" /> অর্ডার ডিলিট করুন
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>অর্ডার ডিলিট করবেন?</AlertDialogTitle>
                    <AlertDialogDescription>
                      এই অর্ডারটি ডাটাবেস থেকে সম্পূর্ণভাবে মুছে যাবে। এটি আর ফিরিয়ে আনা যাবে না।
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>না</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        const orderId = selectedOrder.id;
                        try {
                          // Save order to trash before deleting
                          const { moveToTrash } = await import("@/lib/trash");
                          await moveToTrash("orders", orderId, selectedOrder);
                          // Delete related records that don't cascade
                          await supabase.from("coupon_usages").delete().eq("order_id", orderId);
                          await supabase.from("refund_requests").delete().eq("order_id", orderId);
                          await supabase.from("invoices").delete().eq("order_id", orderId);
                          // order_items & product_reviews cascade automatically
                          const { error } = await supabase.from("orders").delete().eq("id", orderId);
                          if (error) throw error;
                          toast.success("অর্ডার সম্পূর্ণভাবে ডিলিট করা হয়েছে!");
                          logActivity({ action: "order_hard_deleted", details: `Order ${String(selectedOrder.order_number ?? '').padStart(11,'0')} permanently deleted`, entity_type: "order", entity_id: orderId });
                          setSelectedOrder(null);
                          fetchOrders();
                        } catch (e: any) {
                          toast.error(e.message || "ডিলিট করতে সমস্যা হয়েছে");
                        }
                      }}
                    >
                      হ্যাঁ, সম্পূর্ণ ডিলিট করুন
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminOrders;
