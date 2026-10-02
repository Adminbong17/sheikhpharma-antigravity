import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { trackPurchase } from "@/lib/fbPixelEvents";
import { useMarketingSettings } from "@/hooks/useMarketingSettings";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"verifying" | "failed">("verifying");
  const { data: marketingSettings } = useMarketingSettings();

  useEffect(() => {
    const invoiceId = searchParams.get("invoice_id");
    const orderId = searchParams.get("order_id");
    const cancelled = searchParams.get("cancelled");
    const type = searchParams.get("type") as "cod_delivery" | "full_payment" | "lab_service" | null;
    const isLabService = type === "lab_service";

    if (cancelled === "true" || !invoiceId || !orderId) {
      if (orderId) {
        (async () => {
          if (isLabService) {
            await (supabase.from("lab_test_bookings" as any) as any).delete().eq("id", orderId);
          } else {
            await supabase.from("order_items").delete().eq("order_id", orderId);
            await supabase.from("orders").delete().eq("id", orderId);
          }
        })();
      }
      sessionStorage.removeItem("pending_payment_order_id");
      sessionStorage.removeItem("pending_payment_type");
      setStatus("failed");
      return;
    }

    const verify = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          if (isLabService) {
            await (supabase.from("lab_test_bookings" as any) as any).delete().eq("id", orderId);
          } else {
            await supabase.from("order_items").delete().eq("order_id", orderId);
            await supabase.from("orders").delete().eq("id", orderId);
          }
          sessionStorage.removeItem("pending_payment_order_id");
          sessionStorage.removeItem("pending_payment_type");
          setStatus("failed");
          return;
        }

        const res = await supabase.functions.invoke("uddoktapay-verify", {
          body: { invoice_id: invoiceId, order_id: orderId, payment_type: type },
        });

        if (res.data?.success) {
          clearCart();
          sessionStorage.removeItem("pending_payment_order_id");
          sessionStorage.removeItem("pending_payment_type");

          if (isLabService) {
            await (supabase.from("lab_test_bookings" as any) as any)
              .update({ payment_status: "paid", transaction_id: invoiceId })
              .eq("id", orderId);
            toast.success("পেমেন্ট সফল! ল্যাব টেস্ট বুকিং কনফার্ম হয়েছে।");
            navigate("/dashboard/orders", { replace: true });
          } else {
            if (marketingSettings?.pixel_enabled && orderId) {
              const { data: orderData } = await supabase.from("orders").select("total").eq("id", orderId).single();
              if (orderData) {
                trackPurchase({ order_id: orderId, value: orderData.total, currency: marketingSettings.default_currency || "BDT" });
              }
            }
            toast.success("পেমেন্ট সফল হয়েছে!");
            navigate(`/order-confirmation?order_id=${orderId}`, { replace: true });
          }
        } else {
          if (isLabService) {
            await (supabase.from("lab_test_bookings" as any) as any).delete().eq("id", orderId);
          } else {
            await supabase.from("order_items").delete().eq("order_id", orderId);
            await supabase.from("orders").delete().eq("id", orderId);
          }
          sessionStorage.removeItem("pending_payment_order_id");
          sessionStorage.removeItem("pending_payment_type");
          setStatus("failed");
          toast.error("পেমেন্ট ভেরিফাই করা যায়নি — বাতিল করা হয়েছে");
        }
      } catch {
        if (isLabService) {
          await (supabase.from("lab_test_bookings" as any) as any).delete().eq("id", orderId);
        } else {
          await supabase.from("order_items").delete().eq("order_id", orderId);
          await supabase.from("orders").delete().eq("id", orderId);
        }
        sessionStorage.removeItem("pending_payment_order_id");
        sessionStorage.removeItem("pending_payment_type");
        setStatus("failed");
      }
    };

    verify();
  }, [searchParams, navigate, clearCart]);

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-20 min-h-[70vh] flex flex-col items-center justify-center gap-6 text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <h1 className="text-2xl font-bold">পেমেন্ট যাচাই করা হচ্ছে...</h1>
            <p className="text-muted-foreground">একটু অপেক্ষা করুন, পেমেন্ট কনফার্ম না হওয়া পর্যন্ত অর্ডার পেন্ডিং থাকবে।</p>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">পেমেন্ট ব্যর্থ বা বাতিল</h1>
            <p className="text-muted-foreground">
              পেমেন্ট সম্পন্ন হয়নি। অর্ডার প্লেস হয়নি। আপনার পণ্যগুলো কার্টে আছে — আবার চেষ্টা করুন।
            </p>
            <Link to="/checkout">
              <Button variant="outline">চেকআউটে ফিরুন</Button>
            </Link>
          </>
        )}
      </main>
      <Footer />
    </>
  );
};

export default PaymentCallback;
