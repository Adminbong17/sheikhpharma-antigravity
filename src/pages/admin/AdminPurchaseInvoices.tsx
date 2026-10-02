import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Search, ShoppingBag, MoreVertical, Pencil, Eye, Printer, X, Landmark } from "lucide-react";
import { sendToCashBook } from "@/lib/cashbook";
import { toast } from "sonner";
import { format } from "date-fns";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface PurchaseItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  payment_status: string;
  payment_method: string | null;
  paid_amount: number;
  notes: string | null;
  purchase_date: string;
  created_at: string;
}

const emptyItem = (): PurchaseItem => ({ name: "", quantity: 1, unit_price: 0, total: 0 });

const AdminPurchaseInvoices = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<PurchaseInvoice | null>(null);
  const [editing, setEditing] = useState<PurchaseInvoice | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", address: "" });

  const [form, setForm] = useState({
    supplier_id: "",
    supplier_name: "",
    supplier_phone: "",
    items: [emptyItem()] as PurchaseItem[],
    discount: 0,
    shipping_cost: 0,
    payment_status: "unpaid",
    payment_method: "",
    paid_amount: 0,
    notes: "",
    purchase_date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["purchase-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_invoices" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PurchaseInvoice[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers" as any).select("*").order("name");
      return (data || []) as unknown as Supplier[];
    },
  });

  const resetForm = () => {
    setForm({
      supplier_id: "", supplier_name: "", supplier_phone: "",
      items: [emptyItem()], discount: 0, shipping_cost: 0,
      payment_status: "unpaid", payment_method: "", paid_amount: 0,
      notes: "", purchase_date: format(new Date(), "yyyy-MM-dd"),
    });
    setEditing(null);
  };

  const calcSubtotal = () => form.items.reduce((s, i) => s + i.total, 0);
  const calcTotal = () => calcSubtotal() - form.discount + form.shipping_cost;

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    const updated = [...form.items];
    (updated[index] as any)[field] = value;
    if (field === "quantity" || field === "unit_price") {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }
    setForm({ ...form, items: updated });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const selectSupplier = (supplierId: string) => {
    const s = suppliers.find(sup => sup.id === supplierId);
    if (s) {
      setForm({ ...form, supplier_id: s.id, supplier_name: s.name, supplier_phone: s.phone || "" });
    }
  };

  const handleSave = async () => {
    if (!form.supplier_name.trim()) { toast.error("সাপ্লায়ারের নাম দিন"); return; }
    if (form.items.length === 0 || !form.items[0].name.trim()) { toast.error("কমপক্ষে একটি আইটেম যোগ করুন"); return; }

    const payload = {
      supplier_id: form.supplier_id || null,
      supplier_name: form.supplier_name,
      supplier_phone: form.supplier_phone || null,
      items: form.items,
      subtotal: calcSubtotal(),
      discount: form.discount,
      shipping_cost: form.shipping_cost,
      total: calcTotal(),
      payment_status: form.payment_status,
      payment_method: form.payment_method || null,
      paid_amount: form.paid_amount,
      notes: form.notes || null,
      purchase_date: form.purchase_date,
      created_by: user!.id,
    };

    if (editing) {
      const { error } = await (supabase.from("purchase_invoices" as any) as any).update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Purchase invoice আপডেট হয়েছে!");
    } else {
      const { error } = await (supabase.from("purchase_invoices" as any) as any).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Purchase invoice তৈরি হয়েছে!");
    }

    queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    setOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ডিলিট করতে চান?")) return;
    const { error } = await (supabase.from("purchase_invoices" as any) as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে!");
    queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) { toast.error("নাম দিন"); return; }
    const { error } = await (supabase.from("suppliers" as any) as any).insert(supplierForm);
    if (error) { toast.error(error.message); return; }
    toast.success("সাপ্লায়ার যোগ হয়েছে!");
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    setSupplierOpen(false);
    setSupplierForm({ name: "", phone: "", email: "", address: "" });
  };

  const openEdit = (inv: PurchaseInvoice) => {
    setEditing(inv);
    setForm({
      supplier_id: inv.supplier_id || "",
      supplier_name: inv.supplier_name || "",
      supplier_phone: inv.supplier_phone || "",
      items: inv.items.length > 0 ? inv.items : [emptyItem()],
      discount: inv.discount,
      shipping_cost: inv.shipping_cost,
      payment_status: inv.payment_status,
      payment_method: inv.payment_method || "",
      paid_amount: inv.paid_amount,
      notes: inv.notes || "",
      purchase_date: inv.purchase_date,
    });
    setOpen(true);
  };

  const handlePrint = (inv: PurchaseInvoice) => {
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    const itemsHtml = inv.items.map(i => `
      <tr>
        <td style="border:1px solid #ddd;padding:6px">${i.name}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${i.quantity}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${i.unit_price}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${i.total}</td>
      </tr>
    `).join("");

    w.document.write(`
      <html><head><title>Purchase Invoice ${inv.invoice_number}</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin:16px 0}
      th{background:#f5f5f5;border:1px solid #ddd;padding:8px;text-align:left}
      .header{display:flex;justify-content:space-between;margin-bottom:20px}
      .totals{text-align:right;margin-top:12px}</style></head><body>
      <div class="header">
        <div><h2>Purchase Invoice</h2><p><strong>${inv.invoice_number}</strong></p></div>
        <div style="text-align:right"><p>তারিখ: ${format(new Date(inv.purchase_date), "dd/MM/yyyy")}</p>
        <p>Payment: <strong>${inv.payment_status === "paid" ? "✅ Paid" : inv.payment_status === "partial" ? "⚠️ Partial" : "❌ Unpaid"}</strong></p></div>
      </div>
      <div style="margin-bottom:16px"><strong>সাপ্লায়ার:</strong> ${inv.supplier_name || "—"}
      ${inv.supplier_phone ? ` | ফোন: ${inv.supplier_phone}` : ""}</div>
      <table><thead><tr><th>আইটেম</th><th style="text-align:center">পরিমাণ</th><th style="text-align:right">দাম</th><th style="text-align:right">মোট</th></tr></thead>
      <tbody>${itemsHtml}</tbody></table>
      <div class="totals">
        <p>সাবটোটাল: ${inv.subtotal}</p>
        ${inv.discount > 0 ? `<p>ডিসকাউন্ট: -${inv.discount}</p>` : ""}
        ${inv.shipping_cost > 0 ? `<p>শিপিং: +${inv.shipping_cost}</p>` : ""}
        <p style="font-size:18px;font-weight:bold">মোট: ${inv.total}</p>
        ${inv.paid_amount > 0 ? `<p>পরিশোধিত: ${inv.paid_amount}</p><p>বাকি: ${inv.total - inv.paid_amount}</p>` : ""}
      </div>
      ${inv.notes ? `<div style="margin-top:16px;padding:12px;background:#f9f9f9;border-radius:8px"><strong>নোট:</strong> ${inv.notes}</div>` : ""}
      <script>window.print();</script></body></html>
    `);
    w.document.close();
  };

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    return !q || inv.invoice_number.toLowerCase().includes(q) || (inv.supplier_name || "").toLowerCase().includes(q);
  });

  const statusColor = (s: string) => {
    if (s === "paid") return "bg-green-100 text-green-800 border-green-300";
    if (s === "partial") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex flex-wrap items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Purchase Invoices</h1>
        <Badge variant="secondary">{invoices.length}</Badge>
        <div className="ml-auto flex gap-2">
          <PrintExportButtons
            title="Purchase Invoices"
            columns={[
              { header: "Invoice #", accessor: (r) => r.invoice_number },
              { header: "Supplier", accessor: (r) => r.supplier_name || "" },
              { header: "Date", accessor: (r) => r.purchase_date },
              { header: "Total", accessor: (r) => r.total },
              { header: "Paid", accessor: (r) => r.paid_amount },
              { header: "Status", accessor: (r) => r.payment_status },
            ] satisfies PrintColumn[]}
            data={filtered}
          />
          <Button size="sm" variant="outline" onClick={() => setSupplierOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> সাপ্লায়ার
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> নতুন ইনভয়েস
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ইনভয়েস নম্বর বা সাপ্লায়ার খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">কোনো purchase invoice পাওয়া যায়নি।</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map(inv => (
              <div key={inv.id} className="rounded-lg border bg-card p-3" onClick={() => setViewInvoice(inv)}>
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted-foreground">{inv.invoice_number}</p>
                    <p className="font-medium text-sm mt-0.5">{inv.supplier_name || "—"}</p>
                    {inv.supplier_phone && <p className="text-[10px] text-muted-foreground">{inv.supplier_phone}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(inv.purchase_date), "dd MMM yyyy")}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor(inv.payment_status)}`}>
                        {inv.payment_status === "paid" ? "Paid" : inv.payment_status === "partial" ? "Partial" : "Unpaid"}
                      </Badge>
                      {inv.paid_amount > 0 && inv.payment_status !== "paid" && (
                        <span className="text-[10px] text-muted-foreground">Paid: ৳{Number(inv.paid_amount).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-semibold text-sm">৳{Number(inv.total).toLocaleString()}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 mt-1">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setViewInvoice(inv)}>
                          <Eye className="h-4 w-4 mr-2" /> দেখুন
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(inv)}>
                          <Printer className="h-4 w-4 mr-2" /> প্রিন্ট
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(inv)}>
                          <Pencil className="h-4 w-4 mr-2" /> এডিট
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          try {
                            await sendToCashBook({ type: "cash_out", amount: Number(inv.total), transaction_id: `PUR-${inv.id.slice(0, 8)}`, description: inv.supplier_name || "Product Purchase", category: "Product Purchase", transaction_date: inv.purchase_date });
                            toast.success("Cash Book এ পাঠানো হয়েছে!");
                          } catch (err: any) { toast.error(err.message || "Cash Book এ পাঠাতে ব্যর্থ"); }
                        }}>
                          <Landmark className="h-4 w-4 mr-2" /> Cash Book
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(inv.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> ডিলিট
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="rounded-lg border bg-card overflow-x-auto hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>সাপ্লায়ার</TableHead>
                  <TableHead>তারিখ</TableHead>
                  <TableHead className="text-right">মোট</TableHead>
                  <TableHead className="text-right">পরিশোধিত</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inv.supplier_name || "—"}</p>
                        {inv.supplier_phone && <p className="text-xs text-muted-foreground">{inv.supplier_phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(inv.purchase_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(inv.total)}</TableCell>
                    <TableCell className="text-right">{formatPrice(inv.paid_amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(inv.payment_status)}>
                        {inv.payment_status === "paid" ? "Paid" : inv.payment_status === "partial" ? "Partial" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewInvoice(inv)}>
                            <Eye className="h-4 w-4 mr-2" /> দেখুন
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrint(inv)}>
                            <Printer className="h-4 w-4 mr-2" /> প্রিন্ট
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(inv)}>
                            <Pencil className="h-4 w-4 mr-2" /> এডিট
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => {
                            try {
                              await sendToCashBook({ type: "cash_out", amount: Number(inv.total), transaction_id: `PUR-${inv.id.slice(0, 8)}`, description: inv.supplier_name || "Product Purchase", category: "Product Purchase", transaction_date: inv.purchase_date });
                              toast.success("Cash Book এ পাঠানো হয়েছে!");
                            } catch (err: any) { toast.error(err.message || "Cash Book এ পাঠাতে ব্যর্থ"); }
                          }}>
                            <Landmark className="h-4 w-4 mr-2" /> Send to Cash Book
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(inv.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> ডিলিট
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Purchase Invoice এডিট" : "নতুন Purchase Invoice"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Supplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>সাপ্লায়ার সিলেক্ট করুন</Label>
                <Select value={form.supplier_id} onValueChange={selectSupplier}>
                  <SelectTrigger><SelectValue placeholder="সাপ্লায়ার বাছুন" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>অথবা নাম লিখুন</Label>
                <Input value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} placeholder="সাপ্লায়ারের নাম" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>সাপ্লায়ার ফোন</Label>
                <Input value={form.supplier_phone} onChange={e => setForm({ ...form, supplier_phone: e.target.value })} placeholder="01XXXXXXXXX" />
              </div>
              <div>
                <Label>তারিখ</Label>
                <Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">আইটেম সমূহ</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> আইটেম</Button>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">আইটেম</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground w-20">পরিমাণ</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground w-28">দাম</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground w-28">মোট</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5">
                          <Input value={item.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="আইটেমের নাম" className="h-8 text-sm" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} className="h-8 text-sm text-center" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={0} value={item.unit_price} onChange={e => updateItem(i, "unit_price", Number(e.target.value))} className="h-8 text-sm text-right" />
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium">{item.total}</td>
                        <td className="px-1 py-1.5">
                          {form.items.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">সাবটোটাল</Label>
                <p className="font-semibold text-lg">{formatPrice(calcSubtotal())}</p>
              </div>
              <div>
                <Label className="text-xs">ডিসকাউন্ট</Label>
                <Input type="number" min={0} value={form.discount} onChange={e => setForm({ ...form, discount: Number(e.target.value) })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">শিপিং খরচ</Label>
                <Input type="number" min={0} value={form.shipping_cost} onChange={e => setForm({ ...form, shipping_cost: Number(e.target.value) })} className="h-8" />
              </div>
              <div>
                <Label className="text-xs">সর্বমোট</Label>
                <p className="font-bold text-xl text-primary">{formatPrice(calcTotal())}</p>
              </div>
            </div>

            {/* Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>পেমেন্ট স্ট্যাটাস</Label>
                <Select value={form.payment_status} onValueChange={v => setForm({ ...form, payment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>পেমেন্ট মেথড</Label>
                <Input value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} placeholder="bKash, Cash, Bank..." />
              </div>
              <div>
                <Label>পরিশোধিত পরিমাণ</Label>
                <Input type="number" min={0} value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <Label>নোট</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="অতিরিক্ত তথ্য..." rows={2} />
            </div>

            <Button onClick={handleSave} className="w-full">{editing ? "আপডেট করুন" : "সেভ করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Purchase Invoice — {viewInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">সাপ্লায়ার</p>
                  <p className="font-medium">{viewInvoice.supplier_name || "—"}</p>
                  {viewInvoice.supplier_phone && <p className="text-xs text-muted-foreground">{viewInvoice.supplier_phone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">তারিখ</p>
                  <p className="font-medium">{format(new Date(viewInvoice.purchase_date), "dd MMM yyyy")}</p>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left">আইটেম</th>
                      <th className="px-3 py-2 text-center">পরিমাণ</th>
                      <th className="px-3 py-2 text-right">দাম</th>
                      <th className="px-3 py-2 text-right">মোট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatPrice(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatPrice(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-sm space-y-1 text-right">
                <p>সাবটোটাল: {formatPrice(viewInvoice.subtotal)}</p>
                {viewInvoice.discount > 0 && <p>ডিসকাউন্ট: -{formatPrice(viewInvoice.discount)}</p>}
                {viewInvoice.shipping_cost > 0 && <p>শিপিং: +{formatPrice(viewInvoice.shipping_cost)}</p>}
                <p className="text-lg font-bold text-primary">মোট: {formatPrice(viewInvoice.total)}</p>
                <p>পরিশোধিত: {formatPrice(viewInvoice.paid_amount)}</p>
                {viewInvoice.total - viewInvoice.paid_amount > 0 && (
                  <p className="text-destructive font-semibold">বাকি: {formatPrice(viewInvoice.total - viewInvoice.paid_amount)}</p>
                )}
              </div>

              <Badge variant="outline" className={statusColor(viewInvoice.payment_status)}>
                {viewInvoice.payment_status === "paid" ? "Paid" : viewInvoice.payment_status === "partial" ? "Partial" : "Unpaid"}
                {viewInvoice.payment_method && ` — ${viewInvoice.payment_method}`}
              </Badge>

              {viewInvoice.notes && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground mb-1">নোট:</p>
                  <p>{viewInvoice.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => handlePrint(viewInvoice)}>
                  <Printer className="h-4 w-4 mr-2" /> প্রিন্ট করুন
                </Button>
                <Button className="flex-1" variant="outline" onClick={async () => {
                  try {
                    await sendToCashBook({ type: "cash_out", amount: Number(viewInvoice.total), transaction_id: `PUR-${viewInvoice.id.slice(0, 8)}`, description: viewInvoice.supplier_name || "Product Purchase", category: "Product Purchase", transaction_date: viewInvoice.purchase_date });
                    toast.success("Cash Book এ পাঠানো হয়েছে!");
                  } catch { toast.error("Cash Book এ পাঠাতে ব্যর্থ"); }
                }}>
                  <Landmark className="h-4 w-4 mr-2" /> Cash Book
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>নতুন সাপ্লায়ার</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>নাম *</Label><Input value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} /></div>
            <div><Label>ফোন</Label><Input value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
            <div><Label>ইমেইল</Label><Input value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
            <div><Label>ঠিকানা</Label><Input value={supplierForm.address} onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })} /></div>
            <Button onClick={handleSaveSupplier} className="w-full">সেভ করুন</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPurchaseInvoices;
