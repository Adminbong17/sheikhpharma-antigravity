import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Truck, CheckCircle2, X, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  /** If set (vendor scope) — only show transfers involving this vendor; from-vendor locked. */
  vendorId?: string | null;
  scope: "admin" | "vendor";
}

type Transfer = {
  id: string;
  transfer_number: string;
  from_vendor_id: string;
  to_vendor_id: string;
  status: string;
  total_items: number;
  total_value: number;
  notes: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  created_at: string;
};

type Vendor = { id: string; shop_name: string };

type CartLine = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  available: number;
};

export default function StockTransfers({ vendorId, scope }: Props) {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [fromVendor, setFromVendor] = useState<string>(vendorId || "");
  const [toVendor, setToVendor] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<Transfer | null>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("stock_transfers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (vendorId) {
      q = q.or(`from_vendor_id.eq.${vendorId},to_vendor_id.eq.${vendorId}`);
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setTransfers((data as any) ?? []);

    const { data: vs } = await supabase.from("vendors").select("id, shop_name").order("shop_name");
    setVendors((vs as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [vendorId]);

  // search products (from selected source vendor)
  useEffect(() => {
    if (!createOpen || !fromVendor) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      let q = supabase
        .from("products")
        .select("id, name, price, stock, vendor_id")
        .eq("vendor_id", fromVendor)
        .order("name")
        .limit(20);
      if (productSearch.trim()) q = q.ilike("name", `%${productSearch.trim()}%`);
      const { data } = await q;
      setProductResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [productSearch, fromVendor, createOpen]);

  const addToCart = (p: any) => {
    if (cart.find((c) => c.product_id === p.id)) return;
    setCart([...cart, {
      product_id: p.id,
      product_name: p.name,
      quantity: 1,
      unit_cost: Number(p.price) || 0,
      available: Number(p.stock) || 0,
    }]);
  };

  const totalValue = cart.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const totalItems = cart.reduce((s, l) => s + l.quantity, 0);

  const submitTransfer = async () => {
    if (!user || !fromVendor || !toVendor) return toast.error("Select source and destination");
    if (fromVendor === toVendor) return toast.error("From and To vendor must differ");
    if (cart.length === 0) return toast.error("Add at least one product");
    setSubmitting(true);

    const transferNumber = `TRF-${Date.now().toString().slice(-8)}`;
    const { data: tr, error } = await supabase
      .from("stock_transfers")
      .insert({
        transfer_number: transferNumber,
        from_vendor_id: fromVendor,
        to_vendor_id: toVendor,
        transferred_by: user.id,
        status: "pending",
        total_items: totalItems,
        total_value: totalValue,
        notes,
      })
      .select()
      .single();

    if (error || !tr) { setSubmitting(false); return toast.error(error?.message || "Failed"); }

    await supabase.from("stock_transfer_items").insert(cart.map((l) => ({
      transfer_id: tr.id,
      product_id: l.product_id,
      product_name: l.product_name,
      quantity: l.quantity,
      unit_cost: l.unit_cost,
    })));

    setSubmitting(false);
    toast.success(`Transfer ${transferNumber} created — pending dispatch`);
    setCreateOpen(false);
    setCart([]); setNotes(""); setProductSearch(""); setToVendor("");
    if (!vendorId) setFromVendor("");
    load();
  };

  const dispatchTransfer = async (t: Transfer) => {
    if (!confirm(`Dispatch transfer ${t.transfer_number}? Stock will leave source vendor.`)) return;
    const { data: items } = await supabase.from("stock_transfer_items").select("*").eq("transfer_id", t.id);
    for (const it of items ?? []) {
      const { data: prod } = await supabase.from("products").select("stock").eq("id", it.product_id).maybeSingle();
      if (prod && prod.stock != null) {
        await supabase.from("products").update({
          stock: Math.max(0, Number(prod.stock) - Number(it.quantity)),
        }).eq("id", it.product_id);
      }
    }
    await supabase.from("stock_transfers").update({
      status: "dispatched",
      dispatched_at: new Date().toISOString(),
    }).eq("id", t.id);
    toast.success("Dispatched");
    load();
  };

  const receiveTransfer = async (t: Transfer) => {
    if (!user) return;
    if (!confirm(`Confirm receipt of ${t.transfer_number}? Stock will be added to destination.`)) return;
    const { data: items } = await supabase.from("stock_transfer_items").select("*").eq("transfer_id", t.id);
    for (const it of items ?? []) {
      // find dest product (by name within target vendor) — or create
      const { data: existing } = await supabase
        .from("products")
        .select("id, stock")
        .eq("vendor_id", t.to_vendor_id)
        .eq("name", it.product_name)
        .maybeSingle();
      if (existing) {
        await supabase.from("products").update({
          stock: Number(existing.stock || 0) + Number(it.quantity),
        }).eq("id", existing.id);
      }
    }
    await supabase.from("stock_transfers").update({
      status: "received",
      received_at: new Date().toISOString(),
      received_by: user.id,
    }).eq("id", t.id);
    toast.success("Received");
    load();
  };

  const cancelTransfer = async (t: Transfer) => {
    if (!confirm(`Cancel ${t.transfer_number}?`)) return;
    await supabase.from("stock_transfers").update({ status: "cancelled" }).eq("id", t.id);
    toast.success("Cancelled");
    load();
  };

  const openView = async (t: Transfer) => {
    setViewing(t);
    const { data } = await supabase.from("stock_transfer_items").select("*").eq("transfer_id", t.id);
    setViewItems(data ?? []);
  };

  const vendorName = (id: string) => vendors.find((v) => v.id === id)?.shop_name || id.slice(0, 8);

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Stock Transfers</h1>
          <p className="text-sm text-muted-foreground">Move inventory between vendor locations</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Transfer
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transfer #</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6">Loading…</TableCell></TableRow>
            ) : transfers.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No transfers</TableCell></TableRow>
            ) : transfers.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => openView(t)}>
                <TableCell className="font-mono text-xs">{t.transfer_number}</TableCell>
                <TableCell className="text-xs">
                  {vendorName(t.from_vendor_id)} → {vendorName(t.to_vendor_id)}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    t.status === "received" ? "default" :
                    t.status === "dispatched" ? "secondary" :
                    t.status === "cancelled" ? "destructive" : "outline"
                  }>{t.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{t.total_items}</TableCell>
                <TableCell className="text-right">৳{Number(t.total_value).toFixed(2)}</TableCell>
                <TableCell className="text-xs">{format(new Date(t.created_at), "dd MMM HH:mm")}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    {t.status === "pending" && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => dispatchTransfer(t)} title="Dispatch">
                          <Truck className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => cancelTransfer(t)} title="Cancel">
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {t.status === "dispatched" && (
                      <Button size="sm" variant="ghost" onClick={() => receiveTransfer(t)} title="Receive">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>New Stock Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From Vendor</Label>
                <Select value={fromVendor} onValueChange={setFromVendor} disabled={!!vendorId}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.shop_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Vendor</Label>
                <Select value={toVendor} onValueChange={setToVendor}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {vendors.filter((v) => v.id !== fromVendor).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.shop_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {fromVendor && (
              <>
                <div>
                  <Label>Search products from source vendor</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder="Type to search…"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                  {productResults.length > 0 && (
                    <Card className="mt-1 max-h-40 overflow-auto">
                      {productResults.map((p) => (
                        <div key={p.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer text-sm flex justify-between"
                          onClick={() => addToCart(p)}>
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground">Stock: {p.stock ?? 0} · ৳{p.price}</span>
                        </div>
                      ))}
                    </Card>
                  )}
                </div>

                <div>
                  <Label>Items</Label>
                  {cart.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-3 text-center border rounded">No items added</div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((l, idx) => (
                        <div key={l.product_id} className="grid grid-cols-12 gap-2 items-center text-sm border-b pb-2">
                          <div className="col-span-5">
                            <div className="font-medium">{l.product_name}</div>
                            <div className="text-xs text-muted-foreground">Available: {l.available}</div>
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number" min={1} max={l.available}
                              value={l.quantity}
                              onChange={(e) => {
                                const v = Math.max(1, Math.min(l.available, Number(e.target.value) || 1));
                                const next = [...cart]; next[idx] = { ...l, quantity: v }; setCart(next);
                              }}
                            />
                          </div>
                          <div className="col-span-3 text-right">
                            ৳{(l.quantity * l.unit_cost).toFixed(2)}
                          </div>
                          <div className="col-span-1 text-right">
                            <Button size="sm" variant="ghost" onClick={() => setCart(cart.filter((_, i) => i !== idx))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between bg-muted p-3 rounded">
                  <span className="font-semibold">Total: {totalItems} items</span>
                  <span className="font-bold text-lg">৳{totalValue.toFixed(2)}</span>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitTransfer} disabled={submitting || !fromVendor || !toVendor || cart.length === 0}>
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Transfer {viewing?.transfer_number}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">From:</span> {vendorName(viewing.from_vendor_id)}</div>
                <div><span className="text-muted-foreground">To:</span> {vendorName(viewing.to_vendor_id)}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{viewing.status}</Badge></div>
                <div><span className="text-muted-foreground">Value:</span> ৳{Number(viewing.total_value).toFixed(2)}</div>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewItems.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.product_name}</TableCell>
                        <TableCell className="text-right">{i.quantity}</TableCell>
                        <TableCell className="text-right">৳{Number(i.unit_cost).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
              {viewing.notes && <div className="text-muted-foreground">Notes: {viewing.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
