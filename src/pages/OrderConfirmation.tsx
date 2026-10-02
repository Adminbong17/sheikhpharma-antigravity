import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle, Package, Truck, CreditCard, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import html2canvas from "html2canvas";

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const { formatPrice } = useCurrency();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    supabase
      .from("orders")
      .select("*, order_items(*, products(name, image_url))")
      .eq("id", orderId)
      .single()
      .then(({ data }) => {
        setOrder(data);
        setLoading(false);
      });
  }, [orderId]);

  const copyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("ট্র্যাকিং কোড কপি হয়েছে!");
  };

  const saveAsJpg = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `order-${order?.order_number || "details"}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
      toast.success("অর্ডার ডিটেইলস সেভ হয়েছে!");
    } catch {
      toast.error("সেভ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-lg">
        {/* Saveable area */}
        <div ref={cardRef} className="bg-white rounded-2xl p-6 space-y-5">
          {/* Thank You Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">🎉 ধন্যবাদ! অর্ডার সফল হয়েছে!</h1>
            <p className="text-muted-foreground">আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে।</p>
          </div>

          {order && (
            <div className="space-y-4">
              {/* Order Info Card */}
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">অর্ডার নম্বর</span>
                  <span className="font-mono font-bold text-primary">#{String(order.order_number ?? 0).padStart(11, '0')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">পেমেন্ট</span>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize text-sm font-medium">
                      {order.payment_method === "cod" ? "Cash on Delivery" : 
                       order.payment_method === "bkash" ? "bKash" : 
                       order.payment_method?.includes("uddokta") ? "UddoktaPay" : "Online Payment"}
                    </span>
                  </div>
                </div>
                {/* Payment Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">পেমেন্ট স্ট্যাটাস</span>
                  {order.payment_method === "cod" && order.transaction_id ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      ডেলিভারি চার্জ পেইড — {formatPrice(order.delivery_charge || 0)}
                    </Badge>
                  ) : order.payment_method !== "cod" && order.transaction_id ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Paid — {formatPrice(order.total)}
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      Unpaid
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">অর্ডার স্ট্যাটাস</span>
                  <Badge className="bg-primary/10 text-primary">
                    {order.status === "pending" ? "পেন্ডিং" : order.status === "processing" ? "প্রসেসিং" : order.status}
                  </Badge>
                </div>
                {order.transaction_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ট্রানজেকশন ID</span>
                    <span className="font-mono text-xs">{order.transaction_id}</span>
                  </div>
                )}
                {order.steadfast_tracking_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ট্র্যাকিং কোড</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-bold">{order.steadfast_tracking_code}</span>
                      <button onClick={() => copyTrackingCode(order.steadfast_tracking_code)} className="text-muted-foreground hover:text-primary transition">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {order.coupon_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">কুপন</span>
                    <span className="text-sm font-medium">{order.coupon_code} (-৳{order.coupon_discount})</span>
                  </div>
                )}
                {(order.delivery_charge ?? 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ডেলিভারি চার্জ</span>
                    <span className="text-sm font-medium">{formatPrice(order.delivery_charge)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="font-semibold">মোট</span>
                  <span className="text-lg font-bold text-primary">{formatPrice(order.total)}</span>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> অর্ডার আইটেম
                </h3>
                <div className="space-y-2">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.products?.image_url ? (
                        <img src={item.products.image_url} alt="" className="h-10 w-10 rounded-md object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-lg">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name || item.products?.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="rounded-xl border bg-primary/5 p-4 flex items-start gap-3">
                <Truck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">ডেলিভারি তথ্য</p>
                  <p className="text-xs text-muted-foreground mt-1">{order.customer_name} • {order.customer_phone}</p>
                  <p className="text-xs text-muted-foreground">{[order.customer_address, order.customer_upazilla, order.customer_zilla, order.customer_division].filter(Boolean).join(", ")}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions — outside the saveable area */}
        <div className="flex flex-col gap-3 pt-4 max-w-lg mx-auto">
          <Button onClick={saveAsJpg} disabled={saving || !order} variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" />
            {saving ? "সেভ হচ্ছে..." : "JPG হিসেবে সেভ করুন"}
          </Button>
          <div className="flex gap-3">
            <Link to="/dashboard/orders" className="flex-1">
              <Button className="w-full">আমার অর্ডার দেখুন</Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="outline" className="w-full">আরো শপিং করুন</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmation;
