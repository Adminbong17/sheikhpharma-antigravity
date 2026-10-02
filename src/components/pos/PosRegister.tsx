import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search, Plus, Minus, Trash2, Pause, FolderOpen, Printer,
  ShoppingCart, Banknote, X, ScanLine,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeBdPhone } from "@/lib/phone";
import { logActivity } from "@/lib/logActivity";

type Product = {
  id: string;
  name: string;
  price: number;
  mrp: number | null;
  stock: number | null;
  image_url: string | null;
  sku?: string | null;
  vendor_id?: string | null;
};

type CartItem = {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  stock: number | null;
};

interface Props {
  /** If provided, restrict products & sales to this vendor only (vendor panel). Admin = null/undefined = all. */
  vendorId?: string | null;
  /** Where the page is rendered ("admin" or "vendor") — affects redirects/labels only. */
  scope: "admin" | "vendor";
}

const newCartItem = (p: Product, qty = 1): CartItem => ({
  product_id: p.id,
  product_name: p.name,
  price: Number(p.price) || 0,
  quantity: qty,
  image_url: p.image_url,
  stock: p.stock,
});

export default function PosRegister({ vendorId, scope }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bkash" | "nagad" | "rocket" | "card" | "due">("cash");
  const [trxId, setTrxId] = useState<string>("");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [holdDialog, setHoldDialog] = useState(false);
  const [heldList, setHeldList] = useState<any[]>([]);
  const [heldLoading, setHeldLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [receiptWidth, setReceiptWidth] = useState<"80mm" | "56mm">(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem("pos_receipt_width") : null;
    return v === "56mm" ? "56mm" : "80mm";
  });

  // ---- Load active register session ----
  useEffect(() => {
    if (!user) return;
    (async () => {
      let q = supabase
        .from("pos_register_sessions")
        .select("*")
        .eq("status", "open")
        .eq("opened_by", user.id)
        .order("opened_at", { ascending: false })
        .limit(1);
      if (vendorId) q = q.eq("vendor_id", vendorId);
      const { data } = await q;
      if (data && data[0]) setActiveSession(data[0]);
    })();
  }, [user, vendorId]);

  // ---- Search products (debounced) ----
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      let q = supabase
        .from("products")
        .select("id, name, price, stock, sku, image_url, vendor_id, product_images(image_url, sort_order)")
        .order("name")
        .limit(40);
      if (vendorId) q = q.eq("vendor_id", vendorId);
      if (search.trim()) {
        const term = search.trim();
        const isUuid = /^[0-9a-f-]{36}$/i.test(term);
        if (isUuid) {
          q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%,id.eq.${term}`);
        } else {
          q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
        }
      }
      const { data, error } = await q;
      if (error) {
        console.error("POS product search error:", error);
      }
      if (!error && data) {
        setProducts(
          data.map((p: any) => {
            const galleryImg = p.product_images?.sort?.((a: any, b: any) => a.sort_order - b.sort_order)?.[0]?.image_url;
            return {
              id: p.id,
              name: p.name,
              price: Number(p.price) || 0,
              mrp: null,
              stock: p.stock,
              sku: p.sku,
              vendor_id: p.vendor_id,
              image_url: galleryImg ?? p.image_url ?? null,
            };
          }),
        );
      }
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [search, vendorId]);

  // ---- Cart helpers ----
  const addToCart = (p: Product) => {
    setCart((c) => {
      const ix = c.findIndex((it) => it.product_id === p.id);
      if (ix >= 0) {
        const next = [...c];
        next[ix] = { ...next[ix], quantity: next[ix].quantity + 1 };
        return next;
      }
      return [...c, newCartItem(p, 1)];
    });
    // Refocus search for fast scanning
    setTimeout(() => searchRef.current?.focus(), 30);
    setSearch("");
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) return setCart((c) => c.filter((it) => it.product_id !== id));
    setCart((c) => c.map((it) => (it.product_id === id ? { ...it, quantity: qty } : it)));
  };

  const removeItem = (id: string) =>
    setCart((c) => c.filter((it) => it.product_id !== id));

  const subtotal = useMemo(
    () => cart.reduce((s, it) => s + it.price * it.quantity, 0),
    [cart],
  );
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const change = Math.max(0, (Number(amountReceived) || 0) - total);

  // ---- Submit sale ----
  const completeSale = async () => {
    if (!cart.length) return toast.error("Cart is empty");
    if (!user) return toast.error("Login required");
    if (paymentMethod === "cash" && (Number(amountReceived) || 0) < total) {
      return toast.error("Insufficient cash received");
    }
    if (["bkash", "nagad", "rocket"].includes(paymentMethod) && !trxId.trim()) {
      return toast.error("Enter transaction ID");
    }
    if (paymentMethod === "due" && !customerPhone.trim()) {
      return toast.error("Customer phone required for due sale");
    }

    setSubmitting(true);
    try {
      const isDue = paymentMethod === "due";
      const orderInsert: any = {
        user_id: user.id,
        status: isDue ? "pending" : "delivered",
        total,
        payment_method: paymentMethod,
        
        transaction_id: ["bkash", "nagad", "rocket"].includes(paymentMethod) ? (trxId.trim() || null) : null,
        customer_name: customerName.trim() || "Walk-in Customer",
        customer_phone: customerPhone ? normalizeBdPhone(customerPhone) : null,
        is_pos_sale: true,
        register_session_id: activeSession?.id ?? null,
        staff_id: user.id,
        amount_received: paymentMethod === "cash" ? Number(amountReceived) || total : (isDue ? 0 : total),
        change_returned: paymentMethod === "cash" ? change : 0,
        coupon_discount: discount,
        delivery_charge: 0,
        vendor_id: vendorId ?? null,
      };

      const { data: order, error } = await supabase
        .from("orders")
        .insert(orderInsert)
        .select()
        .single();
      if (error) throw error;

      // Insert order items
      const itemsInsert = cart.map((it) => ({
        order_id: order.id,
        product_id: it.product_id,
        product_name: it.product_name,
        price: it.price,
        quantity: it.quantity,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(itemsInsert);
      if (itemsErr) throw itemsErr;

      // Decrement stock
      for (const it of cart) {
        const { data: p } = await supabase
          .from("products")
          .select("stock")
          .eq("id", it.product_id)
          .single();
        if (p && typeof p.stock === "number") {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, p.stock - it.quantity) })
            .eq("id", it.product_id);
        }
      }

      // Update register session counters
      if (activeSession) {
        await supabase
          .from("pos_register_sessions")
          .update({
            total_sales: (Number(activeSession.total_sales) || 0) + total,
            total_transactions: (Number(activeSession.total_transactions) || 0) + 1,
          })
          .eq("id", activeSession.id);
        setActiveSession({
          ...activeSession,
          total_sales: (Number(activeSession.total_sales) || 0) + total,
          total_transactions: (Number(activeSession.total_transactions) || 0) + 1,
        });
      }

      logActivity({ action: "pos_sale", details: `Order #${order.order_number} • ৳${total}` });
      toast.success(`Sale complete • Order #${order.order_number}`);

      // Print receipt (80mm or 56mm based on preference)
      printReceipt(order, cart, { subtotal, discount, total, paymentMethod, amountReceived, change }, receiptWidth);

      // Reset
      setCart([]);
      setDiscount(0);
      setCustomerName("");
      setCustomerPhone("");
      setAmountReceived("");
      setTrxId("");
      setPaymentMethod("cash");
      setPaymentDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Sale failed");
    }
    setSubmitting(false);
  };

  // ---- Hold sale ----
  const holdSale = async () => {
    if (!cart.length) return toast.error("Nothing to hold");
    if (!user) return;
    const ref = `HOLD-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("pos_held_sales").insert({
      hold_reference: ref,
      vendor_id: vendorId ?? null,
      held_by: user.id,
      customer_name: customerName.trim() || null,
      customer_phone: customerPhone ? normalizeBdPhone(customerPhone) : null,
      items: cart as any,
      subtotal,
      discount,
      total,
    });
    if (error) return toast.error(error.message);
    toast.success(`Held • ${ref}`);
    setCart([]);
    setDiscount(0);
    setCustomerName("");
    setCustomerPhone("");
  };

  // ---- Open held list ----
  const openHeldList = async () => {
    setHoldDialog(true);
    setHeldLoading(true);
    let q = supabase
      .from("pos_held_sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (vendorId) q = q.eq("vendor_id", vendorId);
    const { data } = await q;
    setHeldList(data || []);
    setHeldLoading(false);
  };

  const resumeHeld = async (h: any) => {
    setCart((h.items || []) as CartItem[]);
    setDiscount(Number(h.discount) || 0);
    setCustomerName(h.customer_name || "");
    setCustomerPhone(h.customer_phone || "");
    await supabase.from("pos_held_sales").delete().eq("id", h.id);
    setHoldDialog(false);
    toast.success("Resumed held sale");
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr,420px] h-[calc(100vh-120px)]">
      {/* LEFT — products grid */}
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b p-3 flex gap-2 items-center">
          <ScanLine className="h-5 w-5 text-muted-foreground" />
          <Input
            ref={searchRef}
            autoFocus
            placeholder="Scan barcode or search product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <select
            value={receiptWidth}
            onChange={(e) => {
              const v = e.target.value as "80mm" | "56mm";
              setReceiptWidth(v);
              try { localStorage.setItem("pos_receipt_width", v); } catch {}
            }}
            className="h-9 rounded-md border bg-background px-2 text-xs"
            title="Receipt paper width"
          >
            <option value="80mm">80mm</option>
            <option value="56mm">56mm</option>
          </select>
          <Button variant="outline" size="sm" onClick={openHeldList}>
            <FolderOpen className="h-4 w-4 mr-1" /> Held
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
            {loading && <div className="col-span-full text-center text-sm text-muted-foreground py-8">Searching…</div>}
            {!loading && products.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">No products</div>
            )}
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="group rounded-md border bg-card p-2 text-left hover:border-primary hover:shadow transition active:scale-[.98]"
              >
                <div className="aspect-square rounded bg-muted overflow-hidden mb-2">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium line-clamp-2 mb-1">{p.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">৳{p.price}</span>
                  {typeof p.stock === "number" && (
                    <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-[10px] h-5">
                      {p.stock > 0 ? `${p.stock} left` : "Out"}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* RIGHT — cart */}
      <Card className="flex flex-col overflow-hidden">
        <div className="border-b p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold">Cart ({cart.length})</span>
          </div>
          {activeSession && (
            <Badge variant="outline" className="text-xs">
              Session active
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {cart.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-12">
                Cart empty — scan or click a product
              </div>
            )}
            {cart.map((it) => (
              <div key={it.product_id} className="flex gap-2 items-start border rounded-md p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{it.product_name}</p>
                  <p className="text-xs text-muted-foreground">৳{it.price} × {it.quantity} = ৳{it.price * it.quantity}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.product_id, it.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={it.quantity}
                      onChange={(e) => updateQty(it.product_id, Number(e.target.value) || 0)}
                      className="h-7 w-14 text-center"
                    />
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.product_id, it.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(it.product_id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Customer + totals */}
        <div className="border-t p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Phone (01…)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-medium">৳{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Discount</span>
            <Input
              type="number"
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="h-7 w-24 text-right"
              placeholder="0"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-primary">৳{total.toFixed(2)}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={holdSale} disabled={!cart.length} className="flex-1">
              <Pause className="h-4 w-4 mr-1" /> Hold
            </Button>
            <Button
              onClick={() => {
                setAmountReceived(total.toFixed(2));
                setPaymentDialog(true);
              }}
              disabled={!cart.length}
              className="flex-1"
            >
              <Banknote className="h-4 w-4 mr-1" /> Pay ৳{total.toFixed(0)}
            </Button>
          </div>
        </div>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment — ৳{total.toFixed(2)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "bkash", "nagad", "rocket", "card", "due"] as const).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    size="sm"
                    variant={paymentMethod === m ? "default" : "outline"}
                    onClick={() => setPaymentMethod(m)}
                    className="capitalize"
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === "cash" && (
              <>
                <div>
                  <Label>Cash Received</Label>
                  <Input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    autoFocus
                  />
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    {[100, 500, 1000, 1500].map((v) => (
                      <Button key={v} size="sm" variant="outline" onClick={() => setAmountReceived(String(v))}>
                        ৳{v}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="rounded-md bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground">Change to return</p>
                  <p className="text-2xl font-bold text-primary">৳{change.toFixed(2)}</p>
                </div>
              </>
            )}

            {(paymentMethod === "bkash" || paymentMethod === "nagad" || paymentMethod === "rocket") && (
              <div>
                <Label className="capitalize">{paymentMethod} Transaction ID</Label>
                <Input
                  placeholder="e.g. 8N7A1B2C3D"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Customer paid ৳{total.toFixed(2)} via {paymentMethod}
                </p>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-sm">Swipe / tap card on terminal</p>
                <p className="text-2xl font-bold text-primary mt-1">৳{total.toFixed(2)}</p>
              </div>
            )}

            {paymentMethod === "due" && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-3">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Due / Credit Sale</p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  ৳{total.toFixed(2)} will be recorded as outstanding for {customerName || "this customer"}.
                  Order status: <strong>Pending</strong>.
                </p>
                {!customerPhone && (
                  <p className="text-xs text-destructive mt-2">⚠ Add customer phone for due tracking.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)} disabled={submitting}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={completeSale} disabled={submitting}>
              <Printer className="h-4 w-4 mr-1" /> Complete & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Held list dialog */}
      <Dialog open={holdDialog} onOpenChange={setHoldDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Held Sales</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {heldLoading && <p className="text-center text-sm py-6">Loading…</p>}
            {!heldLoading && heldList.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">No held sales</p>
            )}
            <div className="space-y-2">
              {heldList.map((h) => (
                <div key={h.id} className="flex items-center justify-between border rounded-md p-3 hover:border-primary">
                  <div>
                    <p className="font-mono text-xs">{h.hold_reference}</p>
                    <p className="text-sm font-medium">{h.customer_name || "Walk-in"} • {h.customer_phone || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {(h.items as any[])?.length || 0} items • ৳{Number(h.total).toFixed(2)} • {new Date(h.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => resumeHeld(h)}>Resume</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await supabase.from("pos_held_sales").delete().eq("id", h.id);
                        setHeldList((l) => l.filter((x) => x.id !== h.id));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tiny inline icon to avoid extra import
const Package = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
  </svg>
);

// ---- Receipt printer (80mm or 56mm) ----
function printReceipt(order: any, items: CartItem[], totals: any, width: "80mm" | "56mm" = "80mm") {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  const isNarrow = width === "56mm";
  const bodyW = isNarrow ? "52mm" : "76mm";
  const baseFs = isNarrow ? "10px" : "12px";
  const titleFs = isNarrow ? "12px" : "14px";
  const itemFs = isNarrow ? "9px" : "11px";
  const totalFs = isNarrow ? "11px" : "13px";
  const html = `<!doctype html><html><head><title>Receipt #${order.order_number}</title>
<style>
@page { size: ${width} auto; margin: 0; }
body { width: ${bodyW}; font-family: 'Courier New', monospace; font-size: ${baseFs}; color:#000; padding: ${isNarrow ? "2mm" : "4mm"}; margin:0; }
.center { text-align:center; }
.bold { font-weight:700; }
.row { display:flex; justify-content:space-between; }
hr { border:none; border-top: 1px dashed #000; margin:4px 0; }
table { width:100%; font-size:${itemFs}; }
td { padding: 2px 0; vertical-align: top; }
.small { font-size: ${isNarrow ? "8px" : "10px"}; }
</style></head><body>
<div class="center bold" style="font-size:${titleFs}">RECEIPT</div>
<div class="center small">Order #${order.order_number}</div>
<div class="center small">${new Date(order.created_at || Date.now()).toLocaleString()}</div>
<hr>
<div class="small">Customer: ${order.customer_name || "Walk-in"}</div>
${order.customer_phone ? `<div class="small">Phone: ${order.customer_phone}</div>` : ""}
<hr>
<table>
${items.map(it => `<tr><td>${it.product_name}<br><span class="small">${it.quantity} × ৳${it.price}</span></td><td style="text-align:right">৳${(it.price*it.quantity).toFixed(2)}</td></tr>`).join("")}
</table>
<hr>
<div class="row"><span>Subtotal</span><span>৳${totals.subtotal.toFixed(2)}</span></div>
${totals.discount ? `<div class="row"><span>Discount</span><span>-৳${Number(totals.discount).toFixed(2)}</span></div>` : ""}
<div class="row bold" style="font-size:${totalFs}"><span>TOTAL</span><span>৳${totals.total.toFixed(2)}</span></div>
<hr>
<div class="row small"><span>Payment</span><span style="text-transform:uppercase">${totals.paymentMethod}</span></div>
${totals.paymentMethod === "cash" ? `
<div class="row small"><span>Received</span><span>৳${Number(totals.amountReceived).toFixed(2)}</span></div>
<div class="row small"><span>Change</span><span>৳${totals.change.toFixed(2)}</span></div>` : ""}
<hr>
<div class="center small">Thank you!</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);};</script>
</body></html>`;
  w.document.write(html);
  w.document.close();
}
