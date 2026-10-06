import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, Search, Eye, Trash2, Phone, ArrowRightLeft, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

type IncompleteOrder = {
  id: string;
  type: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  customer_division: string | null;
  customer_zilla: string | null;
  customer_upazilla: string | null;
  items: any[];
  subtotal: number;
  notes: string | null;
  follow_up_date: string | null;
  last_contacted_at: string | null;
  converted_order_id: string | null;
  created_at: string;
  updated_at: string;
};

const typeColors: Record<string, string> = {
  abandoned_cart: "bg-orange-500/10 text-orange-600",
  draft: "bg-blue-500/10 text-blue-600",
  pending_followup: "bg-purple-500/10 text-purple-600",
};

const statusColors: Record<string, string> = {
  open: "bg-yellow-500/10 text-yellow-600",
  contacted: "bg-blue-500/10 text-blue-600",
  converted: "bg-green-500/10 text-green-600",
  lost: "bg-red-500/10 text-red-600",
  cancelled: "bg-muted text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  abandoned_cart: "Abandoned Cart",
  draft: "Draft Order",
  pending_followup: "Follow-up",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  contacted: "Contacted",
  converted: "Converted",
  lost: "Lost",
  cancelled: "Cancelled",
};

const AdminIncompleteOrders = () => {
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<IncompleteOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<IncompleteOrder | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Create/Edit form
  const [form, setForm] = useState({
    type: "draft" as string,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    customer_division: "",
    customer_zilla: "",
    customer_upazilla: "",
    notes: "",
    follow_up_date: "",
    items: [] as { product_id: string; name: string; quantity: number; price: number }[],
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("incomplete_orders" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    setOrders((data as IncompleteOrder[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Fetch products for item picker
  useEffect(() => {
    supabase.from("products").select("id, name, price, image_url").eq("is_active", true).limit(500)
      .then(({ data }) => setProducts(data || []));
  }, []);

  const filtered = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.includes(q) ||
      o.id.includes(q);
    const matchesType = typeFilter === "all" || o.type === typeFilter;
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const resetForm = () => {
    setForm({
      type: "draft",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      customer_address: "",
      customer_division: "",
      customer_zilla: "",
      customer_upazilla: "",
      notes: "",
      follow_up_date: "",
      items: [],
    });
  };

  const handleCreate = async () => {
    if (!form.customer_name && !form.customer_phone) {
      toast.error("Please enter at least a name or phone number");
      return;
    }
    setSaving(true);
    try {
      const subtotal = form.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("incomplete_orders" as any) as any).insert({
        type: form.type,
        status: "open",
        customer_name: form.customer_name || null,
        customer_phone: form.customer_phone || null,
        customer_email: form.customer_email || null,
        customer_address: form.customer_address || null,
        customer_division: form.customer_division || null,
        customer_zilla: form.customer_zilla || null,
        customer_upazilla: form.customer_upazilla || null,
        notes: form.notes || null,
        follow_up_date: form.follow_up_date || null,
        items: form.items,
        subtotal,
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success("Incomplete order created");
      setShowCreate(false);
      resetForm();
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase.from("incomplete_orders" as any) as any)
      .update({ status, ...(status === "contacted" ? { last_contacted_at: new Date().toISOString() } : {}) })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status updated to ${statusLabels[status]}`);
    fetchOrders();
    if (selectedOrder?.id === id) {
      setSelectedOrder(prev => prev ? { ...prev, status, ...(status === "contacted" ? { last_contacted_at: new Date().toISOString() } : {}) } : null);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this incomplete order?")) return;
    const { error } = await (supabase.from("incomplete_orders" as any) as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    setSelectedOrder(null);
    fetchOrders();
  };

  const convertToOrder = async (order: IncompleteOrder) => {
    if (!order.customer_name || !order.customer_phone) {
      toast.error("Customer name and phone are required to convert");
      return;
    }
    if (!order.items || order.items.length === 0) {
      toast.error("No items in this order");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Create actual order
      const { data: newOrder, error: orderErr } = await supabase.from("orders").insert({
        user_id: user!.id,
        total: order.subtotal,
        status: "pending",
        payment_method: "cod",
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_address: order.customer_address,
        customer_division: order.customer_division || null,
        customer_zilla: order.customer_zilla || null,
        customer_upazilla: order.customer_upazilla || null,
        order_notes: order.notes || null,
      } as any).select("id").single();

      if (orderErr) throw orderErr;

      // Insert order items
      const orderItems = order.items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      }));
      await supabase.from("order_items").insert(orderItems);

      // Update incomplete order as converted
      await (supabase.from("incomplete_orders" as any) as any)
        .update({ status: "converted", converted_order_id: newOrder.id })
        .eq("id", order.id);

      toast.success("Order converted successfully!");
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addItemToForm = (product: any) => {
    const exists = form.items.find(i => i.product_id === product.id);
    if (exists) {
      setForm(prev => ({
        ...prev,
        items: prev.items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i),
      }));
    } else {
      setForm(prev => ({
        ...prev,
        items: [...prev.items, { product_id: product.id, name: product.name, quantity: 1, price: product.price }],
      }));
    }
  };

  const removeItemFromForm = (productId: string) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i.product_id !== productId) }));
  };

  // Stats
  const stats = {
    total: orders.length,
    open: orders.filter(o => o.status === "open").length,
    contacted: orders.filter(o => o.status === "contacted").length,
    converted: orders.filter(o => o.status === "converted").length,
    lost: orders.filter(o => o.status === "lost").length,
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-2" />
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Incomplete Orders</h1>
        </div>
        <div className="flex gap-2">
          <PrintExportButtons
            title="Incomplete Orders"
            columns={[
              { header: "Customer", accessor: (o) => o.customer_name || "Unknown" },
              { header: "Phone", accessor: (o) => o.customer_phone || "—" },
              { header: "Type", accessor: (o) => o.type },
              { header: "Status", accessor: (o) => o.status },
              { header: "Items", accessor: (o) => Array.isArray(o.items) ? o.items.length : 0 },
              { header: "Subtotal", accessor: (o) => o.subtotal },
              { header: "Date", accessor: (o) => format(new Date(o.created_at), "dd MMM yyyy") },
            ] satisfies PrintColumn[]}
            data={filtered}
          />
          <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Create Draft
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Open", value: stats.open, color: "text-yellow-600" },
          { label: "Contacted", value: stats.contacted, color: "text-blue-600" },
          { label: "Converted", value: stats.converted, color: "text-green-600" },
          { label: "Lost", value: stats.lost, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="abandoned_cart">Abandoned</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_followup">Follow-up</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No incomplete orders found</div>
        ) : filtered.map(o => (
          <div key={o.id} className="rounded-lg border bg-card p-3 space-y-2 cursor-pointer active:bg-muted/50" onClick={() => setSelectedOrder(o)}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm">{o.customer_name || "Unknown"}</p>
                {o.customer_phone && <p className="text-xs text-muted-foreground">{o.customer_phone}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{formatPrice(o.subtotal)}</p>
                <span className="text-[10px] text-muted-foreground">{Array.isArray(o.items) ? o.items.length : 0} items</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                <Badge className={(typeColors[o.type] || "") + " text-[10px] px-1.5 py-0"}>{typeLabels[o.type] || o.type}</Badge>
                <Badge className={(statusColors[o.status] || "") + " text-[10px] px-1.5 py-0"}>{statusLabels[o.status] || o.status}</Badge>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {format(new Date(o.created_at), "dd MMM")}
                {o.follow_up_date && <> · F/U: {format(new Date(o.follow_up_date), "dd MMM")}</>}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No incomplete orders found</TableCell></TableRow>
              ) : filtered.map(o => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{o.customer_name || "Unknown"}</p>
                      {o.customer_phone && <p className="text-xs text-muted-foreground">{o.customer_phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge className={typeColors[o.type] || ""}>{typeLabels[o.type] || o.type}</Badge></TableCell>
                  <TableCell><Badge className={statusColors[o.status] || ""}>{statusLabels[o.status] || o.status}</Badge></TableCell>
                  <TableCell className="text-sm">{Array.isArray(o.items) ? o.items.length : 0}</TableCell>
                  <TableCell className="text-sm font-medium">{formatPrice(o.subtotal)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.follow_up_date ? format(new Date(o.follow_up_date), "dd MMM") : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(o.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setSelectedOrder(o)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Incomplete Order Details</SheetTitle>
          </SheetHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-semibold mb-1">Customer</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{selectedOrder.customer_name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{selectedOrder.customer_phone || "—"}</span></div>
                {selectedOrder.customer_email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{selectedOrder.customer_email}</span></div>}
                {selectedOrder.customer_address && <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-right max-w-[200px]">{selectedOrder.customer_address}</span></div>}
                {selectedOrder.customer_division && <div className="flex justify-between"><span className="text-muted-foreground">Division</span><span>{selectedOrder.customer_division}</span></div>}
              </div>

              {/* Type & Status */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Type</span>
                  <Badge className={typeColors[selectedOrder.type]}>{typeLabels[selectedOrder.type]}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Select value={selectedOrder.status} onValueChange={v => updateStatus(selectedOrder.id, v)}>
                    <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedOrder.last_contacted_at && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Last Contacted</span><span>{format(new Date(selectedOrder.last_contacted_at), "dd MMM yyyy HH:mm")}</span></div>
                )}
                {selectedOrder.follow_up_date && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Follow-up Date</span><span>{format(new Date(selectedOrder.follow_up_date), "dd MMM yyyy")}</span></div>
                )}
              </div>

              {/* Items */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="font-semibold text-sm mb-2">Items ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})</p>
                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No items</p>
                )}
              </div>

              {/* Subtotal */}
              <div className="flex justify-between items-center rounded-lg border bg-primary/5 px-4 py-3">
                <span className="font-semibold">Subtotal</span>
                <span className="text-lg font-bold text-primary">{formatPrice(selectedOrder.subtotal)}</span>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                  <p className="font-semibold mb-1">Notes</p>
                  <p className="text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {selectedOrder.status !== "converted" && (
                  <Button className="flex-1 gap-2" onClick={() => convertToOrder(selectedOrder)}>
                    <ArrowRightLeft className="h-4 w-4" /> Convert to Order
                  </Button>
                )}
                {selectedOrder.converted_order_id && (
                  <Badge className="bg-green-100 text-green-700 self-center">Converted</Badge>
                )}
                <Button variant="destructive" size="icon" onClick={() => deleteOrder(selectedOrder.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Draft Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft Order</SelectItem>
                  <SelectItem value="abandoned_cart">Abandoned Cart</SelectItem>
                  <SelectItem value="pending_followup">Pending Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Customer name" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="01XXXXXXXXX" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} placeholder="Email (optional)" />
              </div>
              <div className="space-y-2">
                <Label>Follow-up Date</Label>
                <Input type="date" value={form.follow_up_date} onChange={e => setForm(p => ({ ...p, follow_up_date: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={form.customer_address} onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))} placeholder="Delivery address" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes..." rows={2} />
            </div>

            {/* Product Picker */}
            <div className="space-y-2">
              <Label>Add Products</Label>
              <Select onValueChange={v => {
                const p = products.find(pr => pr.id === v);
                if (p) addItemToForm(p);
              }}>
                <SelectTrigger><SelectValue placeholder="Select a product to add" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.items.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                {form.items.map(item => (
                  <div key={item.product_id} className="flex items-center justify-between text-sm">
                    <span className="flex-1 truncate">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => setForm(p => ({
                          ...p,
                          items: p.items.map(i => i.product_id === item.product_id ? { ...i, quantity: Number(e.target.value) || 1 } : i),
                        }))}
                        className="w-16 h-8"
                      />
                      <span className="w-20 text-right font-medium">{formatPrice(item.price * item.quantity)}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeItemFromForm(item.product_id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t font-semibold text-sm">
                  <span>Total</span>
                  <span>{formatPrice(form.items.reduce((s, i) => s + i.price * i.quantity, 0))}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIncompleteOrders;
