import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CreditCard, Send, Wallet, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const MyCredits = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [method, setMethod] = useState("bkash");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: credits = [] } = useQuery({
    queryKey: ["my-credits", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("customer_credits").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["my-credit-payouts", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("customer_credit_payouts").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: refunds = [] } = useQuery({
    queryKey: ["my-refunds", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("refund_requests").select("*, orders(order_number)").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const totalCredits = credits.filter((c: any) => c.type === "credit").reduce((s: number, c: any) => s + Number(c.amount), 0);
  const totalDebits = credits.filter((c: any) => c.type === "debit").reduce((s: number, c: any) => s + Number(c.amount), 0);
  const balance = totalCredits - totalDebits;

  const handleRequest = async () => {
    if (!accountNumber.trim()) { toast.error("Enter your account number"); return; }
    if (balance <= 0) { toast.error("No available balance"); return; }
    setSubmitting(true);
    const { error } = await (supabase as any).from("customer_credit_payouts").insert({
      user_id: user!.id,
      amount: balance,
      method,
      account_number: accountNumber.trim(),
    });
    if (error) { toast.error("Failed to submit request"); setSubmitting(false); return; }
    // Notify admin
    await (supabase.from("notifications" as any) as any).insert({
      target_role: "admin",
      title: "Credit Payout Request",
      body: `Customer requested credit payout of ${formatPrice(balance)} via ${method}`,
      type: "payout",
      action_url: "/admin/customer-credits",
    });
    toast.success("Payout request submitted!");
    setSubmitting(false);
    setDialogOpen(false);
    setAccountNumber("");
    queryClient.invalidateQueries({ queryKey: ["my-credit-payouts"] });
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-600",
      approved: "bg-blue-500/10 text-blue-600",
      refunded: "bg-green-500/10 text-green-600",
      rejected: "bg-red-500/10 text-red-600",
      processing: "bg-blue-500/10 text-blue-600",
      done: "bg-green-500/10 text-green-600",
    };
    return <Badge className={map[s] || ""}>{s}</Badge>;
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        <h1 className="text-xl font-bold">My Credits & Refunds</h1>

        {/* Balance Card */}
        <Card className="border-primary">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Credit Balance</CardTitle>
            <Wallet className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatPrice(Math.max(balance, 0))}</p>
            <Button className="mt-3 gap-2" size="sm" disabled={balance <= 0} onClick={() => setDialogOpen(true)}>
              <Send className="h-4 w-4" /> Request Payout
            </Button>
          </CardContent>
        </Card>

        {/* Refund Requests */}
        <Card>
          <CardHeader><CardTitle className="text-base">Refund Requests</CardTitle></CardHeader>
          <CardContent>
            {refunds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No refund requests</p>
            ) : (
              <div className="space-y-2">
                {refunds.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Order #{r.orders?.order_number || "-"}</p>
                      <p className="text-xs text-muted-foreground">{r.reason || "No reason"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatPrice(r.amount)}</p>
                      {statusBadge(r.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit History */}
        <Card>
          <CardHeader><CardTitle className="text-base">Credit History</CardTitle></CardHeader>
          <CardContent>
            {credits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No credit transactions</p>
            ) : (
              <div className="space-y-2">
                {credits.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{c.description || (c.type === "credit" ? "Credit Added" : "Payout")}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className={`text-sm font-bold ${c.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                      {c.type === "credit" ? "+" : "-"}{formatPrice(c.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card>
          <CardHeader><CardTitle className="text-base">Payout History</CardTitle></CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payout requests</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium capitalize">{p.method} — {p.account_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatPrice(p.amount)}</p>
                      {statusBadge(p.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payout Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Credit Payout</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-4 text-center">
              <p className="text-sm text-muted-foreground">Payout Amount</p>
              <p className="text-3xl font-bold text-primary">{formatPrice(Math.max(balance, 0))}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Payment Method</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Account Number</label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRequest} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyCredits;
