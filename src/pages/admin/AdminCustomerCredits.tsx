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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PrintExportButtons from "@/components/PrintExportButtons";
import { toast } from "sonner";
import { CreditCard, Send, Pencil, Trash2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const AdminCustomerCredits = () => {
  const { formatPrice } = useCurrency();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPayout, setEditPayout] = useState<any | null>(null);
  const [form, setForm] = useState({ status: "pending", admin_trx_id: "", admin_method: "", admin_note: "" });
  const [saving, setSaving] = useState(false);
  const [editCredit, setEditCredit] = useState<any | null>(null);
  const [creditForm, setCreditForm] = useState({ amount: "", type: "credit", description: "" });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "payout" | "credit"; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    const [payoutsRes, creditsRes, profilesRes] = await Promise.all([
      (supabase as any).from("customer_credit_payouts").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("customer_credits").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("user_id, username, email, phone"),
    ]);
    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });
    setPayouts((payoutsRes.data || []).map((p: any) => ({ ...p, profile: profileMap[p.user_id] })));
    setCredits((creditsRes.data || []).map((c: any) => ({ ...c, profile: profileMap[c.user_id] })));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

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
    if (form.status === "done" && editPayout.status !== "done") {
      updates.completed_at = new Date().toISOString();
      // Debit the credit balance
      await (supabase as any).from("customer_credits").insert({
        user_id: editPayout.user_id,
        amount: editPayout.amount,
        type: "debit",
        reference_id: editPayout.id,
        description: `Payout via ${form.admin_method || editPayout.method}`,
      });
    }

    await (supabase as any).from("customer_credit_payouts").update(updates).eq("id", editPayout.id);

    // Notify customer
    const statusMsg: Record<string, string> = {
      processing: "আপনার ক্রেডিট পেআউট প্রসেস হচ্ছে।",
      done: "আপনার ক্রেডিট পেআউট সম্পন্ন হয়েছে! 💰",
    };
    if (statusMsg[form.status]) {
      await (supabase.from("notifications" as any) as any).insert({
        user_id: editPayout.user_id,
        target_role: "user",
        title: "ক্রেডিট পেআউট আপডেট",
        body: statusMsg[form.status],
        type: "payout",
        action_url: "/dashboard/credits",
      });
    }

    toast.success("Payout updated");
    setSaving(false);
    setEditPayout(null);
    fetchAll();
  };

  const openEditCredit = (c: any) => {
    setEditCredit(c);
    setCreditForm({ amount: String(c.amount), type: c.type, description: c.description || "" });
  };

  const handleSaveCredit = async () => {
    setSaving(true);
    await (supabase as any).from("customer_credits").update({
      amount: Number(creditForm.amount),
      type: creditForm.type,
      description: creditForm.description || null,
    }).eq("id", editCredit.id);
    toast.success("Credit entry updated");
    setSaving(false);
    setEditCredit(null);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const table = deleteTarget.type === "payout" ? "customer_credit_payouts" : "customer_credits";
    await (supabase as any).from(table).delete().eq("id", deleteTarget.id);
    toast.success(`${deleteTarget.type === "payout" ? "Payout" : "Credit entry"} deleted`);
    setDeleting(false);
    setDeleteTarget(null);
    fetchAll();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { pending: "bg-yellow-500/10 text-yellow-600", processing: "bg-blue-500/10 text-blue-600", done: "bg-green-500/10 text-green-600" };
    return <Badge className={map[s] || ""}>{s}</Badge>;
  };

  const payoutColumns: import("@/lib/printExport").PrintColumn[] = [
    { header: "Date", accessor: (r) => new Date(r.created_at).toLocaleDateString() },
    { header: "Customer", accessor: (r) => r.profile?.username || r.profile?.email || "-" },
    { header: "Amount", accessor: (r) => formatPrice(r.amount) },
    { header: "Method", accessor: (r) => `${r.method} — ${r.account_number}` },
    { header: "Status", accessor: (r) => r.status },
    { header: "Trx ID", accessor: (r) => r.admin_trx_id || "-" },
  ];

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <h1 className="text-xl sm:text-2xl font-bold">Customer Credits & Payouts</h1>

      <Tabs defaultValue="payouts">
        <TabsList>
          <TabsTrigger value="payouts"><Send className="h-4 w-4 mr-1.5" />Payouts</TabsTrigger>
          <TabsTrigger value="history"><CreditCard className="h-4 w-4 mr-1.5" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="payouts" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <PrintExportButtons title="Customer Credit Payouts" columns={payoutColumns} data={payouts} />
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {payouts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground"><Send className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No payout requests yet.</p></div>
            ) : payouts.map((p) => (
              <div key={p.id} className="rounded-lg border bg-card p-3 space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0" onClick={() => openEdit(p)}>
                    <p className="font-medium text-sm">{p.profile?.username || p.profile?.email || "-"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.method} — {p.account_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatPrice(p.amount)}</p>
                    {statusBadge(p.status)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    {p.admin_trx_id && <span className="mr-1">TRX: {p.admin_trx_id}</span>}
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget({ type: "payout", id: p.id })}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              {payouts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground"><Send className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No payout requests yet.</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trx ID</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{p.profile?.username || p.profile?.email || "-"}</TableCell>
                        <TableCell className="font-medium">{formatPrice(p.amount)}</TableCell>
                        <TableCell className="text-sm capitalize">{p.method}</TableCell>
                        <TableCell className="text-sm">{p.account_number}</TableCell>
                        <TableCell>{statusBadge(p.status)}</TableCell>
                        <TableCell className="text-sm">{p.admin_trx_id || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Update</Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: "payout", id: p.id })}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {credits.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground"><CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No credit transactions yet.</p></div>
            ) : credits.map((c) => (
              <div key={c.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm">{c.profile?.username || c.profile?.email || "-"}</p>
                    <p className="text-xs text-muted-foreground">{c.description || "-"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={c.type === "credit" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}>{c.type}</Badge>
                    <p className="font-medium text-sm mt-0.5">{c.type === "debit" ? "-" : "+"}{formatPrice(c.amount)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditCredit(c)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget({ type: "credit", id: c.id })}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              {credits.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground"><CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No credit transactions yet.</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credits.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{c.profile?.username || c.profile?.email || "-"}</TableCell>
                        <TableCell><Badge className={c.type === "credit" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}>{c.type}</Badge></TableCell>
                        <TableCell className="font-medium">{c.type === "debit" ? "-" : "+"}{formatPrice(c.amount)}</TableCell>
                        <TableCell className="text-sm">{c.description || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditCredit(c)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: "credit", id: c.id })}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editPayout} onOpenChange={(o) => !o && setEditPayout(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Credit Payout</DialogTitle></DialogHeader>
          {editPayout && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p><strong>Customer:</strong> {editPayout.profile?.username || editPayout.profile?.email}</p>
                <p><strong>Amount:</strong> {formatPrice(editPayout.amount)}</p>
                <p><strong>Method:</strong> {editPayout.method} — {editPayout.account_number}</p>
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
                <Input value={form.admin_method} onChange={(e) => setForm(prev => ({ ...prev, admin_method: e.target.value }))} placeholder="bKash / Nagad" />
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

      {/* Edit Credit Dialog */}
      <Dialog open={!!editCredit} onOpenChange={(o) => !o && setEditCredit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Credit Entry</DialogTitle></DialogHeader>
          {editCredit && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p><strong>Customer:</strong> {editCredit.profile?.username || editCredit.profile?.email || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={creditForm.type} onValueChange={(v) => setCreditForm(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Amount</label>
                <Input type="number" value={creditForm.amount} onChange={(e) => setCreditForm(prev => ({ ...prev, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input value={creditForm.description} onChange={(e) => setCreditForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Refund, Payout, etc." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCredit(null)}>Cancel</Button>
            <Button onClick={handleSaveCredit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete this {deleteTarget?.type === "payout" ? "payout request" : "credit entry"}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCustomerCredits;
