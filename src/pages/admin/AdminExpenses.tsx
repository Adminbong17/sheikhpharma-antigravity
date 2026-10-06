import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Search, Receipt, ShoppingBag, Send } from "lucide-react";
import { sendToCashBook } from "@/lib/cashbook";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

interface Investor {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  investor_id: string;
  name: string;
  quantity: number;
  source: string | null;
  amount: number;
  expense_by: string | null;
  expense_date: string;
  notes: string | null;
  created_at: string;
  investor_name?: string;
}

interface PurchaseItem {
  name: string;
  quantity: number;
  unit_price: number;
}

interface Purchase {
  id: string;
  invoice_number: string;
  supplier_name: string | null;
  items: PurchaseItem[];
  total: number;
  purchase_date: string;
  payment_status: string;
  notes: string | null;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });

const printColumns: PrintColumn[] = [
  { header: "Date", accessor: (r: any) => formatDate(r.expense_date) },
  { header: "Who Invest", accessor: (r: any) => r.investor_name || "-" },
  { header: "Name", accessor: (r: any) => r.name },
  { header: "Qty", accessor: (r: any) => r.quantity },
  { header: "Source", accessor: (r: any) => r.source || "-" },
  { header: "Expense By", accessor: (r: any) => r.expense_by || "-" },
  { header: "Amount", accessor: (r: any) => `৳${Number(r.amount).toLocaleString()}` },
];

const purchasePrintColumns: PrintColumn[] = [
  { header: "Date", accessor: (r: any) => formatDate(r.purchase_date) },
  { header: "Invoice#", accessor: (r: any) => r.invoice_number },
  { header: "Supplier", accessor: (r: any) => r.supplier_name || "-" },
  { header: "Products", accessor: (r: any) => (r.items || []).map((i: any) => `${i.name} × ${i.quantity} @ ৳${Number(i.unit_price).toLocaleString()} = ৳${Number(i.total || i.quantity * i.unit_price).toLocaleString()}`).join("\n") },
  { header: "Status", accessor: (r: any) => r.payment_status },
  { header: "Total", accessor: (r: any) => `৳${Number(r.total).toLocaleString()}` },
];

const emptyPurchaseItem = (): PurchaseItem => ({ name: "", quantity: 1, unit_price: 0 });

const AdminExpenses = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterInvestor, setFilterInvestor] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [form, setForm] = useState({ investor_id: "", name: "", quantity: "1", source: "", amount: "", expense_by: "", expense_date: new Date().toISOString().split("T")[0], notes: "" });

  const [purchaseForm, setPurchaseForm] = useState({
    supplier_name: "",
    purchase_date: new Date().toISOString().split("T")[0],
    payment_status: "paid" as string,
    notes: "",
    items: [emptyPurchaseItem()] as PurchaseItem[],
  });

  const { data: investors = [] } = useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("investors" as any) as any).select("id, name").order("name");
      if (error) throw error;
      return data as Investor[];
    },
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["all_investment_expenses"],
    queryFn: async () => {
      const { data: expData, error } = await (supabase.from("investment_expenses" as any) as any)
        .select("*")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      const { data: invData } = await (supabase.from("investors" as any) as any).select("id, name");
      const invMap = new Map((invData || []).map((i: any) => [i.id, i.name]));
      return (expData || []).map((e: any) => ({
        ...e,
        investor_name: invMap.get(e.investor_id) || "Unknown",
      })) as Expense[];
    },
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["expense_purchases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_invoices")
        .select("id, invoice_number, supplier_name, items, total, purchase_date, payment_status, notes")
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Purchase[];
    },
  });

  const filteredPurchases = purchases
    .filter((p) => !dateFrom || p.purchase_date >= dateFrom)
    .filter((p) => !dateTo || p.purchase_date <= dateTo);

  const purchaseTotal = filteredPurchases.reduce((s, p) => s + Number(p.total), 0);

  const filtered = expenses
    .filter((e) => filterInvestor === "all" || e.investor_id === filterInvestor)
    .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.investor_name?.toLowerCase().includes(search.toLowerCase()) || e.expense_by?.toLowerCase().includes(search.toLowerCase()))
    .filter((e) => !dateFrom || e.expense_date >= dateFrom)
    .filter((e) => !dateTo || e.expense_date <= dateTo);

  const totalExpense = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const addExpense = useMutation({
    mutationFn: async () => {
      if (!form.investor_id || !form.name.trim() || !form.amount) throw new Error("Investor, Name & Amount required");
      const { error } = await (supabase.from("investment_expenses" as any) as any).insert({
        investor_id: form.investor_id,
        name: form.name.trim(),
        quantity: parseInt(form.quantity) || 1,
        source: form.source || null,
        amount: parseFloat(form.amount),
        expense_by: form.expense_by || null,
        expense_date: form.expense_date,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_investment_expenses"] });
      qc.invalidateQueries({ queryKey: ["investment_expenses"] });
      setShowAdd(false);
      setForm({ investor_id: "", name: "", quantity: "1", source: "", amount: "", expense_by: "", expense_date: new Date().toISOString().split("T")[0], notes: "" });
      toast.success("Expense added!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addPurchase = useMutation({
    mutationFn: async () => {
      const validItems = purchaseForm.items.filter(i => i.name.trim() && i.unit_price > 0);
      if (validItems.length === 0) throw new Error("Add at least one product with name and price");

      const items = validItems.map(i => ({ ...i, total: i.quantity * i.unit_price }));
      const subtotal = items.reduce((s, i) => s + i.total, 0);

      const { error } = await supabase.from("purchase_invoices").insert({
        created_by: user?.id || "",
        supplier_name: purchaseForm.supplier_name || null,
        items: items as any,
        subtotal,
        total: subtotal,
        purchase_date: purchaseForm.purchase_date,
        payment_status: purchaseForm.payment_status,
        notes: purchaseForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense_purchases"] });
      qc.invalidateQueries({ queryKey: ["purchase_invoices_total"] });
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      setShowPurchase(false);
      setPurchaseForm({ supplier_name: "", purchase_date: new Date().toISOString().split("T")[0], payment_status: "paid", notes: "", items: [emptyPurchaseItem()] });
      toast.success("Purchase added!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("investment_expenses" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_investment_expenses"] });
      qc.invalidateQueries({ queryKey: ["investment_expenses"] });
      toast.success("Expense deleted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePurchase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchase_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense_purchases"] });
      qc.invalidateQueries({ queryKey: ["purchase_invoices_total"] });
      qc.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success("Purchase deleted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Purchase items helpers
  const addItem = () => setPurchaseForm(f => ({ ...f, items: [...f.items, emptyPurchaseItem()] }));
  const removeItem = (idx: number) => setPurchaseForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: keyof PurchaseItem, value: string | number) => {
    setPurchaseForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const purchaseItemsTotal = purchaseForm.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> Expenses</h1>
          <p className="text-sm text-muted-foreground">Track all expenses & product purchases</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPurchase(true)} className="gap-1.5">
            <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Add Purchase</span><span className="sm:hidden">Purchase</span>
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Expense</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Investment Expenses</div>
            <div className="text-2xl font-bold text-destructive">৳{totalExpense.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Product Purchases</div>
            <div className="text-2xl font-bold text-destructive">৳{purchaseTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total All Expenses</div>
            <div className="text-2xl font-bold text-destructive">৳{(totalExpense + purchaseTotal).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
        )}
      </div>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Investment Expenses</TabsTrigger>
          <TabsTrigger value="purchases">Product Purchases</TabsTrigger>
        </TabsList>

        {/* ── Expenses Tab ── */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterInvestor} onValueChange={setFilterInvestor}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Investors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Investors</SelectItem>
                {investors.map((inv) => (<SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <PrintExportButtons title="Expenses" columns={printColumns} data={filtered} />
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground py-12">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No expenses found</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {filtered.map((e) => (
                  <div key={e.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{e.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{e.investor_name} • {formatDate(e.expense_date)}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          {e.source && <span>Source: {e.source}</span>}
                          {e.expense_by && <span>By: {e.expense_by}</span>}
                          <span>Qty: {e.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-semibold text-sm text-destructive">৳{Number(e.amount).toLocaleString()}</p>
                        <div className="flex gap-0.5 justify-end mt-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={async () => {
                            try {
                              await sendToCashBook({ type: "cash_out", amount: Number(e.amount), transaction_id: `EXP-${e.id.slice(0, 8)}`, description: e.name, category: "Investment Expense", transaction_date: e.expense_date });
                              qc.invalidateQueries({ queryKey: ["cash_transactions"] });
                              toast.success("Cash Book এ পাঠানো হয়েছে!");
                            } catch (err: any) { toast.error(err.message || "Failed to send"); }
                          }}>
                            <Send className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { if (confirm("Delete?")) deleteExpense.mutate(e.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border bg-muted/50 p-3 flex items-center justify-between font-bold text-sm">
                  <span>Total</span>
                  <span className="text-destructive">৳{totalExpense.toLocaleString()}</span>
                </div>
              </div>

              {/* Desktop table */}
              <Card className="hidden sm:block overflow-hidden shadow-xs">
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Date</TableHead>
                          <TableHead>Who Invest</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Expense By</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[50px] pr-4" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="pl-4">{formatDate(e.expense_date)}</TableCell>
                            <TableCell className="font-medium">{e.investor_name}</TableCell>
                            <TableCell>{e.name}</TableCell>
                            <TableCell className="text-center">{e.quantity}</TableCell>
                            <TableCell>{e.source || "-"}</TableCell>
                            <TableCell>{e.expense_by || "-"}</TableCell>
                            <TableCell className="text-right font-semibold text-destructive">৳{Number(e.amount).toLocaleString()}</TableCell>
                            <TableCell className="pr-4">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Send to Cash Book" onClick={async () => {
                                  try {
                                    await sendToCashBook({ type: "cash_out", amount: Number(e.amount), transaction_id: `EXP-${e.id.slice(0, 8)}`, description: e.name, category: "Investment Expense", transaction_date: e.expense_date });
                                    qc.invalidateQueries({ queryKey: ["cash_transactions"] });
                                    toast.success("Cash Book এ পাঠানো হয়েছে!");
                                  } catch (err: any) { toast.error(err.message || "Failed to send"); }
                                }}>
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this expense?")) deleteExpense.mutate(e.id); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={6} className="pl-4">Total</TableCell>
                          <TableCell className="text-right text-destructive">৳{totalExpense.toLocaleString()}</TableCell>
                          <TableCell className="pr-4" />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Purchases Tab ── */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="flex justify-end">
            <PrintExportButtons title="Product Purchases" columns={purchasePrintColumns} data={filteredPurchases} />
          </div>

          {purchasesLoading ? (
            <p className="text-center text-muted-foreground py-12">Loading...</p>
          ) : filteredPurchases.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No purchases found</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {filteredPurchases.map((p) => (
                  <div key={p.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-muted-foreground">{p.invoice_number}</p>
                        <p className="font-medium text-sm mt-0.5">{p.supplier_name || "-"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(p.purchase_date)}</p>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {(p.items || []).map((item: any, i: number) => (
                            <span key={i}>{item.name}×{item.quantity}{i < p.items.length - 1 ? ", " : ""}</span>
                          ))}
                        </div>
                        <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${p.payment_status === 'paid' ? 'bg-green-100 text-green-700' : p.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {p.payment_status}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-semibold text-sm text-destructive">৳{Number(p.total).toLocaleString()}</p>
                        <div className="flex gap-0.5 justify-end mt-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={async () => {
                            try {
                              await sendToCashBook({ type: "cash_out", amount: Number(p.total), transaction_id: `PUR-${p.id.slice(0, 8)}`, description: p.supplier_name || "Product Purchase", category: "Product Purchase", transaction_date: p.purchase_date });
                              qc.invalidateQueries({ queryKey: ["cash_transactions"] });
                              toast.success("Cash Book এ পাঠানো হয়েছে!");
                            } catch (err: any) { toast.error(err.message || "Failed to send"); }
                          }}>
                            <Send className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { if (confirm("Delete?")) deletePurchase.mutate(p.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border bg-muted/50 p-3 flex items-center justify-between font-bold text-sm">
                  <span>Total</span>
                  <span className="text-destructive">৳{purchaseTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Desktop table */}
              <Card className="hidden sm:block overflow-hidden shadow-xs">
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">Date</TableHead>
                          <TableHead>Invoice#</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Products</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[50px] pr-4" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPurchases.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="pl-4">{formatDate(p.purchase_date)}</TableCell>
                            <TableCell className="font-mono text-xs">{p.invoice_number}</TableCell>
                            <TableCell>{p.supplier_name || "-"}</TableCell>
                            <TableCell>
                              <div className="text-xs space-y-0.5">
                                {(p.items || []).map((item: any, i: number) => (
                                  <div key={i}>{item.name} × {item.quantity}</div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${p.payment_status === 'paid' ? 'bg-green-100 text-green-700' : p.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {p.payment_status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-destructive">৳{Number(p.total).toLocaleString()}</TableCell>
                            <TableCell className="pr-4">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Send to Cash Book" onClick={async () => {
                                  try {
                                    await sendToCashBook({ type: "cash_out", amount: Number(p.total), transaction_id: `PUR-${p.id.slice(0, 8)}`, description: p.supplier_name || "Product Purchase", category: "Product Purchase", transaction_date: p.purchase_date });
                                    qc.invalidateQueries({ queryKey: ["cash_transactions"] });
                                    toast.success("Cash Book এ পাঠানো হয়েছে!");
                                  } catch (err: any) { toast.error(err.message || "Failed to send"); }
                                }}>
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this purchase?")) deletePurchase.mutate(p.id); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={5} className="pl-4">Total</TableCell>
                          <TableCell className="text-right text-destructive">৳{purchaseTotal.toLocaleString()}</TableCell>
                          <TableCell className="pr-4" />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Who Invest *</Label>
              <Select value={form.investor_id} onValueChange={(v) => setForm({ ...form, investor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {investors.map((inv) => (<SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Expense name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Amount (৳) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" /></div>
            </div>
            <div><Label>Source</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Where purchased from" /></div>
            <div><Label>Expense By</Label><Input value={form.expense_by} onChange={(e) => setForm({ ...form, expense_by: e.target.value })} placeholder="Who spent" /></div>
            <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional note" /></div>
            <Button className="w-full" onClick={() => addExpense.mutate()} disabled={addExpense.isPending}>{addExpense.isPending ? "Saving..." : "Add Expense"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Purchase Dialog */}
      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Product Purchase</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Supplier Name</Label><Input value={purchaseForm.supplier_name} onChange={(e) => setPurchaseForm(f => ({ ...f, supplier_name: e.target.value }))} placeholder="Optional" /></div>
              <div><Label>Date</Label><Input type="date" value={purchaseForm.purchase_date} onChange={(e) => setPurchaseForm(f => ({ ...f, purchase_date: e.target.value }))} /></div>
            </div>

            {/* Dynamic items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Products</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </Button>
              </div>

              <div className="space-y-2">
                {purchaseForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Product Name *</Label>}
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(idx, "name", e.target.value)}
                        placeholder="Product name"
                      />
                    </div>
                    <div className="w-20">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="w-28">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Unit Price (৳)</Label>}
                      <Input
                        type="number"
                        value={item.unit_price || ""}
                        onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div className="w-24 text-right font-medium text-sm pt-1">
                      {idx === 0 && <Label className="text-xs text-muted-foreground block">Total</Label>}
                      ৳{(item.quantity * item.unit_price).toLocaleString()}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive shrink-0"
                      disabled={purchaseForm.items.length === 1}
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-3 pt-3 border-t">
                <div className="text-lg font-bold">Total: ৳{purchaseItemsTotal.toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment Status</Label>
                <Select value={purchaseForm.payment_status} onValueChange={(v) => setPurchaseForm(f => ({ ...f, payment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={purchaseForm.notes} onChange={(e) => setPurchaseForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></div>
            </div>

            <Button className="w-full" onClick={() => addPurchase.mutate()} disabled={addPurchase.isPending}>
              {addPurchase.isPending ? "Saving..." : `Save Purchase (৳${purchaseItemsTotal.toLocaleString()})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExpenses;
