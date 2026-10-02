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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Printer, Lock, Unlock, FileText } from "lucide-react";
import { format } from "date-fns";

interface Props {
  vendorId?: string | null;
  scope: "admin" | "vendor";
}

type Session = {
  id: string;
  vendor_id: string | null;
  opened_by: string;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_difference: number | null;
  total_sales: number;
  total_refunds: number;
  total_transactions: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
};

export default function PosRegisterSessions({ vendorId, scope }: Props) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState<Session | null>(null);
  const [zReport, setZReport] = useState<Session | null>(null);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("pos_register_sessions")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(100);
    if (vendorId) q = q.eq("vendor_id", vendorId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setSessions((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [vendorId]);

  const openRegister = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("pos_register_sessions").insert({
      opened_by: user.id,
      vendor_id: vendorId ?? null,
      opening_cash: Number(openingCash) || 0,
      status: "open",
      notes: notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Register opened");
    setOpenDialog(false);
    setOpeningCash("0");
    setNotes("");
    load();
  };

  const closeRegister = async () => {
    if (!closeDialog) return;
    const cc = Number(closingCash);
    if (Number.isNaN(cc)) return toast.error("Enter closing cash");
    const expected = Number(closeDialog.opening_cash) + Number(closeDialog.total_sales) - Number(closeDialog.total_refunds);
    setSubmitting(true);
    const { data, error } = await supabase
      .from("pos_register_sessions")
      .update({
        closing_cash: cc,
        expected_cash: expected,
        cash_difference: cc - expected,
        status: "closed",
        closed_at: new Date().toISOString(),
        notes: notes || closeDialog.notes,
      })
      .eq("id", closeDialog.id)
      .select()
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Register closed");
    setCloseDialog(null);
    setClosingCash("");
    setNotes("");
    setZReport(data as any);
    load();
  };

  const printZReport = (s: Session) => {
    const expected = Number(s.opening_cash) + Number(s.total_sales) - Number(s.total_refunds);
    const w = window.open("", "_blank", "width=400,height=700");
    if (!w) return;
    w.document.write(`
      <html><head><title>Z-Report ${s.id.slice(0, 8)}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 8px; max-width: 280px; }
        h2 { text-align: center; margin: 4px 0; font-size: 14px; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .b { font-weight: bold; }
      </style></head><body>
      <h2>DAY-END Z-REPORT</h2>
      <div class="row"><span>Session</span><span>${s.id.slice(0, 8)}</span></div>
      <div class="row"><span>Opened</span><span>${format(new Date(s.opened_at), "dd MMM HH:mm")}</span></div>
      <div class="row"><span>Closed</span><span>${s.closed_at ? format(new Date(s.closed_at), "dd MMM HH:mm") : "-"}</span></div>
      <hr/>
      <div class="row"><span>Opening Cash</span><span>${Number(s.opening_cash).toFixed(2)}</span></div>
      <div class="row"><span>Total Sales</span><span>+${Number(s.total_sales).toFixed(2)}</span></div>
      <div class="row"><span>Total Refunds</span><span>-${Number(s.total_refunds).toFixed(2)}</span></div>
      <div class="row"><span>Transactions</span><span>${s.total_transactions}</span></div>
      <hr/>
      <div class="row b"><span>Expected Cash</span><span>${expected.toFixed(2)}</span></div>
      <div class="row b"><span>Counted Cash</span><span>${Number(s.closing_cash ?? 0).toFixed(2)}</span></div>
      <div class="row b"><span>Difference</span><span>${Number(s.cash_difference ?? 0).toFixed(2)}</span></div>
      <hr/>
      ${s.notes ? `<div>Notes: ${s.notes}</div>` : ""}
      <p style="text-align:center;margin-top:12px;">--- End of Report ---</p>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 200);
  };

  const openSession = sessions.find((s) => s.status === "open");

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Register Sessions</h1>
          <p className="text-sm text-muted-foreground">Open / close cash register and view Z-reports</p>
        </div>
        <Button onClick={() => setOpenDialog(true)} disabled={!!openSession}>
          <Unlock className="w-4 h-4 mr-2" />
          {openSession ? "Register is Open" : "Open Register"}
        </Button>
      </div>

      {openSession && (
        <Card className="p-4 border-primary border-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <Badge>OPEN</Badge>
              <p className="font-semibold mt-2">Session {openSession.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                Opened: {format(new Date(openSession.opened_at), "dd MMM yyyy, HH:mm")}
              </p>
            </div>
            <div className="text-right text-sm">
              <p>Opening: ৳{Number(openSession.opening_cash).toFixed(2)}</p>
              <p>Sales: ৳{Number(openSession.total_sales).toFixed(2)}</p>
              <p>Refunds: ৳{Number(openSession.total_refunds).toFixed(2)}</p>
              <p>Txns: {openSession.total_transactions}</p>
            </div>
            <Button variant="destructive" onClick={() => setCloseDialog(openSession)}>
              <Lock className="w-4 h-4 mr-2" /> Close & Z-Report
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Refunds</TableHead>
              <TableHead className="text-right">Txns</TableHead>
              <TableHead className="text-right">Diff</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6">Loading…</TableCell></TableRow>
            ) : sessions.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No sessions yet</TableCell></TableRow>
            ) : sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status}</Badge>
                </TableCell>
                <TableCell className="text-xs">{format(new Date(s.opened_at), "dd MMM HH:mm")}</TableCell>
                <TableCell className="text-xs">{s.closed_at ? format(new Date(s.closed_at), "dd MMM HH:mm") : "-"}</TableCell>
                <TableCell className="text-right">৳{Number(s.total_sales).toFixed(2)}</TableCell>
                <TableCell className="text-right">৳{Number(s.total_refunds).toFixed(2)}</TableCell>
                <TableCell className="text-right">{s.total_transactions}</TableCell>
                <TableCell className={`text-right ${Number(s.cash_difference ?? 0) < 0 ? "text-destructive" : ""}`}>
                  {s.cash_difference == null ? "-" : `৳${Number(s.cash_difference).toFixed(2)}`}
                </TableCell>
                <TableCell>
                  {s.status === "closed" && (
                    <Button size="sm" variant="ghost" onClick={() => printZReport(s)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Open dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open Register</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Opening Cash (৳)</Label>
              <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={openRegister} disabled={submitting}>Open Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close dialog */}
      <Dialog open={!!closeDialog} onOpenChange={(o) => !o && setCloseDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close Register & Generate Z-Report</DialogTitle></DialogHeader>
          {closeDialog && (
            <div className="space-y-3">
              <div className="bg-muted rounded p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Opening Cash</span><span>৳{Number(closeDialog.opening_cash).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>+ Sales</span><span>৳{Number(closeDialog.total_sales).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>- Refunds</span><span>৳{Number(closeDialog.total_refunds).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1">
                  <span>Expected Cash</span>
                  <span>৳{(Number(closeDialog.opening_cash) + Number(closeDialog.total_sales) - Number(closeDialog.total_refunds)).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <Label>Counted Cash in Drawer (৳)</Label>
                <Input type="number" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} autoFocus />
              </div>
              <div>
                <Label>Closing Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>Cancel</Button>
            <Button onClick={closeRegister} disabled={submitting}>
              <Lock className="w-4 h-4 mr-2" /> Close Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Z-Report dialog after close */}
      <Dialog open={!!zReport} onOpenChange={(o) => !o && setZReport(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle><FileText className="w-4 h-4 inline mr-2" />Z-Report Generated</DialogTitle></DialogHeader>
          {zReport && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Opening Cash</span><span>৳{Number(zReport.opening_cash).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Total Sales</span><span>৳{Number(zReport.total_sales).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Total Refunds</span><span>৳{Number(zReport.total_refunds).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Transactions</span><span>{zReport.total_transactions}</span></div>
              <div className="flex justify-between font-bold"><span>Expected</span><span>৳{Number(zReport.expected_cash ?? 0).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold"><span>Counted</span><span>৳{Number(zReport.closing_cash ?? 0).toFixed(2)}</span></div>
              <div className={`flex justify-between font-bold ${Number(zReport.cash_difference) < 0 ? "text-destructive" : "text-green-600"}`}>
                <span>Difference</span><span>৳{Number(zReport.cash_difference ?? 0).toFixed(2)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setZReport(null)}>Close</Button>
            <Button onClick={() => zReport && printZReport(zReport)}>
              <Printer className="w-4 h-4 mr-2" /> Print Z-Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
