import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  vendorId?: string | null;
  scope: "admin" | "vendor";
}

type Commission = {
  id: string;
  staff_id: string;
  order_id: string | null;
  return_id: string | null;
  vendor_id: string | null;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

export default function StaffCommissions({ vendorId, scope }: Props) {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    staff_id: "", order_id: "", sale_amount: "", commission_rate: "5", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("staff_commissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (vendorId) q = q.eq("vendor_id", vendorId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setCommissions((data as any) ?? []);

    const { data: s } = await supabase.from("profiles").select("user_id, username, email").limit(200);
    setStaff(s ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [vendorId]);

  const totalPending = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalPaid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.commission_amount), 0);

  const submitCommission = async () => {
    if (!form.staff_id || !form.sale_amount) return toast.error("Fill required fields");
    const sale = Number(form.sale_amount);
    const rate = Number(form.commission_rate);
    const amount = (sale * rate) / 100;
    setSubmitting(true);
    const { error } = await supabase.from("staff_commissions").insert({
      staff_id: form.staff_id,
      order_id: form.order_id || null,
      vendor_id: vendorId ?? null,
      sale_amount: sale,
      commission_rate: rate,
      commission_amount: amount,
      status: "pending",
      notes: form.notes,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Commission recorded");
    setCreateOpen(false);
    setForm({ staff_id: "", order_id: "", sale_amount: "", commission_rate: "5", notes: "" });
    load();
  };

  const markPaid = async (c: Commission) => {
    if (!user) return;
    if (!confirm(`Mark commission of ৳${Number(c.commission_amount).toFixed(2)} as paid?`)) return;
    const { error } = await supabase.from("staff_commissions").update({
      status: "paid", paid_at: new Date().toISOString(), paid_by: user.id,
    }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Marked as paid");
    load();
  };

  const staffName = (id: string) => {
    const s = staff.find((x) => x.user_id === id);
    return s?.username || s?.email || id.slice(0, 8);
  };

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Staff Commissions</h1>
          <p className="text-sm text-muted-foreground">Track and pay sales commissions</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Record Commission
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold text-orange-600">৳{totalPending.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Paid</div>
          <div className="text-2xl font-bold text-green-600">৳{totalPaid.toFixed(2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Records</div>
          <div className="text-2xl font-bold">{commissions.length}</div>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead className="text-right">Sale</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6">Loading…</TableCell></TableRow>
            ) : commissions.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No commissions</TableCell></TableRow>
            ) : commissions.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{staffName(c.staff_id)}</TableCell>
                <TableCell className="text-right">৳{Number(c.sale_amount).toFixed(2)}</TableCell>
                <TableCell className="text-right">{Number(c.commission_rate).toFixed(1)}%</TableCell>
                <TableCell className="text-right font-semibold">৳{Number(c.commission_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "paid" ? "default" : "secondary"}>{c.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">{format(new Date(c.created_at), "dd MMM HH:mm")}</TableCell>
                <TableCell>
                  {c.status === "pending" && (
                    <Button size="sm" variant="ghost" onClick={() => markPaid(c)}>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Commission</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Staff</Label>
              <Select value={form.staff_id} onValueChange={(v) => setForm({ ...form, staff_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {staff.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.username || s.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Order ID (optional)</Label>
              <Input value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Sale Amount (৳)</Label>
                <Input type="number" value={form.sale_amount} onChange={(e) => setForm({ ...form, sale_amount: e.target.value })} />
              </div>
              <div>
                <Label>Commission Rate (%)</Label>
                <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
              </div>
            </div>
            {form.sale_amount && form.commission_rate && (
              <div className="bg-muted p-2 rounded text-center text-sm">
                Commission: <span className="font-bold">৳{((Number(form.sale_amount) * Number(form.commission_rate)) / 100).toFixed(2)}</span>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCommission} disabled={submitting}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
