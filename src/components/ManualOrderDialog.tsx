import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/logActivity";

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface ManualOrderDialogProps {
  onOrderCreated: () => void;
}

const ManualOrderDialog = ({ onOrderCreated }: ManualOrderDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerDivision, setCustomerDivision] = useState("");
  const [customerZilla, setCustomerZilla] = useState("");
  const [customerUpazilla, setCustomerUpazilla] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [orderNotes, setOrderNotes] = useState("");

  // Products
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Delivery charge
  const [deliveryCharge, setDeliveryCharge] = useState(0);

  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("products")
        .select("id, name, price, image_url, stock")
        .ilike("name", `%${productSearch}%`)
        .eq("is_active", true)
        .limit(10);
      setProductResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Auto-fetch delivery charge
  useEffect(() => {
    if (!customerDivision) { setDeliveryCharge(0); return; }
    (async () => {
      const query = supabase
        .from("delivery_zones")
        .select("charge")
        .eq("division", customerDivision)
        .eq("is_active", true);

      if (customerZilla) query.eq("zilla", customerZilla);
      if (customerUpazilla) query.eq("upazilla", customerUpazilla);

      const { data } = await query.limit(1).single();
      if (data) setDeliveryCharge(Number(data.charge));
    })();
  }, [customerDivision, customerZilla, customerUpazilla]);

  const addProduct = (product: any) => {
    if (items.find(i => i.product_id === product.id)) {
      setItems(prev => prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems(prev => [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image_url: product.image_url,
      }]);
    }
    setProductSearch("");
    setProductResults([]);
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + deliveryCharge;

  const resetForm = () => {
    setCustomerName(""); setCustomerPhone(""); setCustomerAddress("");
    setCustomerDivision(""); setCustomerZilla(""); setCustomerUpazilla("");
    setPaymentMethod("cod"); setOrderNotes(""); setItems([]);
    setDeliveryCharge(0); setProductSearch("");
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Customer name and phone are required");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    setSaving(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "processing" as any,
          total,
          payment_method: paymentMethod,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_address: customerAddress.trim() || null,
          customer_division: customerDivision || null,
          customer_zilla: customerZilla || null,
          customer_upazilla: customerUpazilla || null,
          order_notes: orderNotes.trim() || null,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = items.map(i => ({
        order_id: order.id,
        product_id: i.product_id,
        product_name: i.name,
        price: i.price,
        quantity: i.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      logActivity({
        action: "manual_order_created",
        details: `Manual order #${order.order_number} created — ৳${total}`,
        entity_type: "order",
        entity_id: order.id,
      });

      // Send admin notification
      await (supabase.from("admin_notifications") as any).insert({
        title: "Manual Order Created",
        body: `Manual order #${order.order_number} for ${customerName} — ৳${total}`,
        type: "order",
      });

      toast.success(`Order #${order.order_number} created successfully!`);
      resetForm();
      setOpen(false);
      onOrderCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to create order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Create Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Customer Name *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Full address" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Division</Label>
              <Input value={customerDivision} onChange={e => setCustomerDivision(e.target.value)} placeholder="Division" />
            </div>
            <div>
              <Label>Zilla</Label>
              <Input value={customerZilla} onChange={e => setCustomerZilla(e.target.value)} placeholder="Zilla" />
            </div>
            <div>
              <Label>Upazilla</Label>
              <Input value={customerUpazilla} onChange={e => setCustomerUpazilla(e.target.value)} placeholder="Upazilla" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on Delivery</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery Charge</Label>
              <Input type="number" value={deliveryCharge} onChange={e => setDeliveryCharge(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <Label>Order Notes</Label>
            <Textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Internal notes..." rows={2} />
          </div>

          {/* Product Search */}
          <div className="space-y-2">
            <Label>Add Products</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-9"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {productResults.length > 0 && (
              <div className="border rounded-md max-h-40 overflow-y-auto bg-popover">
                {productResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50 text-left"
                  >
                    {p.image_url && <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-muted-foreground shrink-0">৳{p.price}</span>
                    <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items */}
          {items.length > 0 && (
            <div className="border rounded-md divide-y">
              {items.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 px-3 py-2">
                  {item.image_url && <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                  <span className="flex-1 text-sm truncate">{item.name}</span>
                  <span className="text-sm text-muted-foreground">৳{item.price}</span>
                  <span className="text-muted-foreground">×</span>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => updateQuantity(item.product_id, Number(e.target.value))}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-sm font-medium w-16 text-right">৳{item.price * item.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(item.product_id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="px-3 py-2 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>৳{subtotal}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>৳{deliveryCharge}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>৳{total}</span></div>
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : "Create Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualOrderDialog;
