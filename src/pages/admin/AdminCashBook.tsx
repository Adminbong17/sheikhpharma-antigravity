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
import { toast } from "sonner";
import { Plus, Trash2, Search, ArrowDownCircle, ArrowUpCircle, Landmark } from "lucide-react";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

interface CashTransaction {
  id: string;
  type: string;
  amount: number;
  transaction_id: string;
  description: string | null;
  category: string | null;
  transaction_date: string;
  notes: string | null;
  created_at: string;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });

const printColumns: PrintColumn[] = [
  { header: "Date", accessor: (r: any) => formatDate(r.transaction_date) },
  { header: "Type", accessor: (r: any) => r.type === "cash_in" ? "Cash In" : "Cash Out" },
  { header: "Trans ID", accessor: (r: any) => r.transaction_id },
  { header: "Description", accessor: (r: any) => r.description || "-" },
  { header: "Category", accessor: (r: any) => r.category || "-" },
  { header: "Amount", accessor: (r: any) => `৳${Number(r.amount).toLocaleString()}` },
];

const AdminCashBook = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    type: "cash_in",
    amount: "",
    transaction_id: "",
    description: "",
    category: "",
    transaction_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cash_transactions"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("cash_transactions" as any) as any)
        .select("*")
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data as CashTransaction[];
    },
    refetchOnWindowFocus: true,
  });

  const filtered = transactions
    .filter((t) => filterType === "all" || t.type === filterType)
    .filter((t) => !dateFrom || t.transaction_date >= dateFrom)
    .filter((t) => !dateTo || t.transaction_date <= dateTo)
    .filter((t) =>
      t.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase())
    );

  const totalCashIn = filtered.filter((t) => t.type === "cash_in").reduce((s, t) => s + Number(t.amount), 0);
  const totalCashOut = filtered.filter((t) => t.type === "cash_out").reduce((s, t) => s + Number(t.amount), 0);
  const netBalance = totalCashIn - totalCashOut;

  const addTransaction = useMutation({
    mutationFn: async () => {
      if (!form.transaction_id.trim()) throw new Error("Transaction ID is required");
      if (!form.amount || parseFloat(form.amount) <= 0) throw new Error("Amount is required");
      const { error } = await (supabase.from("cash_transactions" as any) as any).insert({
        type: form.type,
        amount: parseFloat(form.amount),
        transaction_id: form.transaction_id.trim(),
        description: form.description || null,
        category: form.category || null,
        transaction_date: form.transaction_date,
        notes: form.notes || null,
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_transactions"] });
      setShowAdd(false);
      setForm({ type: "cash_in", amount: "", transaction_id: "", description: "", category: "", transaction_date: new Date().toISOString().split("T")[0], notes: "" });
      toast.success("Transaction added!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("cash_transactions" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_transactions"] });
      toast.success("Transaction deleted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Landmark className="h-6 w-6" /> Cash Book</h1>
          <p className="text-sm text-muted-foreground">Track cash in & cash out transactions</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Transaction</span><span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground"><ArrowDownCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" /> Cash In</div>
            <div className="text-lg sm:text-2xl font-bold text-green-600">৳{totalCashIn.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground"><ArrowUpCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" /> Cash Out</div>
            <div className="text-lg sm:text-2xl font-bold text-destructive">৳{totalCashOut.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className={netBalance >= 0 ? "border-green-300 bg-green-50/50" : "border-destructive/30 bg-destructive/5"}>
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="text-xs sm:text-sm text-muted-foreground">Net</div>
            <div className={`text-lg sm:text-2xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-destructive"}`}>
              ৳{netBalance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3 items-end">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[120px] sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="cash_in">Cash In</SelectItem>
            <SelectItem value="cash_out">Cash Out</SelectItem>
          </SelectContent>
        </Select>
        <div className="hidden sm:block">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
        </div>
        <div className="hidden sm:block">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
        )}
        <PrintExportButtons title="Cash Book" columns={printColumns} data={filtered} />
      </div>

      {/* Mobile cards */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No transactions found</p>
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {filtered.map((t) => (
              <div key={t.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${t.type === "cash_in" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {t.type === "cash_in" ? <ArrowDownCircle className="h-2.5 w-2.5" /> : <ArrowUpCircle className="h-2.5 w-2.5" />}
                        {t.type === "cash_in" ? "In" : "Out"}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">{t.transaction_id}</span>
                    </div>
                    <p className="text-sm mt-1">{t.description || "-"}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{formatDate(t.transaction_date)}</span>
                      {t.category && <span>• {t.category}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`font-semibold text-sm ${t.type === "cash_in" ? "text-green-600" : "text-destructive"}`}>
                      {t.type === "cash_in" ? "+" : "-"}৳{Number(t.amount).toLocaleString()}
                    </p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { if (confirm("Delete?")) deleteTransaction.mutate(t.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-lg border bg-muted/50 p-3 flex items-center justify-between font-bold text-sm">
              <span>Net Balance</span>
              <span className={netBalance >= 0 ? "text-green-600" : "text-destructive"}>৳{netBalance.toLocaleString()}</span>
            </div>
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trans ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{formatDate(t.transaction_date)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${t.type === "cash_in" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {t.type === "cash_in" ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                          {t.type === "cash_in" ? "Cash In" : "Cash Out"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{t.transaction_id}</TableCell>
                      <TableCell>{t.description || "-"}</TableCell>
                      <TableCell>{t.category || "-"}</TableCell>
                      <TableCell className={`text-right font-semibold ${t.type === "cash_in" ? "text-green-600" : "text-destructive"}`}>
                        {t.type === "cash_in" ? "+" : "-"}৳{Number(t.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this transaction?")) deleteTransaction.mutate(t.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={5}>Net Balance</TableCell>
                    <TableCell className={`text-right ${netBalance >= 0 ? "text-green-600" : "text-destructive"}`}>৳{netBalance.toLocaleString()}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Transaction Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_in">💰 Cash In (Earn)</SelectItem>
                  <SelectItem value="cash_out">💸 Cash Out (Expense)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction ID *</Label>
              <Input value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} placeholder="e.g. TRX-001, bKash-12345" />
            </div>
            <div>
              <Label>Amount (৳) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this for?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Sales, Rent" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional note" />
            </div>
            <Button className="w-full" onClick={() => addTransaction.mutate()} disabled={addTransaction.isPending}>
              {addTransaction.isPending ? "Saving..." : "Add Transaction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCashBook;
