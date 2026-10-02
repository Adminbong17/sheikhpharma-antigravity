import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/contexts/VendorContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PrintExportButtons from "@/components/PrintExportButtons";
import { toast } from "sonner";
import { Wallet, Send, Clock, CheckCircle2, Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";

const VendorPayouts = () => {
  const { vendorId, vendor } = useVendor();
  const { formatPrice } = useCurrency();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState({ revenue: 0, commission: 0, paid: 0 });

  const fetchAll = async () => {
    if (!vendorId || !vendor) return;
    const [payoutsRes, methodsRes, orderItemsRes] = await Promise.all([
      (supabase as any).from("vendor_payouts").select("*, vendor_payment_methods(method_type, account_name, account_number)").eq("vendor_id", vendorId).order("requested_at", { ascending: false }),
      (supabase as any).from("vendor_payment_methods").select("*").eq("vendor_id", vendorId),
      supabase.from("order_items").select("price, quantity, products!inner(vendor_id)").eq("products.vendor_id", vendorId),
    ]);
    setPayouts(payoutsRes.data || []);
    setMethods(methodsRes.data || []);
    const revenue = (orderItemsRes.data || []).reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const commission = revenue * (vendor.commission_rate / 100);
    const paid = (payoutsRes.data || []).filter((p: any) => p.status === "done").reduce((s: number, p: any) => s + Number(p.amount), 0);
    setBalance({ revenue, commission, paid });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [vendorId, vendor]);

  const availableBalance = balance.revenue - balance.commission - balance.paid;

  const statusBadge = (s: string) => {
    if (s === "done") return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Done</Badge>;
    if (s === "processing") return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const printColumns = [
    { header: "Date", accessor: (p: any) => new Date(p.requested_at).toLocaleDateString() },
    { header: "Amount", accessor: (p: any) => p.amount },
    { header: "Method", accessor: (p: any) => p.vendor_payment_methods?.method_type || "-" },
    { header: "Status", accessor: (p: any) => p.status },
    { header: "Trx ID", accessor: (p: any) => p.admin_trx_id || "-" },
  ];

  const handleRequest = async () => {
    if (!selectedMethod || availableBalance <= 0) return;
    setSubmitting(true);
    const { error } = await (supabase as any).from("vendor_payouts").insert({
      vendor_id: vendorId,
      amount: Math.max(availableBalance, 0),
      payment_method_id: selectedMethod,
      status: "pending",
    });
    if (error) toast.error(error.message);
    else { toast.success("Withdrawal request submitted!"); setDialogOpen(false); fetchAll(); }
    setSubmitting(false);
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Payouts</h1>
        <div className="flex gap-2">
          <PrintExportButtons title="Payout History" columns={printColumns} data={payouts} />
          <Button onClick={() => setDialogOpen(true)} disabled={availableBalance <= 0} className="gap-2"><Send className="h-4 w-4" /> Request Withdrawal</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs sm:text-sm text-muted-foreground">Total Sales</CardTitle></CardHeader>
          <CardContent><p className="text-lg sm:text-2xl font-bold">{formatPrice(balance.revenue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs sm:text-sm text-muted-foreground">Commission ({vendor?.commission_rate}%)</CardTitle></CardHeader>
          <CardContent><p className="text-lg sm:text-2xl font-bold">{formatPrice(balance.commission)}</p></CardContent>
        </Card>
        <Card className="border-primary col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs sm:text-sm text-muted-foreground">Available Balance</CardTitle>
            <Wallet className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent><p className="text-lg sm:text-2xl font-bold text-primary">{formatPrice(Math.max(availableBalance, 0))}</p></CardContent>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        <h2 className="text-base font-semibold">Payout History</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No payout requests yet.</p>
        ) : payouts.map((p) => (
          <div key={p.id} className="rounded-lg border bg-card p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{formatPrice(p.amount)}</span>
              {statusBadge(p.status)}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{p.vendor_payment_methods?.method_type || "-"} — {p.vendor_payment_methods?.account_number || ""}</p>
              <div className="flex justify-between">
                <span>{new Date(p.requested_at).toLocaleDateString()}</span>
                {p.admin_trx_id && <span className="font-mono">Trx: {p.admin_trx_id}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block">
        <CardHeader><CardTitle className="text-base">Payout History</CardTitle></CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No payout requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trx ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{formatPrice(p.amount)}</TableCell>
                    <TableCell className="text-sm">
                      {p.vendor_payment_methods?.method_type || "-"} — {p.vendor_payment_methods?.account_number || ""}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-sm">{p.admin_trx_id || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-4 text-center">
              <p className="text-sm text-muted-foreground">Withdrawal Amount</p>
              <p className="text-3xl font-bold text-primary">{formatPrice(Math.max(availableBalance, 0))}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Select Payment Method</label>
              {methods.length === 0 ? (
                <p className="text-sm text-destructive">No payment methods added. Please add one first.</p>
              ) : (
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger><SelectValue placeholder="Choose method" /></SelectTrigger>
                  <SelectContent>
                    {methods.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.method_type === "bkash" ? "bKash" : m.method_type === "nagad" ? "Nagad" : "Bank"} — {m.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRequest} disabled={submitting || methods.length === 0}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorPayouts;
