import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { createNotification } from "@/hooks/useNotifications";
import { sendOrderSmsNotify } from "@/lib/sendOrderSms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Save, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}

interface FormData {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_division: string;
  customer_zilla: string;
  customer_upazilla: string;
  payment_method: string;
  discount: number;
  delivery_charge: number;
  notes: string;
  items: InvoiceItem[];
}

interface DeliveryZone {
  division: string;
  zilla: string | null;
  upazilla: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  /** If provided, restrict products to this vendor's products */
  vendorId?: string | null;
  /** If provided, pre-fill form for editing */
  editInvoice?: any | null;
}

// ── Product search combobox for a single item row ──────────────────────────
function ProductSearchInput({
  value,
  onChange,
  onSelect,
  products,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: Product) => void;
  products: Product[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return products.slice(0, 8);
    const q = value.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [value, products]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search or type item name"
          className="pl-8"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between gap-2"
              onMouseDown={(e) => { e.preventDefault(); onSelect(p); setOpen(false); }}
            >
              <span className="truncate">{p.name}</span>
              <span className="text-muted-foreground shrink-0">৳{p.price.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ────────────────────────────────────────────────────────────
const InvoiceGeneratorDialog = ({ open, onOpenChange, onSaved, vendorId, editInvoice }: Props) => {
  const { user, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const isEditing = !!editInvoice;
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const { register, control, watch, handleSubmit, reset, setValue, getValues } = useForm<FormData>({
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_address: "",
      customer_division: "",
      customer_zilla: "",
      customer_upazilla: "",
      payment_method: "cod",
      discount: 0,
      delivery_charge: 0,
      notes: "",
      items: [{ name: "", qty: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const discount = Number(watch("discount")) || 0;
  const delivery = Number(watch("delivery_charge")) || 0;
  const selectedDivision = watch("customer_division");
  const selectedZilla = watch("customer_zilla");

  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0),
    0
  );
  const total = subtotal - discount + delivery;

  // Fetch delivery zones
  useEffect(() => {
    supabase
      .from("delivery_zones")
      .select("division, zilla, upazilla")
      .eq("is_active", true)
      .order("division")
      .then(({ data }) => { if (data) setZones(data); });
  }, []);

  // Fetch products (all for admin, own for vendor)
  useEffect(() => {
    if (!open) return;
    let query = supabase
      .from("products")
      .select("id, name, price")
      .eq("is_active", true)
      .order("name");

    if (!isAdmin && vendorId) {
      query = query.eq("vendor_id", vendorId);
    }

    query.then(({ data }) => { if (data) setProducts(data); });
  }, [open, isAdmin, vendorId]);

  // Pre-fill form when editing
  useEffect(() => {
    if (!open) return;
    if (editInvoice) {
      const items = Array.isArray(editInvoice.items) && editInvoice.items.length > 0
        ? editInvoice.items.map((i: any) => ({ name: i.name || "", qty: i.qty || 1, price: i.price || 0 }))
        : [{ name: "", qty: 1, price: 0 }];
      reset({
        customer_name: editInvoice.customer_name || "",
        customer_phone: editInvoice.customer_phone || "",
        customer_address: editInvoice.customer_address || "",
        customer_division: editInvoice.customer_division || "",
        customer_zilla: editInvoice.customer_zilla || "",
        customer_upazilla: editInvoice.customer_upazilla || "",
        payment_method: editInvoice.payment_method || "cod",
        discount: editInvoice.discount || 0,
        delivery_charge: editInvoice.delivery_charge || 0,
        notes: editInvoice.notes || "",
        items,
      });
    } else {
      reset({
        customer_name: "", customer_phone: "", customer_address: "",
        customer_division: "", customer_zilla: "", customer_upazilla: "",
        payment_method: "cod", discount: 0, delivery_charge: 0, notes: "",
        items: [{ name: "", qty: 1, price: 0 }],
      });
    }
  }, [open, editInvoice, reset]);

  const divisions = useMemo(() => [...new Set(zones.map((z) => z.division))].sort(), [zones]);

  const zillas = useMemo(() => {
    if (!selectedDivision) return [];
    return [...new Set(
      zones.filter((z) => z.division === selectedDivision && z.zilla).map((z) => z.zilla as string)
    )].sort();
  }, [zones, selectedDivision]);

  const upazillas = useMemo(() => {
    if (!selectedZilla) return [];
    return [...new Set(
      zones.filter((z) => z.zilla === selectedZilla && z.upazilla).map((z) => z.upazilla as string)
    )].sort();
  }, [zones, selectedZilla]);

  const handleDivisionChange = (val: string) => {
    setValue("customer_division", val);
    setValue("customer_zilla", "");
    setValue("customer_upazilla", "");
  };

  const handleZillaChange = (val: string) => {
    setValue("customer_zilla", val);
    setValue("customer_upazilla", "");
  };

  const handleProductSelect = (index: number, product: Product) => {
    setValue(`items.${index}.name`, product.name);
    setValue(`items.${index}.price`, product.price);
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    if (data.items.some((i) => !i.name.trim())) {
      toast.error("All item names are required");
      return;
    }
    setSaving(true);
    try {
      const invoiceTotal = total < 0 ? 0 : total;
      const invoiceItems = data.items.map((i) => ({
        name: i.name,
        qty: Number(i.qty),
        price: Number(i.price),
        total: Number(i.qty) * Number(i.price),
      }));

      if (isEditing) {
        // ── UPDATE existing invoice ──
        const { error } = await (supabase.from("invoices" as any) as any)
          .update({
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_address: data.customer_address,
            customer_division: data.customer_division,
            customer_zilla: data.customer_zilla,
            customer_upazilla: data.customer_upazilla,
            payment_method: data.payment_method,
            discount: Number(data.discount) || 0,
            delivery_charge: Number(data.delivery_charge) || 0,
            notes: data.notes,
            items: invoiceItems,
            subtotal,
            total: invoiceTotal,
          })
          .eq("id", editInvoice.id);
        if (error) throw error;

        // Also update linked order if exists
        if (editInvoice.order_id) {
          await supabase.from("orders").update({
            customer_name: data.customer_name || null,
            customer_phone: data.customer_phone || null,
            customer_address: data.customer_address || null,
            customer_division: data.customer_division || null,
            customer_zilla: data.customer_zilla || null,
            customer_upazilla: data.customer_upazilla || null,
            payment_method: data.payment_method || "cod",
            total: invoiceTotal,
            order_notes: `Updated from invoice. ${data.notes || ""}`.trim(),
          } as any).eq("id", editInvoice.order_id);
        }

        toast.success("Invoice updated successfully!");
        onSaved();
      } else {
        // ── CREATE new invoice + order ──
        // 1. Create the order first
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            customer_name: data.customer_name || null,
            customer_phone: data.customer_phone || null,
            customer_address: data.customer_address || null,
            customer_division: data.customer_division || null,
            customer_zilla: data.customer_zilla || null,
            customer_upazilla: data.customer_upazilla || null,
            payment_method: data.payment_method || "cod",
            total: invoiceTotal,
            status: "processing" as any,
            order_notes: `Created from invoice. ${data.notes || ""}`.trim(),
          })
          .select("id, order_number")
          .single();

        if (orderError) throw orderError;

        // 2. Create order items
        const orderItems = await Promise.all(
          data.items.map(async (item) => {
            const { data: matchedProduct } = await supabase
              .from("products")
              .select("id")
              .ilike("name", item.name.trim())
              .maybeSingle();

            return {
              order_id: orderData.id,
              product_id: matchedProduct?.id || null,
              product_name: item.name.trim(),
              quantity: Number(item.qty) || 1,
              price: Number(item.price) || 0,
            };
          })
        );

        await supabase.from("order_items").insert(orderItems);

        // 3. Create the invoice linked to the order
        const { error } = await (supabase.from("invoices" as any) as any).insert({
          created_by: user.id,
          order_id: orderData.id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_address: data.customer_address,
          customer_division: data.customer_division,
          customer_zilla: data.customer_zilla,
          customer_upazilla: data.customer_upazilla,
          payment_method: data.payment_method,
          discount: Number(data.discount) || 0,
          delivery_charge: Number(data.delivery_charge) || 0,
          notes: data.notes,
          items: invoiceItems,
          subtotal,
          total: invoiceTotal,
          status: vendorId ? "pending" : "saved",
          ...(vendorId ? { vendor_id: vendorId } : {}),
        });
        if (error) throw error;

        // 4. Send notification to admin
        await createNotification({
          target_role: "admin",
          title: "New Invoice Order",
          body: `Invoice order created for ${data.customer_name || "Unknown"} — ৳${invoiceTotal.toLocaleString()}`,
          type: "order",
          action_url: "/admin/orders",
        });

        // 5. If customer phone exists, try to find user and notify
        if (data.customer_phone) {
          const raw = data.customer_phone.trim().replace(/[^0-9]/g, "");
          const phonesToTry: string[] = [];
          if (raw.startsWith("880")) {
            phonesToTry.push(raw, "0" + raw.slice(3), "+" + raw);
          } else if (raw.startsWith("0")) {
            phonesToTry.push(raw, "880" + raw.slice(1), "+880" + raw.slice(1));
          } else {
            phonesToTry.push(raw);
          }

          const { data: customerProfile } = await (supabase.from("profiles") as any)
            .select("user_id")
            .in("phone", phonesToTry)
            .limit(1)
            .maybeSingle();

          if (customerProfile?.user_id) {
            await createNotification({
              user_id: customerProfile.user_id,
              target_role: "user",
              title: "Order Confirmed",
              body: `Your order #${orderData.order_number} of ৳${invoiceTotal.toLocaleString()} has been confirmed.`,
              type: "order",
              action_url: "/dashboard/orders",
            });
          }
        }

        // 6. Send SMS notification
        await sendOrderSmsNotify(orderData.id, "pending");

        toast.success("Invoice & order saved successfully!");
        reset();
        onSaved();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{isEditing ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Info */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Customer Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Customer Name</Label>
                <Input {...register("customer_name")} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register("customer_phone")} placeholder="01XXXXXXXXX" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input {...register("customer_address")} placeholder="House, Road, Area" />
              </div>

              {/* Division */}
              <div className="space-y-1.5">
                <Label>Division</Label>
                <Select value={selectedDivision} onValueChange={handleDivisionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zilla */}
              <div className="space-y-1.5">
                <Label>Zilla</Label>
                <Select
                  value={selectedZilla}
                  onValueChange={handleZillaChange}
                  disabled={!selectedDivision || zillas.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select zilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {zillas.map((z) => (
                      <SelectItem key={z} value={z}>{z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upazilla */}
              <div className="space-y-1.5">
                <Label>Upazilla</Label>
                <Select
                  value={watch("customer_upazilla")}
                  onValueChange={(val) => setValue("customer_upazilla", val)}
                  disabled={!selectedZilla || upazillas.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select upazilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {upazillas.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select defaultValue="cod" onValueChange={(v) => setValue("payment_method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="rocket">Rocket</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="online">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Items</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => append({ name: "", qty: 1, price: 0 })}
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
                <span className="col-span-6">Product / Service</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Unit Price</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1" />
              </div>

              {fields.map((field, i) => {
                const lineTotal = (Number(watchedItems[i]?.qty) || 0) * (Number(watchedItems[i]?.price) || 0);
                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <ProductSearchInput
                        value={watchedItems[i]?.name ?? ""}
                        onChange={(v) => setValue(`items.${i}.name`, v)}
                        onSelect={(p) => handleProductSelect(i, p)}
                        products={products}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        {...register(`items.${i}.qty`)}
                        type="number"
                        min={1}
                        placeholder="1"
                        className="text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        {...register(`items.${i}.price`)}
                        type="number"
                        min={0}
                        placeholder="0"
                        className="text-right"
                      />
                    </div>
                    <div className="col-span-1 text-right text-sm font-medium">
                      ৳{lineTotal.toLocaleString()}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => remove(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Totals & Extra */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Discount (৳)</Label>
                <Input {...register("discount")} type="number" min={0} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery Charge (৳)</Label>
                <Input {...register("delivery_charge")} type="number" min={0} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea {...register("notes")} placeholder="Optional notes..." rows={2} />
              </div>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">৳{subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary/70">
                  <span>Discount</span>
                  <span>-৳{discount.toLocaleString()}</span>
                </div>
              )}
              {delivery > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>+৳{delivery.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold text-primary">
                <span>Total</span>
                <span>৳{Math.max(0, total).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : isEditing ? "Update Invoice" : "Save Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceGeneratorDialog;
