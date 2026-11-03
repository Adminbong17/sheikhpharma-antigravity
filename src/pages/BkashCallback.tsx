import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trackPurchase } from "@/lib/fbPixelEvents";
import { useMarketingSettings } from "@/hooks/useMarketingSettings";

const BkashCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"verifying" | "failed">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const { data: marketingSettings } = useMarketingSettings();

  const recordFailedBkashPayment = async (targetOrderId: string, reason: string, isLab: boolean) => {
    try {
      if (isLab) {
        const { data: booking } = await (supabase.from("lab_test_bookings" as any) as any)
          .select("*")
          .eq("id", targetOrderId)
          .maybeSingle();
        if (booking && booking.customer_phone) {
          await supabase.functions.invoke("save-abandoned-cart", {
            body: {
              customer_name: booking.customer_name,
              customer_phone: booking.customer_phone,
              customer_address: booking.customer_address,
              customer_division: booking.customer_division,
              items: booking.items || [],
              subtotal: booking.total || 0,
              notes: `বিকাশ পেমেন্ট ব্যর্থ: ${reason}`,
              notify_admin: true,
              event_type: "payment_failed",
            },
          });
        }
        await (supabase.from("lab_test_bookings" as any) as any).delete().eq("id", targetOrderId);
      } else {
        const { data: ord } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("id", targetOrderId)
          .maybeSingle();
        if (ord && ord.customer_phone) {
          await supabase.functions.invoke("save-abandoned-cart", {
            body: {
              customer_name: ord.customer_name,
              customer_phone: ord.customer_phone,
              customer_address: ord.customer_address,
              customer_division: ord.customer_division,
              customer_zilla: ord.customer_zilla,
              customer_upazilla: ord.customer_upazilla,
              items: (ord.order_items || []).map((i: any) => ({
                name: i.product_name,
                price: i.price,
                quantity: i.quantity,
              })),
              subtotal: ord.total,
              notes: `বিকাশ পেমেন্ট ব্যর্থ: ${reason}`,
              notify_admin: true,
              event_type: "payment_failed",
            },
          });
        }
        await supabase.from("order_items").delete().eq("order_id", targetOrderId);
        await supabase.from("orders").delete().eq("id", targetOrderId);
      }
    } catch (e) {
      console.error("Failed to record failed bKash payment:", e);
    }
  };

  useEffect(() => {
    const paymentID = searchParams.get("paymentID");
    const bkashStatus = searchParams.get("status");
    const orderId = sessionStorage.getItem("bkash_order_id");
    const paymentType = sessionStorage.getItem("bkash_payment_type") || "full_payment";
    const isLab = paymentType === "lab_service";

    if (!paymentID || bkashStatus !== "success" || !orderId) {
      if (orderId) {
        recordFailedBkashPayment(orderId, bkashStatus === "cancel" ? "গ্রাহক বাতিল করেছেন" : "পেমেন্ট ব্যর্থ হয়েছে", isLab);
      }
      sessionStorage.removeItem("bkash_order_id");
      sessionStorage.removeItem("bkash_payment_type");
      setStatus("failed");
      return;
    }

    const verify = async () => {
      try {
        const res = await supabase.functions.invoke("bkash-execute-payment", {
          body: { paymentID, order_id: orderId, payment_type: paymentType },
        });

        if (res.data?.success) {
          clearCart();
          sessionStorage.removeItem("bkash_order_id");
          sessionStorage.removeItem("bkash_payment_type");

          if (paymentType === "lab_service") {
            toast.success("পেমেন্ট সফল! ল্যাব টেস্ট বুকিং কনফার্ম হয়েছে।");
            navigate("/dashboard/orders", { replace: true });
          } else {
            if (marketingSettings?.pixel_enabled && orderId) {
              const { data: orderData } = await supabase.from("orders").select("total").eq("id", orderId).single();
              if (orderData) {
                trackPurchase({ order_id: orderId, value: orderData.total, currency: marketingSettings.default_currency || "BDT" });
              }
            }
            toast.success("bKash পেমেন্ট সফল হয়েছে!");
            navigate(`/order-confirmation?order_id=${orderId}`, { replace: true });
          }
        } else {
          const statusCode = res.data?.statusCode || "";
          const statusMessage = res.data?.statusMessage || "";
          if (orderId) {
            await recordFailedBkashPayment(orderId, statusMessage || "পেমেন্ট ভেরিফাই করা যায়নি", isLab);
          }
          sessionStorage.removeItem("bkash_order_id");
          sessionStorage.removeItem("bkash_payment_type");

          // Set specific error messages for known failure cases
          if (statusCode === "2062" || statusMessage.toLowerCase().includes("duplicate")) {
            setErrorMessage("একই ওয়ালেট থেকে একই পরিমাণের পেমেন্ট সম্প্রতি করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।");
          } else if (statusCode === "2068" || statusMessage.toLowerCase().includes("insufficient")) {
            setErrorMessage("bKash ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই।");
          } else {
            setErrorMessage(statusMessage || "bKash পেমেন্ট ভেরিফাই করা যায়নি");
          }
          setStatus("failed");
          toast.error(statusMessage || "bKash পেমেন্ট ভেরিফাই করা যায়নি");
        }
      } catch {
        if (orderId) {
          await recordFailedBkashPayment(orderId, "সিস্টেম এক্সেপশন", isLab);
        }
        sessionStorage.removeItem("bkash_order_id");
        sessionStorage.removeItem("bkash_payment_type");
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
            <h1 className="text-2xl font-bold">bKash পেমেন্ট যাচাই করা হচ্ছে...</h1>
            <p className="text-muted-foreground">একটু অপেক্ষা করুন, পেমেন্ট কনফার্ম না হওয়া পর্যন্ত অর্ডার পেন্ডিং থাকবে।</p>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">bKash পেমেন্ট ব্যর্থ বা বাতিল</h1>
            <p className="text-muted-foreground">
              {errorMessage || "পেমেন্ট সম্পন্ন হয়নি। অর্ডার প্লেস হয়নি। আপনার পণ্যগুলো কার্টে আছে — আবার চেষ্টা করুন।"}
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

export default BkashCallback;
