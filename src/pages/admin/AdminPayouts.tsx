import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import PrintExportButtons from "@/components/PrintExportButtons";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, Wallet } from "lucide-react";
import BackButton from "@/components/BackButton";

const AdminPayouts = () => {
  const { formatPrice } = useCurrency();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPayout, setEditPayout] = useState<any | null>(null);
  const [form, setForm] = useState({ status: "pending", admin_trx_id: "", admin_method: "", admin_note: "" });
  const [saving, setSaving] = useState(false);

  const fetchPayouts = async () => {
    const { data } = await (supabase as any)
      .from("vendor_payouts")
      .select("*, vendors(store_name, commission_rate, user_id), vendor_payment_methods(method_type, account_name, account_number, bank_name, branch_name)")
      .order("requested_at", { ascending: false });
    setPayouts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPayouts(); }, []);

  const openEdit = (p: any) => {
    setEditPayout(p);
    setForm({ status: p.status, admin_trx_id: p.admin_trx_id || "", admin_method: p.admin_method || "", admin_note: p.admin_note || "" });
  };

  const handleSave = async () => {
    setSaving(true);
    const updates: any = {
      status: form.status,
      admin_trx_id: form.admin_trx_id || null,
      admin_method: form.admin_method || null,
      admin_note: form.admin_note || null,
    };
    if (form.status === "processing" && editPayout.status !== "processing") updates.processed_at = new Date().toISOString();
    if (form.status === "done" && editPayout.status !== "done") updates.completed_at = new Date().toISOString();

    await (supabase as any).from("vendor_payouts").update(updates).eq("id", editPayout.id);

    // Notify vendor about payout status
    if (editPayout.vendors?.user_id) {
      const statusMsg: Record<string, string> = {
        processing: "আপনার পেআউট প্রসেস হচ্ছে।",
        done: "আপনার পেআউট সম্পন্ন হয়েছে! 💰",
      };
      if (statusMsg[form.status]) {
        await (supabase.from("notifications" as any) as any).insert({
          user_id: editPayout.vendors.user_id,
          target_role: "vendor",
          title: "পেআউট আপডেট",
          body: statusMsg[form.status],
          type: "payout",
          action_url: "/vendor/payouts",
        });
      }
    }

    toast.success("Payout updated");
    setSaving(false);
    setEditPayout(null);
    fetchPayouts();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { pending: "bg-yellow-500/10 text-yellow-600", processing: "bg-blue-500/10 text-blue-600", done: "bg-green-500/10 text-green-600" };
    return <Badge className={map[s] || ""}>{s}</Badge>;
  };

  const printColumns: import("@/lib/printExport").PrintColumn[] = [
    { header: "Date", accessor: (r) => new Date(r.requested_at).toLocaleDateString() },
    { header: "Vendor", accessor: (r) => r.vendors?.store_name || "-" },
    { header: "Amount", accessor: (r) => formatPrice(r.amount) },
    { header: "Status", accessor: (r) => r.status },
    { header: "Trx ID", accessor: (r) => r.admin_trx_id || "-" },
    { header: "Method", accessor: (r) => r.admin_method || "-" },
  ];

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Vendor Payouts</h1>
        <PrintExportButtons title="Vendor Payouts" columns={printColumns} data={payouts} />
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {payouts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No payout requests yet.</p>
          </div>
        ) : payouts.map((p) => (
          <div key={p.id} className="rounded-lg border bg-card p-3 space-y-2" onClick={() => openEdit(p)}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-medium text-sm">{p.vendors?.store_name || "—"}</p>
                {p.vendor_payment_methods && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {p.vendor_payment_methods.method_type} — {p.vendor_payment_methods.account_number}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{formatPrice(p.amount)}</p>
                {statusBadge(p.status)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{new Date(p.requested_at).toLocaleDateString()}</span>
              {p.admin_trx_id && <span>TRX: {p.admin_trx_id}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          {payouts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No payout requests yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trx ID</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{p.vendors?.store_name || "-"}</TableCell>
                    <TableCell className="font-medium">{formatPrice(p.amount)}</TableCell>
                    <TableCell className="text-sm">
                      {p.vendor_payment_methods ? (
                        <div>
                          <span className="capitalize">{p.vendor_payment_methods.method_type}</span>
                          <br /><span className="text-muted-foreground">{p.vendor_payment_methods.account_name} — {p.vendor_payment_methods.account_number}</span>
                          {p.vendor_payment_methods.bank_name && <><br /><span className="text-muted-foreground">{p.vendor_payment_methods.bank_name} ({p.vendor_payment_methods.branch_name})</span></>}
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-sm">{p.admin_trx_id || "-"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Update</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editPayout} onOpenChange={(o) => !o && setEditPayout(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Payout</DialogTitle></DialogHeader>
          {editPayout && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p><strong>Vendor:</strong> {editPayout.vendors?.store_name}</p>
                <p><strong>Amount:</strong> {formatPrice(editPayout.amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Transaction ID</label>
                <Input value={form.admin_trx_id} onChange={(e) => setForm(prev => ({ ...prev, admin_trx_id: e.target.value }))} placeholder="TRX123..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Payment Method Used</label>
                <Input value={form.admin_method} onChange={(e) => setForm(prev => ({ ...prev, admin_method: e.target.value }))} placeholder="bKash / Nagad / Bank" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Note</label>
                <Textarea value={form.admin_note} onChange={(e) => setForm(prev => ({ ...prev, admin_note: e.target.value }))} placeholder="Optional note" rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPayout(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayouts;
