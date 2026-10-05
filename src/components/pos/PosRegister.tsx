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
  ShoppingCart, Banknote, X, ScanLine, Receipt, Eye, RefreshCw,
  Clock, CheckCircle2, AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeBdPhone } from "@/lib/phone";
import { logActivity } from "@/lib/logActivity";
import { sendToCashBook } from "@/lib/cashbook";

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
  
  // Recent completed sales state
  const [recentOpen, setRecentOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<any | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [receiptWidth, setReceiptWidth] = useState<"80mm" | "56mm">(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem("pos_receipt_width") : null;
    return v === "56mm" ? "56mm" : "80mm";
  });

  // ---- Load active register session ----
  const loadActiveSession = async () => {
    if (!user) return;
    try {
      let q = supabase
        .from("pos_register_sessions")
        .select("*")
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1);
      if (vendorId) q = q.eq("vendor_id", vendorId);
      const { data } = await q;
      if (data && data[0]) {
        setActiveSession(data[0]);
      }
    } catch (e) {
      console.error("Session load error:", e);
    }
  };

  useEffect(() => {
    loadActiveSession();
  }, [user, vendorId]);

  // ---- Load recent POS sales ----
  const loadRecentSales = async () => {
    setRecentLoading(true);
    try {
      let q = supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("is_pos_sale", true)
        .order("created_at", { ascending: false })
        .limit(30);
      if (vendorId) q = q.eq("vendor_id", vendorId);
      const { data, error } = await q;
      if (!error && data) {
        setRecentSales(data);
      }
    } catch (e) {
      console.error("loadRecentSales error:", e);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    loadRecentSales();
  }, [vendorId]);

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

  // ---- Cart management ----
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
    if (!cart.length) return toast.error("কার্ট খালি রয়েছে");
    if (!user) return toast.error("লগইন আবশ্যক");
    if (paymentMethod === "cash" && (Number(amountReceived) || 0) < total) {
      return toast.error("গৃহীত নগদ টাকা মোট মূল্যের চেয়ে কম");
    }
    if (["bkash", "nagad", "rocket"].includes(paymentMethod) && !trxId.trim()) {
      return toast.error("ট্রানজেকশন আইডি (TrxID) লিখুন");
    }
    if (paymentMethod === "due" && !customerPhone.trim()) {
      return toast.error("বাকিতে বিক্রয়ের জন্য কাস্টমারের ফোন নম্বর আবশ্যক");
    }

    setSubmitting(true);
    try {
      const isDue = paymentMethod === "due";
      const orderInsert: any = {
        user_id: user?.id || null,
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

      // Record in Cash Book for paid sales
      if (!isDue && total > 0) {
        try {
          await sendToCashBook({
            type: "cash_in",
            amount: total,
            transaction_id: `POS-${order.order_number || order.id}`,
            description: `POS Sale #${order.order_number} (${customerName.trim() || "Walk-in Customer"})`,
            category: "POS Sales",
            transaction_date: new Date().toISOString(),
            created_by: user.id,
          });
        } catch (cbErr) {
          console.warn("CashBook note:", cbErr);
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

      // Prepend to live recent sales list
      setRecentSales((prev) => [
        {
          ...order,
          order_items: itemsInsert.map((item, idx) => ({ ...item, id: `pos-${Date.now()}-${idx}` })),
        },
        ...prev,
      ]);

      logActivity({ action: "pos_sale", details: `Order #${order.order_number} • ৳${total}` });
      toast.success(`বিক্রয় সফল হয়েছে! Order #${order.order_number}`);

      // Print receipt (80mm or 56mm based on preference)
      printReceipt(order, cart, { subtotal, discount, total, paymentMethod, amountReceived, change }, receiptWidth);

      // Reset cart and inputs
      setCart([]);
      setDiscount(0);
      setCustomerName("");
      setCustomerPhone("");
      setAmountReceived("");
      setTrxId("");
      setPaymentMethod("cash");
      setPaymentDialog(false);
    } catch (err: any) {
      console.error("Sale complete error:", err);
      toast.error("বিক্রয় সংরক্ষণ ব্যর্থ হয়েছে: " + (err.message || "Unknown error"));
    }
    setSubmitting(false);
  };

  // ---- Hold sale ----
  const holdSale = async () => {
    if (!cart.length) return toast.error("হোল্ড করার মতো কোনো পণ্য নেই");
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
    toast.success(`হোল্ড সম্পন্ন • ${ref}`);
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
    toast.success("হোল্ড করা সেল কার্টে ফিরিয়ে আনা হয়েছে");
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr,420px] h-[calc(100vh-120px)]">
      {/* LEFT — products grid */}
      <Card className="flex flex-col overflow-hidden shadow-xs">
        <div className="border-b p-3 flex flex-wrap gap-2 items-center bg-card">
          <ScanLine className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={searchRef}
            autoFocus
            placeholder="বারকোড স্ক্যান বা ওষুধের নাম সার্চ করুন…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] h-9 text-xs sm:text-sm"
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
            <option value="80mm">80mm প্রিন্ট</option>
            <option value="56mm">56mm প্রিন্ট</option>
          </select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { setRecentOpen(true); loadRecentSales(); }}
            className="h-9 text-xs gap-1.5 shrink-0 bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary font-medium"
          >
            <Receipt className="h-4 w-4" /> 
            <span>সেলস হিস্ট্রি</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground font-bold">
              {recentSales.length}
            </Badge>
          </Button>
          <Button variant="outline" size="sm" onClick={openHeldList} className="h-9 text-xs shrink-0">
            <FolderOpen className="h-4 w-4 mr-1" /> Held
          </Button>
        </div>

        <ScrollArea className="flex-1 bg-muted/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-3">
            {loading && <div className="col-span-full text-center text-sm text-muted-foreground py-8">ওষুধ খোঁজা হচ্ছে…</div>}
            {!loading && products.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">কোনো ওষুধ পাওয়া যায়নি</div>
            )}
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="group rounded-lg border bg-card p-2.5 text-left hover:border-primary hover:shadow-md transition-all active:scale-[.98] flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square rounded-md bg-muted/40 overflow-hidden mb-2 relative">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold line-clamp-2 mb-1 text-foreground leading-snug">{p.name}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-1">
                  <span className="text-sm font-bold text-primary">৳{p.price}</span>
                  {typeof p.stock === "number" && (
                    <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-[10px] h-4 px-1 font-medium">
                      {p.stock > 0 ? `${p.stock} পিস` : "স্টক নেই"}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* RIGHT — cart */}
      <Card className="flex flex-col overflow-hidden shadow-xs border-primary/20">
        <div className="border-b p-3 bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm">POS Cart ({cart.reduce((s, it) => s + it.quantity, 0)})</h3>
          </div>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCart([])}
              className="h-7 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> কার্ট ক্লিয়ার
            </Button>
          )}
        </div>

        {/* Cart items scroll */}
        <ScrollArea className="flex-1 p-3">
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs text-center space-y-2">
              <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
              <p>কার্টে কোনো ওষুধ যোগ করা হয়নি।<br />বামে থাকা ওষুধে ক্লিক করুন বা বারকোড স্ক্যান করুন।</p>
            </div>
          )}
          <div className="space-y-2">
            {cart.map((it) => (
              <div
                key={it.product_id}
                className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs shadow-2xs"
              >
                <div className="flex-1 pr-2 min-w-0">
                  <p className="font-semibold text-foreground truncate">{it.product_name}</p>
                  <p className="text-muted-foreground">৳{it.price} × {it.quantity} = <strong className="text-primary">৳{(it.price * it.quantity).toFixed(2)}</strong></p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateQty(it.product_id, it.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-7 text-center font-bold">{it.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateQty(it.product_id, it.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10 ml-1"
                    onClick={() => removeItem(it.product_id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Cart summary & Checkout footer */}
        <div className="border-t p-3 bg-muted/20 space-y-3">
          {/* Customer fields */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">কাস্টমার নাম</Label>
              <Input
                placeholder="Walk-in Customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">ফোন নম্বর (ঐচ্ছিক)</Label>
              <Input
                placeholder="01XXXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Discount & Totals */}
          <div className="space-y-1.5 pt-1 text-xs border-t border-border/40">
            <div className="flex justify-between text-muted-foreground">
              <span>সাবটোটাল</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ডিসকাউন্ট (৳)</span>
              <Input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="h-7 w-20 text-xs text-right bg-background"
              />
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm font-bold pt-0.5">
              <span>সর্বমোট (Total)</span>
              <span className="text-primary text-base">৳{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!cart.length}
              onClick={holdSale}
              className="text-xs h-9"
            >
              <Pause className="h-3.5 w-3.5 mr-1" /> হোল্ড করুন
            </Button>
            <Button
              size="sm"
              disabled={!cart.length}
              onClick={() => {
                setAmountReceived(String(total));
                setPaymentDialog(true);
              }}
              className="text-xs h-9 bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
            >
              <Banknote className="h-4 w-4 mr-1" /> পেমেন্ট ও সেল
            </Button>
          </div>
        </div>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              পেমেন্ট গ্রহণ ও বিক্রয় সম্পন্ন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">পরিশোধযোগ্য সর্বমোট</p>
                <p className="text-xl font-black text-primary">৳{total.toFixed(2)}</p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-2 py-1">
                {cart.reduce((s, it) => s + it.quantity, 0)} টি আইটেম
              </Badge>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">পেমেন্ট মাধ্যম নির্বাচন করুন:</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "cash", label: "💵 ক্যাশ (Cash)" },
                  { id: "bkash", label: "📱 বিকাশ (bKash)" },
                  { id: "nagad", label: "📱 নগদ (Nagad)" },
                  { id: "rocket", label: "📱 রকেট (Rocket)" },
                  { id: "card", label: "💳 কার্ড (Card)" },
                  { id: "due", label: "⏳ বাকি (Due)" },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`p-2 rounded-md border text-center font-medium transition-all ${
                      paymentMethod === pm.id
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash details */}
            {paymentMethod === "cash" && (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold">কাস্টমার থেকে প্রাপ্ত টাকা (Received):</Label>
                  <Input
                    type="number"
                    min={0}
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-32 h-8 text-right font-bold text-xs bg-background"
                  />
                </div>
                <div className="flex items-center justify-between pt-1 border-t text-xs">
                  <span className="text-muted-foreground">ফেরত দিতে হবে (Change):</span>
                  <span className="font-bold text-green-600 text-sm">৳{change.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Mobile / Card TrxId */}
            {["bkash", "nagad", "rocket", "card"].includes(paymentMethod) && (
              <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                <Label className="text-xs font-semibold">Transaction ID / TrxID (বাধ্যতামূলক):</Label>
                <Input
                  placeholder="যেমন: TRXB12345678"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="h-8 text-xs bg-background font-mono uppercase"
                />
              </div>
            )}

            {/* Due details */}
            {paymentMethod === "due" && (
              <div className="p-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 space-y-1">
                <p className="font-semibold text-yellow-800 dark:text-yellow-400">বাকি বিক্রয় মোড সক্রিয়</p>
                <p className="text-[11px] text-muted-foreground">
                  কাস্টমারের নাম: <strong>{customerName || "Walk-in"}</strong> | ফোন: <strong>{customerPhone || "দেওয়া হয়নি"}</strong>
                </p>
                {!customerPhone && (
                  <p className="text-[11px] text-destructive font-semibold mt-1">⚠ বাকি ট্র্যাক করতে কাস্টমারের ফোন নম্বর দিন।</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setPaymentDialog(false)} disabled={submitting}>
              <X className="h-4 w-4 mr-1" /> বাতিল
            </Button>
            <Button size="sm" onClick={completeSale} disabled={submitting} className="bg-primary text-primary-foreground font-bold">
              <Printer className="h-4 w-4 mr-1" /> {submitting ? "সংরক্ষণ হচ্ছে..." : "সম্পন্ন ও প্রিন্ট"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Held list dialog */}
      <Dialog open={holdDialog} onOpenChange={setHoldDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              হোল্ড করা বিক্রয় তালিকা (Held Sales)
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {heldLoading && <p className="text-center text-sm py-6">লোড হচ্ছে…</p>}
            {!heldLoading && heldList.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">কোনো হোল্ড করা বিক্রয় নেই</p>
            )}
            <div className="space-y-2">
              {heldList.map((h) => (
                <div key={h.id} className="flex items-center justify-between border rounded-lg p-3 hover:border-primary transition-colors bg-card">
                  <div>
                    <p className="font-mono text-xs font-bold text-primary">{h.hold_reference}</p>
                    <p className="text-xs font-medium">{h.customer_name || "Walk-in"} • {h.customer_phone || "—"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(h.items as any[])?.length || 0} টি ওষুধ • ৳{Number(h.total).toFixed(2)} • {new Date(h.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-xs" onClick={() => resumeHeld(h)}>রিজিউম</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 text-destructive p-0"
                      onClick={async () => {
                        await supabase.from("pos_held_sales").delete().eq("id", h.id);
                        setHeldList((l) => l.filter((x) => x.id !== h.id));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Recent POS Sales Dialog */}
      <Dialog open={recentOpen} onOpenChange={setRecentOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="flex flex-row items-center justify-between pr-6">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              আজকের কাউন্টার বিক্রয় হিস্ট্রি (Recent POS Sales)
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={loadRecentSales} disabled={recentLoading} className="h-7 text-xs gap-1">
              <RefreshCw className={`h-3.5 w-3.5 ${recentLoading ? "animate-spin" : ""}`} /> রিফ্রেশ
            </Button>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh]">
            {recentLoading && <p className="text-center text-sm py-8 text-muted-foreground">লোড হচ্ছে…</p>}
            {!recentLoading && recentSales.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">এখনও কোনো কাউন্টার বিক্রয় সংরক্ষিত নেই</p>
            )}

            <div className="space-y-2.5 p-1">
              {recentSales.map((sale) => {
                const isDue = sale.payment_method === "due" || sale.status === "pending";
                const orderItems = sale.order_items || [];
                const itemCount = orderItems.reduce((s: number, it: any) => s + (Number(it.quantity) || 1), 0);
                
                return (
                  <div key={sale.id} className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          #POS-{String(sale.order_number || sale.id.slice(0, 6)).padStart(6, "0")}
                        </span>
                        <Badge variant={isDue ? "destructive" : "default"} className="text-[10px] h-4 px-1.5 font-medium uppercase">
                          {sale.payment_method || "CASH"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        {sale.customer_name || "Walk-in Customer"} 
                        {sale.customer_phone && <span className="text-muted-foreground font-normal ml-1">({sale.customer_phone})</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        আইটেম: {orderItems.map((it: any) => `${it.product_name} (${it.quantity})`).join(", ") || `${itemCount} টি ওষুধ`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">মোট টাকা</p>
                        <p className="text-sm font-black text-primary">৳{Number(sale.total).toFixed(2)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 border-primary/40 hover:bg-primary/5 text-primary"
                        onClick={() => {
                          const cartFormat: CartItem[] = (sale.order_items || []).map((it: any) => ({
                            product_id: it.product_id,
                            product_name: it.product_name,
                            price: it.price,
                            quantity: it.quantity,
                            image_url: null,
                            stock: null,
                          }));
                          printReceipt(
                            sale,
                            cartFormat,
                            {
                              subtotal: Number(sale.total) + Number(sale.coupon_discount || 0),
                              discount: sale.coupon_discount || 0,
                              total: sale.total,
                              paymentMethod: sale.payment_method || "cash",
                              amountReceived: sale.amount_received || sale.total,
                              change: sale.change_returned || 0,
                            },
                            receiptWidth
                          );
                        }}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        রিসিপ্ট প্রিন্ট
                      </Button>
                    </div>
                  </div>
                );
              })}
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
  const orderNum = order.order_number ? String(order.order_number).padStart(6, "0") : String(order.id || "").slice(0, 8);
  
  const html = `<!doctype html><html><head><title>Receipt #${orderNum}</title>
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
<div class="center bold" style="font-size:${titleFs}">SHEIKH PHARMA</div>
<div class="center small">POS Counter Sales Receipt</div>
<div class="center small">Invoice #${orderNum}</div>
<div class="center small">${new Date(order.created_at || Date.now()).toLocaleString()}</div>
<hr>
<div class="small">Customer: ${order.customer_name || "Walk-in Customer"}</div>
${order.customer_phone ? `<div class="small">Phone: ${order.customer_phone}</div>` : ""}
<hr>
<table>
${items.map(it => `<tr><td>${it.product_name}<br><span class="small">${it.quantity} × ৳${it.price}</span></td><td style="text-align:right">৳${(it.price*it.quantity).toFixed(2)}</td></tr>`).join("")}
</table>
<hr>
<div class="row"><span>Subtotal</span><span>৳${Number(totals.subtotal).toFixed(2)}</span></div>
${totals.discount ? `<div class="row"><span>Discount</span><span>-৳${Number(totals.discount).toFixed(2)}</span></div>` : ""}
<div class="row bold" style="font-size:${totalFs}"><span>TOTAL</span><span>৳${Number(totals.total).toFixed(2)}</span></div>
<hr>
<div class="row small"><span>Payment</span><span style="text-transform:uppercase">${totals.paymentMethod}</span></div>
${totals.paymentMethod === "cash" ? `
<div class="row small"><span>Received</span><span>৳${Number(totals.amountReceived).toFixed(2)}</span></div>
<div class="row small"><span>Change</span><span>৳${Number(totals.change).toFixed(2)}</span></div>` : ""}
<hr>
<div class="center small" style="margin-top:6px">Thank you for shopping with us!</div>
<div class="center small">Hotline: 01720191100</div>
<script>
window.onload = function() {
  window.print();
  setTimeout(() => window.close(), 1000);
};
</script>
</body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}
