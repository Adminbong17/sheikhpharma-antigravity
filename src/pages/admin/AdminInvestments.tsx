import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Printer, Image as ImageIcon, Search, UserPlus, Wallet, Edit, Receipt } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import html2canvas from "html2canvas";
import BackButton from "@/components/BackButton";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Investor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  investor_id: string;
  amount: number;
  type: string;
  description: string | null;
  transaction_date: string;
  created_at: string;
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
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });

// ─── Print Templates ────────────────────────────────────────────────────────
const A4InvestorReport = ({ investor, transactions, expenses, totalInvestment, totalExpense, siteName, logoUrl }: {
  investor: Investor; transactions: Transaction[]; expenses: Expense[]; totalInvestment: number; totalExpense: number; siteName: string; logoUrl?: string | null;
}) => (
  <div style={{ fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#111", lineHeight: 1.6, background: "#fff", padding: "32px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #111", paddingBottom: "16px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {logoUrl && <img src={logoUrl} alt="logo" style={{ height: "52px", objectFit: "contain" }} />}
        <div>
          <div style={{ fontSize: "24px", fontWeight: "bold" }}>{siteName}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>Investment Report</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "22px", fontWeight: "bold" }}>INVESTMENT</div>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{formatDate(new Date().toISOString())}</div>
      </div>
    </div>
    <div style={{ background: "#f7f7f7", padding: "14px", borderRadius: "8px", borderLeft: "4px solid #111", marginBottom: "24px" }}>
      <div style={{ fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", color: "#888", marginBottom: "8px", letterSpacing: "1px" }}>Investor Info</div>
      <div style={{ fontWeight: "bold", fontSize: "14px" }}>{investor.name}</div>
      {investor.phone && <div style={{ marginTop: "4px" }}>📞 {investor.phone}</div>}
      {investor.email && <div style={{ marginTop: "4px" }}>📧 {investor.email}</div>}
      {investor.address && <div style={{ marginTop: "4px", color: "#555" }}>📍 {investor.address}</div>}
    </div>
    {/* Investments Table */}
    <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px" }}>Investment Entries</div>
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
      <thead>
        <tr style={{ background: "#111", color: "#fff" }}>
          <th style={{ padding: "10px 14px", textAlign: "left" }}>#</th>
          <th style={{ padding: "10px 14px", textAlign: "left" }}>Date</th>
          <th style={{ padding: "10px 14px", textAlign: "left" }}>Type</th>
          <th style={{ padding: "10px 14px", textAlign: "left" }}>Description</th>
          <th style={{ padding: "10px 14px", textAlign: "right" }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t, i) => (
          <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
            <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", color: "#888" }}>{i + 1}</td>
            <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee" }}>{formatDate(t.transaction_date)}</td>
            <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", textTransform: "capitalize" }}>{t.type}</td>
            <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee" }}>{t.description || "-"}</td>
            <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", textAlign: "right", fontWeight: "bold" }}>৳{Number(t.amount).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
    {/* Expenses Table */}
    {expenses.length > 0 && (
      <>
        <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px" }}>Expenses</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ background: "#b91c1c", color: "#fff" }}>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>#</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Date</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Name</th>
              <th style={{ padding: "10px 14px", textAlign: "center" }}>Qty</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Source</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>By</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, i) => (
              <tr key={e.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", color: "#888" }}>{i + 1}</td>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee" }}>{formatDate(e.expense_date)}</td>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee" }}>{e.name}</td>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", textAlign: "center" }}>{e.quantity}</td>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee" }}>{e.source || "-"}</td>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee" }}>{e.expense_by || "-"}</td>
                <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", textAlign: "right", fontWeight: "bold", color: "#b91c1c" }}>৳{Number(e.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}
    {/* Summary */}
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{ minWidth: "280px", background: "#f7f7f7", borderRadius: "8px", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span>Total Investment</span><span style={{ fontWeight: "bold" }}>৳{Number(totalInvestment).toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "#b91c1c" }}>
          <span>Total Expenses</span><span style={{ fontWeight: "bold" }}>- ৳{Number(totalExpense).toLocaleString()}</span>
        </div>
        <div style={{ borderTop: "2px solid #111", paddingTop: "10px", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px" }}>
          <span>Net Balance</span>
          <span>৳{Number(totalInvestment - totalExpense).toLocaleString()}</span>
        </div>
      </div>
    </div>
    <div style={{ borderTop: "1px solid #ddd", paddingTop: "14px", marginTop: "20px", textAlign: "center", color: "#aaa", fontSize: "11px" }}>
      {siteName} • Investment Report • {investor.name}
    </div>
  </div>
);

const POSInvestorReport = ({ investor, transactions, expenses, totalInvestment, totalExpense, siteName, logoUrl, narrow = false }: {
  investor: Investor; transactions: Transaction[]; expenses: Expense[]; totalInvestment: number; totalExpense: number; siteName: string; logoUrl?: string | null; narrow?: boolean;
}) => (
  <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: narrow ? "10px" : "12px", color: "#111", width: narrow ? "210px" : "300px", margin: "0 auto", lineHeight: 1.4, background: "#fff", padding: narrow ? "8px" : "16px" }}>
    <div style={{ textAlign: "center", borderBottom: "1px dashed #111", paddingBottom: "10px", marginBottom: "10px" }}>
      {logoUrl && <img src={logoUrl} alt="logo" style={{ height: "36px", objectFit: "contain", marginBottom: "6px" }} />}
      <div style={{ fontSize: "17px", fontWeight: "bold" }}>{siteName}</div>
      <div style={{ fontSize: "10px", color: "#666" }}>INVESTMENT REPORT</div>
    </div>
    <div style={{ borderBottom: "1px dashed #111", paddingBottom: "8px", marginBottom: "8px", fontSize: "11px" }}>
      <div><strong>Name:</strong> {investor.name}</div>
      {investor.phone && <div><strong>Phone:</strong> {investor.phone}</div>}
      {investor.email && <div><strong>Email:</strong> {investor.email}</div>}
    </div>
    <div style={{ borderBottom: "1px dashed #111", paddingBottom: "8px", marginBottom: "8px" }}>
      <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "4px" }}>INVESTMENTS</div>
      {transactions.map((t, i) => (
        <div key={t.id} style={{ marginBottom: "5px" }}>
          <div style={{ fontWeight: "bold", fontSize: "11px" }}>{formatDate(t.transaction_date)} - {t.type}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <span>{t.description || "-"}</span>
            <span style={{ fontWeight: "bold" }}>৳{Number(t.amount).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
    {expenses.length > 0 && (
      <div style={{ borderBottom: "1px dashed #111", paddingBottom: "8px", marginBottom: "8px" }}>
        <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "4px", color: "#b91c1c" }}>EXPENSES</div>
        {expenses.map((e) => (
          <div key={e.id} style={{ marginBottom: "5px" }}>
            <div style={{ fontWeight: "bold", fontSize: "11px" }}>{formatDate(e.expense_date)} - {e.name} x{e.quantity}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <span>{e.source || "-"} | {e.expense_by || "-"}</span>
              <span style={{ fontWeight: "bold", color: "#b91c1c" }}>৳{Number(e.amount).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    )}
    <div style={{ fontSize: "11px", marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
      <span>Investment</span><span>৳{Number(totalInvestment).toLocaleString()}</span>
    </div>
    <div style={{ fontSize: "11px", marginBottom: "4px", display: "flex", justifyContent: "space-between", color: "#b91c1c" }}>
      <span>Expenses</span><span>- ৳{Number(totalExpense).toLocaleString()}</span>
    </div>
    <div style={{ borderTop: "1px dashed #111", paddingTop: "6px", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "15px" }}>
      <span>NET</span><span>৳{Number(totalInvestment - totalExpense).toLocaleString()}</span>
    </div>
    <div style={{ borderTop: "1px dashed #111", paddingTop: "8px", marginTop: "8px", textAlign: "center", fontSize: "10px", color: "#aaa" }}>
      {siteName} • {investor.name}
    </div>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────
const AdminInvestments = () => {
  const qc = useQueryClient();
  const { data: settings } = useSiteSettings();
  const siteName = settings?.site_name || "Shop";
  const logoUrl = settings?.logo_url;

  const [search, setSearch] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [showCreateInvestor, setShowCreateInvestor] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [printTab, setPrintTab] = useState<"a4" | "pos" | "pos56">("a4");
  const [detailTab, setDetailTab] = useState<"investments" | "expenses">("investments");
  const [exporting, setExporting] = useState(false);
  const a4Ref = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLDivElement>(null);
  const pos56Ref = useRef<HTMLDivElement>(null);

  // Form states
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [txForm, setTxForm] = useState({ amount: "", type: "investment", description: "", transaction_date: new Date().toISOString().split("T")[0] });
  const [expForm, setExpForm] = useState({ name: "", quantity: "1", source: "", amount: "", expense_by: "", expense_date: new Date().toISOString().split("T")[0], notes: "" });

  // ─── Queries ───────────────────────────────────────────────────────
  const { data: investors = [], isLoading } = useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("investors" as any) as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Investor[];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["investment_transactions", selectedInvestor?.id],
    queryFn: async () => {
      if (!selectedInvestor) return [];
      const { data, error } = await (supabase.from("investment_transactions" as any) as any)
        .select("*")
        .eq("investor_id", selectedInvestor.id)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!selectedInvestor,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["investment_expenses", selectedInvestor?.id],
    queryFn: async () => {
      if (!selectedInvestor) return [];
      const { data, error } = await (supabase.from("investment_expenses" as any) as any)
        .select("*")
        .eq("investor_id", selectedInvestor.id)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!selectedInvestor,
  });

  const totalInvestment = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netBalance = totalInvestment - totalExpense;

  // ─── Mutations ─────────────────────────────────────────────────────
  const createInvestor = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const { error } = await (supabase.from("investors" as any) as any).insert({ name: form.name.trim(), phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["investors"] }); setShowCreateInvestor(false); setForm({ name: "", phone: "", email: "", address: "", notes: "" }); toast.success("Investor account created!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateInvestor = useMutation({
    mutationFn: async () => {
      if (!editingInvestor) return;
      const { error } = await (supabase.from("investors" as any) as any).update({ name: form.name.trim(), phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null }).eq("id", editingInvestor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["investors"] });
      if (selectedInvestor && editingInvestor && selectedInvestor.id === editingInvestor.id) {
        setSelectedInvestor({ ...selectedInvestor, name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null });
      }
      setEditingInvestor(null); setForm({ name: "", phone: "", email: "", address: "", notes: "" }); toast.success("Investor updated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteInvestor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("investors" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["investors"] }); if (selectedInvestor) setSelectedInvestor(null); toast.success("Investor deleted!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addTransaction = useMutation({
    mutationFn: async () => {
      if (!selectedInvestor || !txForm.amount) throw new Error("Amount required");
      const { error } = await (supabase.from("investment_transactions" as any) as any).insert({
        investor_id: selectedInvestor.id,
        amount: parseFloat(txForm.amount),
        type: txForm.type,
        description: txForm.description || null,
        transaction_date: txForm.transaction_date,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["investment_transactions"] }); setShowAddTx(false); setTxForm({ amount: "", type: "investment", description: "", transaction_date: new Date().toISOString().split("T")[0] }); toast.success("Transaction added!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTx = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("investment_transactions" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["investment_transactions"] }); toast.success("Transaction deleted!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      if (!selectedInvestor || !expForm.name.trim() || !expForm.amount) throw new Error("Name and Amount required");
      const { error } = await (supabase.from("investment_expenses" as any) as any).insert({
        investor_id: selectedInvestor.id,
        name: expForm.name.trim(),
        quantity: parseInt(expForm.quantity) || 1,
        source: expForm.source || null,
        amount: parseFloat(expForm.amount),
        expense_by: expForm.expense_by || null,
        expense_date: expForm.expense_date,
        notes: expForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["investment_expenses"] });
      setShowAddExpense(false);
      setExpForm({ name: "", quantity: "1", source: "", amount: "", expense_by: "", expense_date: new Date().toISOString().split("T")[0], notes: "" });
      toast.success("Expense added!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("investment_expenses" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["investment_expenses"] }); toast.success("Expense deleted!"); },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Print / Export ────────────────────────────────────────────────
  const printReport = (type: "a4" | "pos" | "pos56") => {
    const ref = type === "a4" ? a4Ref : type === "pos" ? posRef : pos56Ref;
    const content = ref.current?.innerHTML;
    if (!content) return;
    const pageStyle =
      type === "pos56"
        ? `@page { size: 56mm auto; margin: 2mm; } body { margin: 0; }`
        : type === "pos"
        ? `@page { size: 80mm auto; margin: 4mm; } body { margin: 0; }`
        : `@page { size: A4; margin: 15mm; } body { margin: 0; }`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Investment Report</title><style>${pageStyle} * { box-sizing: border-box; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style></head><body>${content}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  const exportAsImage = async (type: "a4" | "pos" | "pos56") => {
    const ref = type === "a4" ? a4Ref : type === "pos" ? posRef : pos56Ref;
    if (!ref.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const link = document.createElement("a");
      link.download = `Investment-${selectedInvestor?.name}-${type.toUpperCase()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
      toast.success("Image downloaded!");
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  const filtered = investors.filter((inv) =>
    inv.name.toLowerCase().includes(search.toLowerCase()) ||
    inv.phone?.includes(search) ||
    inv.email?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Investor Detail View ─────────────────────────────────────────
  if (selectedInvestor) {
    return (
      <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedInvestor(null); setDetailTab("investments"); }}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{selectedInvestor.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[selectedInvestor.phone, selectedInvestor.email].filter(Boolean).join(" • ")}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Investment</div>
              <div className="text-2xl font-bold text-primary">৳{totalInvestment.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Expenses</div>
              <div className="text-2xl font-bold text-destructive">৳{totalExpense.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Net Balance</div>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-destructive"}`}>৳{netBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex gap-2 items-end flex-wrap">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowPrint(true)}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Investments & Expenses */}
        <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as any)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="investments">💰 Investments ({transactions.length})</TabsTrigger>
              <TabsTrigger value="expenses">📋 Expenses ({expenses.length})</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              {detailTab === "investments" && (
                <Button size="sm" onClick={() => setShowAddTx(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Entry
                </Button>
              )}
              {detailTab === "expenses" && (
                <Button size="sm" onClick={() => setShowAddExpense(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Expense
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="investments">
            <Card>
              <CardContent className="pt-6">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No entries yet</p>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{formatDate(t.transaction_date)}</TableCell>
                            <TableCell>
                              <Badge variant={t.type === "investment" ? "default" : "secondary"} className="capitalize">{t.type}</Badge>
                            </TableCell>
                            <TableCell>{t.description || "-"}</TableCell>
                            <TableCell className="text-right font-semibold">৳{Number(t.amount).toLocaleString()}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this entry?")) deleteTx.mutate(t.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={3}>Sub Total</TableCell>
                          <TableCell className="text-right">৳{totalInvestment.toLocaleString()}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardContent className="pt-6">
                {expenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No expenses yet</p>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Expense By</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{formatDate(e.expense_date)}</TableCell>
                            <TableCell className="font-medium">{e.name}</TableCell>
                            <TableCell className="text-center">{e.quantity}</TableCell>
                            <TableCell>{e.source || "-"}</TableCell>
                            <TableCell>{e.expense_by || "-"}</TableCell>
                            <TableCell className="text-right font-semibold text-destructive">৳{Number(e.amount).toLocaleString()}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this expense?")) deleteExpense.mutate(e.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={5}>Total Expenses</TableCell>
                          <TableCell className="text-right text-destructive">৳{totalExpense.toLocaleString()}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Transaction Dialog */}
        <Dialog open={showAddTx} onOpenChange={setShowAddTx}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Investment Entry</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Amount (৳)</Label><Input type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} placeholder="0" /></div>
              <div>
                <Label>Type</Label>
                <Select value={txForm.type} onValueChange={(v) => setTxForm({ ...txForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="profit">Profit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={txForm.transaction_date} onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} placeholder="Optional note" /></div>
              <Button className="w-full" onClick={() => addTransaction.mutate()} disabled={addTransaction.isPending}>{addTransaction.isPending ? "Saving..." : "Add Entry"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Expense Dialog */}
        <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={expForm.name} onChange={(e) => setExpForm({ ...expForm, name: e.target.value })} placeholder="Expense name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Quantity</Label><Input type="number" min="1" value={expForm.quantity} onChange={(e) => setExpForm({ ...expForm, quantity: e.target.value })} /></div>
                <div><Label>Amount (৳) *</Label><Input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} placeholder="0" /></div>
              </div>
              <div><Label>Source</Label><Input value={expForm.source} onChange={(e) => setExpForm({ ...expForm, source: e.target.value })} placeholder="Where purchased from" /></div>
              <div><Label>Expense By</Label><Input value={expForm.expense_by} onChange={(e) => setExpForm({ ...expForm, expense_by: e.target.value })} placeholder="Who spent" /></div>
              <div><Label>Date</Label><Input type="date" value={expForm.expense_date} onChange={(e) => setExpForm({ ...expForm, expense_date: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={expForm.notes} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} placeholder="Optional note" /></div>
              <Button className="w-full" onClick={() => addExpense.mutate()} disabled={addExpense.isPending}>{addExpense.isPending ? "Saving..." : "Add Expense"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Print Dialog */}
        <Dialog open={showPrint} onOpenChange={setShowPrint}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Investment Report — {selectedInvestor.name}</DialogTitle></DialogHeader>
            <Tabs value={printTab} onValueChange={(v) => setPrintTab(v as "a4" | "pos" | "pos56")}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <TabsList>
                  <TabsTrigger value="a4">📄 A4</TabsTrigger>
                  <TabsTrigger value="pos">🧾 80mm</TabsTrigger>
                  <TabsTrigger value="pos56">🧾 56mm</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printReport(printTab)}><Printer className="h-3.5 w-3.5" /> Print</Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportAsImage(printTab)} disabled={exporting}><ImageIcon className="h-3.5 w-3.5" /> {exporting ? "Exporting..." : "Save JPG"}</Button>
                </div>
              </div>
              <TabsContent value="a4">
                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <div ref={a4Ref}><A4InvestorReport investor={selectedInvestor} transactions={transactions} expenses={expenses} totalInvestment={totalInvestment} totalExpense={totalExpense} siteName={siteName} logoUrl={logoUrl} /></div>
                </div>
              </TabsContent>
              <TabsContent value="pos">
                <div className="flex justify-center">
                  <div className="border rounded-xl overflow-hidden shadow-sm w-fit">
                    <div ref={posRef}><POSInvestorReport investor={selectedInvestor} transactions={transactions} expenses={expenses} totalInvestment={totalInvestment} totalExpense={totalExpense} siteName={siteName} logoUrl={logoUrl} /></div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="pos56">
                <div className="flex justify-center">
                  <div className="border rounded-xl overflow-hidden shadow-sm w-fit">
                    <div ref={pos56Ref}><POSInvestorReport investor={selectedInvestor} transactions={transactions} expenses={expenses} totalInvestment={totalInvestment} totalExpense={totalExpense} siteName={siteName} logoUrl={logoUrl} narrow /></div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Investors List View ──────────────────────────────────────────
  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" /> Investments</h1>
          <p className="text-sm text-muted-foreground">Manage investor accounts and track investments</p>
        </div>
        <Button onClick={() => { setForm({ name: "", phone: "", email: "", address: "", notes: "" }); setShowCreateInvestor(true); }} className="gap-1.5">
          <UserPlus className="h-4 w-4" /> New Investor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search investors..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No investors found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((inv) => (
            <Card key={inv.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedInvestor(inv)}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{inv.name}</h3>
                    {inv.phone && <p className="text-sm text-muted-foreground">📞 {inv.phone}</p>}
                    {inv.email && <p className="text-sm text-muted-foreground">📧 {inv.email}</p>}
                    {inv.address && <p className="text-sm text-muted-foreground mt-1">📍 {inv.address}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setForm({ name: inv.name, phone: inv.phone || "", email: inv.email || "", address: inv.address || "", notes: inv.notes || "" }); setEditingInvestor(inv); }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${inv.name}?`)) deleteInvestor.mutate(inv.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Badge variant={inv.status === "active" ? "default" : "secondary"} className="mt-3 capitalize">{inv.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Investor Dialog */}
      <Dialog open={showCreateInvestor} onOpenChange={setShowCreateInvestor}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Investor Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Investor name" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" /></div>
            <div><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></div>
            <Button className="w-full" onClick={() => createInvestor.mutate()} disabled={createInvestor.isPending}>{createInvestor.isPending ? "Creating..." : "Create Account"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Investor Dialog */}
      <Dialog open={!!editingInvestor} onOpenChange={(v) => { if (!v) setEditingInvestor(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Investor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={() => updateInvestor.mutate()} disabled={updateInvestor.isPending}>{updateInvestor.isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvestments;
