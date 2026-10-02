import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";
import { sendOrderSmsNotify } from "@/lib/sendOrderSms";
import { toast } from "sonner";
import { ShoppingBag, ArrowLeft, Truck, CreditCard, Ticket, X, MapPin, Star, BookOpen } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Link } from "react-router-dom";
import { isEffectivePreorder } from "@/lib/preorder";
import { trackInitiateCheckout, trackPurchase } from "@/lib/fbPixelEvents";
import { useMarketingSettings } from "@/hooks/useMarketingSettings";
import { useValidateCoupon, type Coupon } from "@/hooks/useCoupons";
import bkashLogo from "@/assets/bkash-logo.png";
import uddoktapayLogo from "@/assets/uddoktapay-logo.png";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface SavedAddress {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  division: string;
  zilla: string | null;
  upazilla: string | null;
  is_default: boolean;
}

interface DeliveryZone {
  id: string;
  division: string;
  zilla: string | null;
  upazilla: string | null;
  area: string | null;
  charge: number;
}

const normalizeBdPhone = (value?: string | null) => {
  const digits = (value || "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("880")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 10 && digits.startsWith("1")) return `0${digits}`;

  return digits;
};

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const isLabTestOrder = items.length > 0 && items.every(i => i.id.startsWith("lab-"));
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const { b } = useLanguage();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "uddokta_pay" | "bkash">("cod");
  const [codGateway, setCodGateway] = useState<"bkash" | "uddokta_pay">("bkash");
  const [defaultCodCharge, setDefaultCodCharge] = useState(0);
  const [bkashActive, setBkashActive] = useState(false);
  const [bkashConfiguredActive, setBkashConfiguredActive] = useState(false);
  const [bkashUatMode, setBkashUatMode] = useState(false);
  const [bkashUatPhones, setBkashUatPhones] = useState<string[]>([]);
  const [uddoktaPayActive, setUddoktaPayActive] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const { data: marketingSettings } = useMarketingSettings();
  const validateCoupon = useValidateCoupon();

  // Saved addresses
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ["checkout-saved-addresses", user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("user_addresses" as any) as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      return (data || []) as SavedAddress[];
    },
    enabled: !!user,
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isFreeShipping, setIsFreeShipping] = useState(false);

  // Location selections
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedZilla, setSelectedZilla] = useState("");
  const [selectedUpazilla, setSelectedUpazilla] = useState("");
  const [selectedArea, setSelectedArea] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    notes: "",
  });

  const candidatePhones = useMemo(
    () =>
      [...new Set([
        form.phone,
        user?.phone,
        user?.user_metadata?.phone,
        ...savedAddresses.map((addr) => addr.phone),
      ].map((phone) => normalizeBdPhone(String(phone || ""))).filter(Boolean))],
    [form.phone, savedAddresses, user?.phone, user?.user_metadata?.phone]
  );

  // Abandoned cart tracking
  const abandonedCartIdRef = useRef<string | null>(null);
  const orderPlacedRef = useRef(false);
  const shippingFormRef = useRef<HTMLDivElement>(null);
  const formRef = useRef(form);
  const divisionRef = useRef(selectedDivision);
  const zillaRef = useRef(selectedZilla);
  const upazillaRef = useRef(selectedUpazilla);
  const areaRef = useRef(selectedArea);

  // Keep refs in sync
  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { divisionRef.current = selectedDivision; }, [selectedDivision]);
  useEffect(() => { zillaRef.current = selectedZilla; }, [selectedZilla]);
  useEffect(() => { upazillaRef.current = selectedUpazilla; }, [selectedUpazilla]);
  useEffect(() => { areaRef.current = selectedArea; }, [selectedArea]);

  const saveAbandonedCart = useCallback(async () => {
    if (orderPlacedRef.current) return;
    const f = formRef.current;
    // Only save if at least one field is filled
    if (!f.fullName && !f.phone && !f.address && !divisionRef.current) return;

    try {
      const cartItems = items.map(i => ({
        product_id: i.id,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      }));

      const payload = {
        user_id: user?.id || null,
        customer_name: f.fullName || null,
        customer_phone: f.phone || null,
        customer_address: f.address || null,
        customer_division: divisionRef.current || null,
        customer_zilla: zillaRef.current || null,
        customer_upazilla: upazillaRef.current || null,
        items: cartItems,
        subtotal: totalPrice,
        notes: f.notes || null,
        incomplete_order_id: abandonedCartIdRef.current,
      };

      const { data } = await supabase.functions.invoke("save-abandoned-cart", { body: payload });
      if (data?.id) {
        abandonedCartIdRef.current = data.id;
      }
    } catch {}
  }, [items, totalPrice, user]);

  // Auto-save on field change (debounced) and on leave
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.fullName || form.phone || form.address) {
        saveAbandonedCart();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [form.fullName, form.phone, form.address, selectedDivision, selectedZilla, selectedUpazilla, saveAbandonedCart]);

  // Save on page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (orderPlacedRef.current) return;
      const f = formRef.current;
      if (!f.fullName && !f.phone && !f.address) return;

      const cartItems = items.map(i => ({
        product_id: i.id, name: i.name, quantity: i.quantity, price: i.price,
      }));

      const payload = {
        user_id: user?.id || null,
        customer_name: f.fullName || null,
        customer_phone: f.phone || null,
        customer_address: f.address || null,
        customer_division: divisionRef.current || null,
        customer_zilla: zillaRef.current || null,
        customer_upazilla: upazillaRef.current || null,
        items: cartItems,
        subtotal: totalPrice,
        notes: f.notes || null,
        incomplete_order_id: abandonedCartIdRef.current,
      };

      // Use sendBeacon for reliable save on page close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-abandoned-cart`;
      navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: "application/json" }));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [items, totalPrice, user]);

  // Delete abandoned cart entry if order is successfully placed
  const markOrderPlaced = useCallback(async () => {
    orderPlacedRef.current = true;
    if (abandonedCartIdRef.current) {
      try {
        await supabase.functions.invoke("save-abandoned-cart", {
          body: { delete_id: abandonedCartIdRef.current },
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    // Fetch default COD charge + all delivery zones + UAT mode
    supabase.from("site_settings" as any).select("cod_delivery_charge, bkash_active, uddoktapay_active, bkash_uat_mode, bkash_uat_phones").limit(1).single().then(({ data }) => {
      if (data) {
        setDefaultCodCharge(Number((data as any).cod_delivery_charge) || 0);
        setUddoktaPayActive((data as any).uddoktapay_active ?? false);
        setBkashConfiguredActive((data as any).bkash_active ?? false);
        setBkashUatMode((data as any).bkash_uat_mode ?? false);
        setBkashUatPhones(
          String((data as any).bkash_uat_phones || "")
            .split(",")
            .map((phone) => normalizeBdPhone(phone))
            .filter(Boolean)
        );
      }
    });
    (supabase.from("delivery_zones" as any) as any).select("*").eq("is_active", true).then(({ data }: any) => {
      if (data) setDeliveryZones(data as DeliveryZone[]);
    });
  }, []);

  useEffect(() => {
    const isBkashAllowed =
      bkashConfiguredActive &&
      (!bkashUatMode || candidatePhones.some((phone) => bkashUatPhones.includes(phone)));

    setBkashActive(isBkashAllowed);

    if (!isBkashAllowed) {
      if (paymentMethod === "bkash") {
        setPaymentMethod(uddoktaPayActive ? "uddokta_pay" : "cod");
      }

      if (codGateway === "bkash" && uddoktaPayActive) {
        setCodGateway("uddokta_pay");
      }
    }
  }, [bkashConfiguredActive, bkashUatMode, bkashUatPhones, candidatePhones, paymentMethod, codGateway, uddoktaPayActive]);

  // Facebook Pixel: InitiateCheckout
  useEffect(() => {
    if (items.length > 0 && marketingSettings?.pixel_enabled) {
      trackInitiateCheckout({
        value: totalPrice,
        currency: marketingSettings.default_currency || "BDT",
      });
    }
  }, [marketingSettings?.pixel_enabled]);

  // Derived location lists
  const divisions = useMemo(() =>
    [...new Set(deliveryZones.map((z) => z.division))].sort(), [deliveryZones]);

  const zillas = useMemo(() =>
    [...new Set(
      deliveryZones.filter((z) => z.division === selectedDivision && z.zilla).map((z) => z.zilla!)
    )].sort(), [deliveryZones, selectedDivision]);

  const upazillas = useMemo(() =>
    [...new Set(
      deliveryZones.filter((z) => z.division === selectedDivision && z.zilla === selectedZilla && z.upazilla).map((z) => z.upazilla!)
    )].sort(), [deliveryZones, selectedDivision, selectedZilla]);

  const areas = useMemo(() =>
    [...new Set(
      deliveryZones.filter((z) => z.division === selectedDivision && z.zilla === selectedZilla && z.upazilla === selectedUpazilla && z.area).map((z) => z.area!)
    )].sort(), [deliveryZones, selectedDivision, selectedZilla, selectedUpazilla]);

  // Fallback charge: area > upazilla > zilla > division > any zone in division > default
  const locationCharge = useMemo(() => {
    if (!selectedDivision) return defaultCodCharge;
    // Try exact area match
    if (selectedArea) {
      const z = deliveryZones.find(
        (z) => z.division === selectedDivision && z.zilla === selectedZilla && z.upazilla === selectedUpazilla && z.area === selectedArea
      );
      if (z) return z.charge;
    }
    // Try exact upazilla match (no area)
    if (selectedUpazilla) {
      const z = deliveryZones.find(
        (z) => z.division === selectedDivision && z.zilla === selectedZilla && z.upazilla === selectedUpazilla && !z.area
      );
      if (z) return z.charge;
      // Any under this upazilla
      const anyUp = deliveryZones.find(
        (z) => z.division === selectedDivision && z.zilla === selectedZilla && z.upazilla === selectedUpazilla
      );
      if (anyUp) return anyUp.charge;
    }
    // Try zilla-level (no upazilla)
    if (selectedZilla) {
      const z = deliveryZones.find(
        (z) => z.division === selectedDivision && z.zilla === selectedZilla && !z.upazilla
      );
      if (z) return z.charge;
      const anyZilla = deliveryZones.find(
        (z) => z.division === selectedDivision && z.zilla === selectedZilla
      );
      if (anyZilla) return anyZilla.charge;
    }
    // Try division-level (no zilla)
    const divisionZone = deliveryZones.find((z) => z.division === selectedDivision && !z.zilla);
    if (divisionZone) return divisionZone.charge;
    const anyInDivision = deliveryZones.find((z) => z.division === selectedDivision);
    if (anyInDivision) return anyInDivision.charge;
    return defaultCodCharge;
  }, [deliveryZones, selectedDivision, selectedZilla, selectedUpazilla, selectedArea, defaultCodCharge]);

  const LAB_SERVICE_CHARGE = 200;
  const effectiveDeliveryCharge = isLabTestOrder ? 0 : (isFreeShipping ? 0 : locationCharge);
  const grandTotal = totalPrice - couponDiscount + effectiveDeliveryCharge + (isLabTestOrder ? LAB_SERVICE_CHARGE : 0);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!user) { toast.error("Please login to apply a coupon"); return; }
    try {
      const result = await validateCoupon.mutateAsync({ code: couponCode, userId: user.id, orderTotal: totalPrice });
      setAppliedCoupon(result.coupon);
      if (result.coupon.discount_type === "free_shipping") {
        setIsFreeShipping(true);
        setCouponDiscount(0);
        toast.success("Free shipping coupon applied!");
      } else {
        setIsFreeShipping(false);
        setCouponDiscount(result.discount);
        toast.success(`Coupon applied! You saved ৳${result.discount}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setIsFreeShipping(false);
    setCouponCode("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const applySavedAddress = (addr: SavedAddress) => {
    setForm((prev) => ({
      ...prev,
      fullName: addr.full_name,
      phone: addr.phone,
      address: addr.address,
    }));
    setSelectedDivision(addr.division);
    setSelectedZilla(addr.zilla || "");
    setSelectedUpazilla(addr.upazilla || "");
    toast.success("Address applied!");
  };

  const createOrderInDb = async () => {
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user!.id,
        total: grandTotal,
        status: "pending",
        payment_method: paymentMethod,
        customer_name: form.fullName,
        customer_phone: form.phone,
        customer_address: form.address,
        customer_division: selectedDivision || null,
        customer_zilla: selectedZilla || null,
        customer_upazilla: selectedUpazilla || null,
        customer_area: selectedArea || null,
        order_notes: form.notes || null,
      } as any)
      .select("id")
      .single();

    if (orderErr) throw orderErr;

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.id.startsWith("lab-") ? null : item.id,
      quantity: item.quantity,
      price: item.price,
      product_name: item.name,
      variant_info: item.id.startsWith("lab-") 
        ? { lab_test: true, test_name: item.name } 
        : (item.variantLabel ? { variant: item.variantLabel } : undefined),
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) throw itemsErr;

    // Increment preorder_count for pre-order products (skip lab tests)
    if (!isLabTestOrder) {
      const uniqueProductIds = [...new Set(items.map(i => i.id))];
      for (const pid of uniqueProductIds) {
        const { data: prod } = await supabase.from("products").select("is_preorder, stock").eq("id", pid).single();
        if (prod && isEffectivePreorder(prod)) {
          const itemQty = items.filter(i => i.id === pid).reduce((sum, i) => sum + i.quantity, 0);
          await supabase.rpc("increment_preorder_count" as any, { p_id: pid, qty: itemQty } as any);
        }
      }
    }

    // Record coupon usage
    if (appliedCoupon) {
      await (supabase.from("coupon_usages" as any) as any).insert({
        coupon_id: appliedCoupon.id,
        user_id: user!.id,
        order_id: order.id,
      });
      // Increment current_uses
      await (supabase.from("coupons" as any) as any)
        .update({ current_uses: appliedCoupon.current_uses + 1 })
        .eq("id", appliedCoupon.id);
    }

    // Notify admin about new order
    await (supabase.from("notifications" as any) as any).insert({
      target_role: "admin",
      title: "নতুন অর্ডার",
      body: `${form.fullName} — ৳${grandTotal.toLocaleString()} (${items.length} items)`,
      type: "order",
      action_url: "/admin/orders",
    });

    // Notify customer
    await (supabase.from("notifications" as any) as any).insert({
      user_id: user!.id,
      target_role: "user",
      title: "অর্ডার সফল হয়েছে!",
      body: `আপনার অর্ডার সফলভাবে প্লেস করা হয়েছে। মোট: ৳${grandTotal.toLocaleString()}`,
      type: "order",
      action_url: "/dashboard/orders",
    });

    // Send SMS notifications for new order
    sendOrderSmsNotify(order.id, "pending");

    return order.id;
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("Please login to place an order");
      navigate("/login");
      return;
    }
    if (!form.fullName.trim() || !form.phone.trim() || !form.address.trim() || !selectedDivision) {
      toast.error("Please fill in all required fields (including Division)");
      shippingFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setPlacing(true);
    try {
      if (isLabTestOrder) {
        // Lab test orders: save to lab_test_bookings table
        const bookingItems = items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, id: i.id }));
        const { data: booking, error: bookingErr } = await (supabase.from("lab_test_bookings" as any) as any)
          .insert({
            user_id: user!.id,
            customer_name: form.fullName,
            customer_phone: form.phone,
            customer_address: form.address,
            customer_division: selectedDivision || null,
            customer_zilla: selectedZilla || null,
            customer_upazilla: selectedUpazilla || null,
            items: bookingItems,
            service_charge: LAB_SERVICE_CHARGE,
            total: grandTotal,
            notes: form.notes || null,
            status: "pending",
            payment_status: "unpaid",
          })
          .select("id")
          .single();

        if (bookingErr) throw bookingErr;
        const bookingId = booking.id;
        const baseUrl = window.location.origin;

        const { data, error } = await supabase.functions.invoke("uddoktapay-create-charge", {
          body: {
            full_name: form.fullName,
            email: user.email,
            amount: LAB_SERVICE_CHARGE,
            order_id: bookingId,
            payment_type: "lab_service_charge",
            redirect_url: `${baseUrl}/payment/callback?order_id=${bookingId}&type=lab_service`,
            cancel_url: `${baseUrl}/payment/callback?order_id=${bookingId}&type=lab_service&cancelled=true`,
          },
        });

        if (error || !data?.payment_url) {
          await (supabase.from("lab_test_bookings" as any) as any).delete().eq("id", bookingId);
          throw new Error(data?.error || "Failed to initiate payment");
        }

        sessionStorage.setItem("pending_payment_order_id", bookingId);
        sessionStorage.setItem("pending_payment_type", "lab_booking");
        await markOrderPlaced();
        window.location.href = data.payment_url;
      } else if (paymentMethod === "cod") {
        if (effectiveDeliveryCharge > 0) {
          const orderId = await createOrderInDb();
          const baseUrl = window.location.origin;

          if (codGateway === "bkash") {
            const callbackUrl = `${baseUrl}/bkash/callback`;
            const { data, error } = await supabase.functions.invoke("bkash-create-payment", {
              body: {
                amount: effectiveDeliveryCharge,
                order_id: orderId,
                callback_url: callbackUrl,
                payment_type: "cod_delivery",
              },
            });
            if (error || !data?.ok || !data?.bkashURL) {
              await supabase.from("order_items").delete().eq("order_id", orderId);
              await supabase.from("orders").delete().eq("id", orderId);
              throw new Error(data?.error || "bKash পেমেন্ট শুরু করা যায়নি");
            }
            sessionStorage.setItem("bkash_order_id", orderId);
            sessionStorage.setItem("bkash_payment_type", "cod_delivery");
            await markOrderPlaced();
            window.location.href = data.bkashURL;
          } else {
            const { data, error } = await supabase.functions.invoke("uddoktapay-create-charge", {
              body: {
                full_name: form.fullName,
                email: user.email,
                amount: effectiveDeliveryCharge,
                order_id: orderId,
                payment_type: "cod_delivery_charge",
                redirect_url: `${baseUrl}/payment/callback?order_id=${orderId}&type=cod_delivery`,
                cancel_url: `${baseUrl}/payment/callback?order_id=${orderId}&type=cod_delivery&cancelled=true`,
              },
            });
            if (error || !data?.payment_url) {
              await supabase.from("order_items").delete().eq("order_id", orderId);
              await supabase.from("orders").delete().eq("id", orderId);
              throw new Error(data?.error || "Failed to initiate payment");
            }
            sessionStorage.setItem("pending_payment_order_id", orderId);
            await markOrderPlaced();
            window.location.href = data.payment_url;
          }
        } else {
          const orderId = await createOrderInDb();
          await markOrderPlaced();
          clearCart();
          if (marketingSettings?.pixel_enabled) {
            trackPurchase({ order_id: orderId, value: grandTotal, currency: marketingSettings.default_currency || "BDT" });
          }
          toast.success("Order placed successfully!");
          navigate(`/order-confirmation?order_id=${orderId}`);
        }
      } else if (paymentMethod === "bkash") {
        const orderId = await createOrderInDb();
        const baseUrl = window.location.origin;
        const callbackUrl = `${baseUrl}/bkash/callback`;

        const { data, error } = await supabase.functions.invoke("bkash-create-payment", {
          body: {
            amount: grandTotal,
            order_id: orderId,
            callback_url: callbackUrl,
            payment_type: "full_payment",
          },
        });

        if (error || !data?.ok || !data?.bkashURL) {
          await supabase.from("order_items").delete().eq("order_id", orderId);
          await supabase.from("orders").delete().eq("id", orderId);
          throw new Error(data?.error || "bKash পেমেন্ট শুরু করা যায়নি");
        }

        sessionStorage.setItem("bkash_order_id", orderId);
        sessionStorage.setItem("bkash_payment_type", "full_payment");
        await markOrderPlaced();
        window.location.href = data.bkashURL;
      } else {
        const orderId = await createOrderInDb();
        const baseUrl = window.location.origin;

        const { data, error } = await supabase.functions.invoke("uddoktapay-create-charge", {
          body: {
            full_name: form.fullName,
            email: user.email,
            amount: grandTotal,
            order_id: orderId,
            payment_type: "full_payment",
            redirect_url: `${baseUrl}/payment/callback?order_id=${orderId}&type=full_payment`,
            cancel_url: `${baseUrl}/payment/callback?order_id=${orderId}&type=full_payment&cancelled=true`,
          },
        });

        if (error || !data?.payment_url) {
          await supabase.from("order_items").delete().eq("order_id", orderId);
          await supabase.from("orders").delete().eq("id", orderId);
          throw new Error(data?.error || "Failed to initiate payment");
        }

        sessionStorage.setItem("pending_payment_order_id", orderId);
        await markOrderPlaced();
        window.location.href = data.payment_url;
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">{b("আপনার কার্ট বর্তমানে খালি", "Your cart is empty")}</h1>
          <p className="text-muted-foreground">{b("চেকআউট করার আগে কার্টে পণ্য যোগ করুন।", "Add some products before checkout.")}</p>
          <Link to="/">
            <Button><ArrowLeft className="mr-2 h-4 w-4" /> {b("কেনাকাটা চালিয়ে যান", "Continue Shopping")}</Button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-[70vh]">
        <div className="mb-6"><BackButton /></div>

        <h1 className="text-2xl font-bold mb-8">{b("অর্ডার চেকআউট", "Checkout")}</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Shipping Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Info */}
            {(
            <div ref={shippingFormRef} className="rounded-xl border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Truck className="h-5 w-5 text-primary" />
                {b("ডেলিভারি তথ্য", "Shipping Information")}
              </div>

              {/* Saved Addresses */}
              {user && savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    {b("সংরক্ষিত ঠিকানা ব্যবহার করুন", "Use a saved address")}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => applySavedAddress(addr)}
                        className={`text-left rounded-lg border-2 p-3 space-y-0.5 transition-colors hover:border-primary/60 hover:bg-primary/5 ${
                          addr.is_default ? "border-primary/40 bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-sm font-medium">{addr.full_name}</span>
                          {addr.is_default && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-primary text-primary-foreground rounded px-1.5 py-0.5">
                              <Star className="h-2.5 w-2.5" /> {b("ডিফল্ট", "Default")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{addr.phone}</p>
                        <p className="text-xs text-foreground/80 line-clamp-1">{addr.address}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {[addr.upazilla, addr.zilla, addr.division].filter(Boolean).join(", ")}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{b("আপনার সম্পূর্ণ নাম *", "Full Name *")}</Label>
                  <Input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} placeholder={b("নাম লিখুন", "Enter your full name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{b("মোবাইল নম্বর *", "Phone Number *")}</Label>
                  <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="01XXXXXXXXX" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{b("ডেলিভারি ঠিকানা *", "Delivery Address *")}</Label>
                <Textarea id="address" name="address" value={form.address} onChange={handleChange} placeholder={b("বাসা, রোড, এলাকা...", "House, Road, Area...")} rows={2} />
              </div>

              {/* Location Dropdowns */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{b("বিভাগ", "Division")} <span className="text-destructive">*</span></Label>
                  <Select value={selectedDivision} onValueChange={(v) => { setSelectedDivision(v); setSelectedZilla(""); setSelectedUpazilla(""); setSelectedArea(""); }}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={b("বিভাগ নির্বাচন করুন", "Select Division")} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {divisions.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{b("জেলা", "District")}</Label>
                  <Select value={selectedZilla} onValueChange={(v) => { setSelectedZilla(v); setSelectedUpazilla(""); setSelectedArea(""); }} disabled={!selectedDivision || zillas.length === 0}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={zillas.length === 0 ? "N/A" : b("জেলা নির্বাচন করুন", "Select District")} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {zillas.map((z) => (
                        <SelectItem key={z} value={z}>{z}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{b("উপজেলা / থানা", "Upazilla")}</Label>
                  <Select value={selectedUpazilla} onValueChange={(v) => { setSelectedUpazilla(v); setSelectedArea(""); }} disabled={!selectedZilla || upazillas.length === 0}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={upazillas.length === 0 ? "N/A" : b("উপজেলা নির্বাচন করুন", "Select Upazilla")} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {upazillas.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Area dropdown (optional) */}
              {selectedUpazilla && areas.length > 0 && (
                <div className="space-y-2">
                  <Label>{b("এলাকা (ঐচ্ছিক)", "Area (optional)")}</Label>
                  <Select value={selectedArea} onValueChange={setSelectedArea}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={b("এলাকা নির্বাচন করুন", "Select Area")} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {areas.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">{b("অর্ডার নোট (ঐচ্ছিক)", "Order Notes (optional)")}</Label>
                <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder={b("বিশেষ কোনো নির্দেশনা...", "Any special instructions...")} rows={2} />
              </div>
            </div>
            )}

            {/* Payment - hidden for lab test orders */}
            {!isLabTestOrder && (
            <>
              {/* Payment Type Card */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {b("পেমেন্ট টাইপ", "Payment Type")}
                </div>

                {/* Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`w-full rounded-lg border-2 p-4 flex items-center gap-3 transition-colors ${
                    paymentMethod === "cod"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border-4 shrink-0 ${paymentMethod === "cod" ? "border-primary" : "border-muted-foreground"}`} />
                  <div className="text-left">
                    <p className="font-medium">{b("ক্যাশ অন ডেলিভারি", "Cash on Delivery")}</p>
                    <p className="text-xs text-muted-foreground">{b("পণ্য পেয়ে পেমেন্ট করুন", "Pay upon delivery")}</p>
                  </div>
                </button>

                {/* COD delivery charge advance payment info */}
                {paymentMethod === "cod" && effectiveDeliveryCharge > 0 && (
                  <div className="rounded-lg bg-muted border border-border p-4 space-y-1">
                    <div className="text-sm font-semibold text-amber-600">
                      {b("⚠️ অগ্রিম ডেলিভারি চার্জ পেমেন্ট প্রয়োজন", "⚠️ Advance Delivery Charge Payment Required")}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {b("ডেলিভারি চার্জ", "Delivery Charge")}{" "}
                      <strong className="text-foreground">{formatPrice(effectiveDeliveryCharge)}</strong>{" "}
                      {b("অগ্রিম পেমেন্ট গেটওয়ের মাধ্যমে দিতে হবে।", "must be paid in advance via payment gateway.")}
                    </p>
                  </div>
                )}
                {/* Full Payment - only show if at least one gateway is active */}
                {(bkashActive || uddoktaPayActive) && (
                <button
                  type="button"
                  onClick={() => {
                    if (bkashActive) setPaymentMethod("bkash");
                    else if (uddoktaPayActive) setPaymentMethod("uddokta_pay");
                  }}
                  className={`w-full rounded-lg border-2 p-4 flex items-center gap-3 transition-colors ${
                    paymentMethod !== "cod"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border-4 shrink-0 ${paymentMethod !== "cod" ? "border-primary" : "border-muted-foreground"}`} />
                  <div className="text-left">
                    <p className="font-medium">{b("সম্পূর্ণ পেমেন্ট", "Full Payment")}</p>
                    <p className="text-xs text-muted-foreground">
                      {b("পণ্যের মূল্য + ডেলিভারি চার্জ এখনই পে করুন", "Pay product price + delivery charge now")}
                    </p>
                  </div>
                </button>
                )}
              </div>

              {/* Payment Method Card - always visible */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {b("পেমেন্ট মাধ্যম", "Payment Method")}
                </div>

                {/* bKash */}
                {bkashActive && (
                <button
                  type="button"
                  onClick={() => paymentMethod === "cod" ? setCodGateway("bkash") : setPaymentMethod("bkash")}
                  className={`w-full rounded-lg border-2 p-4 flex items-center gap-3 transition-colors ${
                    (paymentMethod === "cod" ? codGateway === "bkash" : paymentMethod === "bkash")
                      ? "border-[#E2136E] bg-[#E2136E]/5"
                      : "border-border hover:border-[#E2136E]/50"
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border-4 shrink-0 ${
                    (paymentMethod === "cod" ? codGateway === "bkash" : paymentMethod === "bkash") ? "border-[#E2136E]" : "border-muted-foreground"
                  }`} />
                  <img src={bkashLogo} alt="bKash" className="h-7 w-7 object-contain shrink-0" />
                  <div className="text-left">
                    <p className="font-medium">{b("বিকাশ", "bKash")}</p>
                    <p className="text-xs text-muted-foreground">{b("বিকাশ দিয়ে নিরাপদ পেমেন্ট করুন", "Pay securely with bKash")}</p>
                  </div>
                </button>
                )}

                {/* UddoktaPay */}
                {uddoktaPayActive && (
                <button
                  type="button"
                  onClick={() => paymentMethod === "cod" ? setCodGateway("uddokta_pay") : setPaymentMethod("uddokta_pay")}
                  className={`w-full rounded-lg border-2 p-4 flex items-center gap-3 transition-colors ${
                    (paymentMethod === "cod" ? codGateway === "uddokta_pay" : paymentMethod === "uddokta_pay")
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border-4 shrink-0 ${
                    (paymentMethod === "cod" ? codGateway === "uddokta_pay" : paymentMethod === "uddokta_pay") ? "border-primary" : "border-muted-foreground"
                  }`} />
                  <img src={uddoktapayLogo} alt="UddoktaPay" className="h-7 w-7 object-contain shrink-0" />
                  <div className="text-left">
                    <p className="font-medium">UddoktaPay</p>
                    <p className="text-xs text-muted-foreground">{b("কার্ড অথবা মোবাইল ব্যাংকিং দিয়ে পেমেন্ট করুন", "Pay with Cards or Mobile Banking")}</p>
                  </div>
                </button>
                )}

                {/* No gateway active message */}
                {!bkashActive && !uddoktaPayActive && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    {b("কোনো অনলাইন গেটওয়ে সক্রিয় নেই", "No payment gateway currently active")}
                  </p>
                )}
              </div>
            </>
            )}

            {/* Lab Test Service Charge Info */}
            {isLabTestOrder && (
              <div className="rounded-xl border bg-card p-6 space-y-3">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <CreditCard className="h-5 w-5 text-primary" />
                  {b("সার্ভিস চার্জ", "Service Charge")}
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-1">
                  <p className="text-sm font-semibold text-primary">{b("⚠️ অগ্রিম সার্ভিস চার্জ আবশ্যক", "⚠️ Advance Service Charge Required")}</p>
                  <p className="text-sm text-muted-foreground">
                    {b("সার্ভিস চার্জ", "A service charge of")}{" "}
                    <strong className="text-foreground">{formatPrice(LAB_SERVICE_CHARGE)}</strong>{" "}
                    {b("অনলাইনে অগ্রিম পরিশোধ করতে হবে।", "must be paid in advance via the payment gateway.")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border bg-card p-6 space-y-4 sticky top-24">
              <h2 className="text-lg font-semibold">{b("অর্ডার সামারি", "Order Summary")}</h2>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {items.map((item, idx) => (
                  <div key={`${item.id}-${item.variantKey || idx}`} className="flex gap-3">
                    <img
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.name}
                      className="h-14 w-14 rounded-md object-cover bg-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      {item.variantLabel && (
                        <p className="text-xs text-primary font-medium">{item.variantLabel}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{item.quantity} × {formatPrice(item.price)}</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <Separator />

              {/* Coupon Code Input */}
              <div className="space-y-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{appliedCoupon.code}</span>
                      <Badge variant="secondary" className="text-xs">
                        {appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}% off` :
                         appliedCoupon.discount_type === "fixed" ? `৳${appliedCoupon.discount_value} off` : b("ফ্রি ডেলিভারি", "Free Shipping")}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeCoupon}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder={b("কুপন কোড লিখুন", "Coupon code")}
                      className="uppercase"
                    />
                    <Button variant="outline" onClick={handleApplyCoupon} disabled={validateCoupon.isPending}>
                      {b("প্রয়োগ", "Apply")}
                    </Button>
                  </div>
                )}
              </div>

              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{b("সাবটোটাল", "Subtotal")}</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>{b("কুপন ছাড়", "Coupon Discount")}</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                {isLabTestOrder ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{b("সার্ভিস চার্জ", "Service Charge")}</span>
                    <span className="font-medium">+{formatPrice(LAB_SERVICE_CHARGE)}</span>
                  </div>
                ) : effectiveDeliveryCharge > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {b("ডেলিভারি চার্জ", "COD Delivery Charge")}
                      {selectedDivision && (
                        <span className="block text-xs">
                          {[selectedDivision, selectedZilla, selectedUpazilla].filter(Boolean).join(" › ")}
                        </span>
                      )}
                    </span>
                    <span className="text-destructive font-medium">+{formatPrice(effectiveDeliveryCharge)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{b("ডেলিভারি", "Shipping")}</span>
                    <span className="text-primary font-medium">{isFreeShipping ? b("ফ্রি (কুপন)", "Free (Coupon)") : b("ফ্রি", "Free")}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>{b("সর্বমোট", "Total")}</span>
                <span className="text-primary">{formatPrice(grandTotal)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={placing}
              >
                {placing ? b("অর্ডার সম্পন্ন হচ্ছে...", "Placing Order...") : b("অর্ডার কনফার্ম করুন", "Place Order")}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Checkout;
