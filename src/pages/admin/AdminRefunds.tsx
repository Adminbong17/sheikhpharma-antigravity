import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import PrintExportButtons from "@/components/PrintExportButtons";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import BackButton from "@/components/BackButton";

const AdminRefunds = () => {
  const { formatPrice } = useCurrency();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRefund, setEditRefund] = useState<any | null>(null);
  const [form, setForm] = useState({ status: "pending", admin_trx_id: "", admin_method: "", admin_note: "" });
  const [saving, setSaving] = useState(false);

  const fetchRefunds = async () => {
    const { data } = await (supabase as any)
      .from("refund_requests")
      .select("*, orders(order_number, customer_name, customer_phone), vendors(store_name)")
      .order("created_at", { ascending: false });
    setRefunds(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRefunds(); }, []);

  const openEdit = (r: any) => {
    setEditRefund(r);
    setForm({ status: r.status, admin_trx_id: r.admin_trx_id || "", admin_method: r.admin_method || "", admin_note: r.admin_note || "" });
  };

  const handleSave = async () => {
    setSaving(true);
    const updates: any = {
      status: form.status,
      admin_trx_id: form.admin_trx_id || null,
      admin_method: form.admin_method || null,
      admin_note: form.admin_note || null,
    };
    if (form.status === "approved" && editRefund.status !== "approved") updates.processed_at = new Date().toISOString();
    if (form.status === "refunded" && editRefund.status !== "refunded") {
      updates.completed_at = new Date().toISOString();
      // Add credit to customer
      await (supabase as any).from("customer_credits").insert({
        user_id: editRefund.user_id,
        amount: editRefund.amount,
        type: "credit",
        reference_id: editRefund.id,
        description: `Refund for order #${editRefund.orders?.order_number || ""}`,
      });
    }

    await (supabase as any).from("refund_requests").update(updates).eq("id", editRefund.id);

    // Notify customer about refund status
    const statusMsg: Record<string, string> = {
      approved: "আপনার রিফান্ড অনুমোদিত হয়েছে!",
      refunded: "আপনার রিফান্ড সম্পন্ন হয়েছে! 💰",
      rejected: "আপনার রিফান্ড প্রত্যাখ্যাত হয়েছে।",
    };
    if (statusMsg[form.status]) {
      await (supabase.from("notifications" as any) as any).insert({
        user_id: editRefund.user_id,
        target_role: "user",
        title: "রিফান্ড আপডেট",
        body: statusMsg[form.status],
        type: "refund",
        action_url: "/dashboard/orders",
      });
    }

    toast.success("Refund updated");
    setSaving(false);
    setEditRefund(null);
    fetchRefunds();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-600",
      approved: "bg-blue-500/10 text-blue-600",
      refunded: "bg-green-500/10 text-green-600",
      rejected: "bg-red-500/10 text-red-600",
    };
    return <Badge className={map[s] || ""}>{s}</Badge>;
  };

  const printColumns: import("@/lib/printExport").PrintColumn[] = [
    { header: "Date", accessor: (r) => new Date(r.created_at).toLocaleDateString() },
    { header: "Order#", accessor: (r) => r.orders?.order_number || "-" },
    { header: "Customer", accessor: (r) => r.orders?.customer_name || "-" },
    { header: "Vendor", accessor: (r) => r.vendors?.store_name || "-" },
    { header: "Amount", accessor: (r) => formatPrice(r.amount) },
    { header: "Status", accessor: (r) => r.status },
    { header: "Trx ID", accessor: (r) => r.admin_trx_id || "-" },
  ];

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Refund Requests</h1>
        <PrintExportButtons title="Refund Requests" columns={printColumns} data={refunds} />
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {refunds.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No refund requests yet.</p>
          </div>
        ) : refunds.map((r) => (
          <div key={r.id} className="rounded-lg border bg-card p-3 space-y-2" onClick={() => openEdit(r)}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium">#{r.orders?.order_number || "—"}</p>
                <p className="text-sm">{r.orders?.customer_name || "—"}</p>
                {r.vendors?.store_name && <p className="text-xs text-muted-foreground">Vendor: {r.vendors.store_name}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{formatPrice(r.amount)}</p>
                {statusBadge(r.status)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{new Date(r.created_at).toLocaleDateString()}</span>
              {r.reason && <span className="truncate max-w-[150px]">{r.reason}</span>}
              {r.admin_trx_id && <span>TRX: {r.admin_trx_id}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          {refunds.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No refund requests yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trx ID</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refunds.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-sm">#{r.orders?.order_number || "-"}</TableCell>
                    <TableCell className="text-sm">{r.orders?.customer_name || "-"}</TableCell>
                    <TableCell className="text-sm">{r.vendors?.store_name || "-"}</TableCell>
                    <TableCell className="font-medium">{formatPrice(r.amount)}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{r.reason || "-"}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-sm">{r.admin_trx_id || "-"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Update</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editRefund} onOpenChange={(o) => !o && setEditRefund(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Refund</DialogTitle></DialogHeader>
          {editRefund && (
            <div className="space-y-4">
             <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p><strong>Order:</strong> #{editRefund.orders?.order_number}</p>
                <p><strong>Customer:</strong> {editRefund.orders?.customer_name} ({editRefund.orders?.customer_phone})</p>
                <p><strong>Amount:</strong> {formatPrice(editRefund.amount)}</p>
                <p><strong>Reason:</strong> {editRefund.reason || "N/A"}</p>
                <p><strong>Refund Method:</strong> {editRefund.refund_method === "bank" ? "Bank Transfer" : editRefund.refund_method === "nagad" ? "Nagad" : "bKash"}</p>
                <p><strong>Account Name:</strong> {editRefund.refund_account_name || "N/A"}</p>
                <p><strong>Account Number:</strong> {editRefund.refund_account_number || "N/A"}</p>
                {editRefund.refund_method === "bank" && <p><strong>Bank Name:</strong> {editRefund.refund_bank_name || "N/A"}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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
            <Button variant="outline" onClick={() => setEditRefund(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRefunds;
