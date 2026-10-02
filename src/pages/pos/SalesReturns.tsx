import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Search, RotateCcw, Plus } from "lucide-react";
import { format } from "date-fns";

interface Props {
  vendorId?: string | null;
  scope: "admin" | "vendor";
}

type ReturnRow = {
  id: string;
  return_number: string;
  original_order_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_refund: number;
  refund_method: string;
  status: string;
  created_at: string;
  notes: string | null;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number;
  price: number;
  variant_info: any;
  refund_qty?: number;
  restock?: boolean;
};

export default function SalesReturns({ vendorId, scope }: Props) {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [foundOrder, setFoundOrder] = useState<any | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [refundMethod, setRefundMethod] = useState<"cash" | "credit" | "bkash" | "nagad">("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("sales_returns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (vendorId) q = q.eq("vendor_id", vendorId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setReturns((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [vendorId]);

  const lookupOrder = async () => {
    if (!orderSearch.trim()) return;
    const term = orderSearch.trim();
    let q = supabase
      .from("orders")
      .select("*, order_items(*)")
      .limit(1);
    if (/^\d+$/.test(term)) {
      q = q.eq("order_number", parseInt(term));
    } else {
      q = q.eq("id", term);
    }
    if (vendorId) q = q.eq("vendor_id", vendorId);
    const { data, error } = await q.maybeSingle();
    if (error || !data) { toast.error("Order not found"); setFoundOrder(null); return; }
    setFoundOrder(data);
    setItems((data.order_items || []).map((i: any) => ({
      ...i, refund_qty: 0, restock: true,
    })));
  };

  const totalRefund = items.reduce((s, i) => s + (i.refund_qty || 0) * Number(i.price), 0);

  const submitReturn = async () => {
    if (!foundOrder || !user) return;
    const refundItems = items.filter((i) => (i.refund_qty || 0) > 0);
    if (refundItems.length === 0) return toast.error("Select at least one item to return");
    setSubmitting(true);

    const returnNumber = `RTN-${Date.now().toString().slice(-8)}`;

    // get active register session
    let sessionId: string | null = null;
    let sessionQ = supabase.from("pos_register_sessions").select("id, total_refunds")
      .eq("status", "open").eq("opened_by", user.id).limit(1);
    if (vendorId) sessionQ = sessionQ.eq("vendor_id", vendorId);
    const { data: sess } = await sessionQ;
    const session = sess?.[0];
    sessionId = session?.id ?? null;

    const { data: ret, error: retErr } = await supabase
      .from("sales_returns")
      .insert({
        return_number: returnNumber,
        original_order_id: foundOrder.id,
        vendor_id: vendorId ?? foundOrder.vendor_id ?? null,
        register_session_id: sessionId,
        customer_name: foundOrder.customer_name,
        customer_phone: foundOrder.customer_phone,
        customer_user_id: foundOrder.user_id,
        total_refund: totalRefund,
        refund_method: refundMethod,
        status: "completed",
        processed_by: user.id,
        notes,
      })
      .select()
      .single();

    if (retErr || !ret) { setSubmitting(false); return toast.error(retErr?.message || "Failed"); }

    // insert items
    const rowsItems = refundItems.map((i) => ({
      return_id: ret.id,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.refund_qty,
      price: i.price,
      refund_amount: (i.refund_qty || 0) * Number(i.price),
      restock: i.restock ?? true,
      variant_info: i.variant_info,
    }));
    await supabase.from("sales_return_items").insert(rowsItems);

    // restock products
    for (const i of refundItems) {
      if (i.restock && i.product_id) {
        const { data: prod } = await supabase.from("products").select("stock").eq("id", i.product_id).maybeSingle();
        if (prod && prod.stock != null) {
          await supabase.from("products").update({ stock: Number(prod.stock) + Number(i.refund_qty || 0) }).eq("id", i.product_id);
        }
      }
    }

    // bump session refunds
    if (session) {
      await supabase.from("pos_register_sessions").update({
        total_refunds: Number(session.total_refunds || 0) + totalRefund,
      }).eq("id", session.id);
    }

    // if credit refund — give customer credit
    if (refundMethod === "credit" && foundOrder.user_id) {
      await supabase.from("customer_credits").insert({
        user_id: foundOrder.user_id,
        amount: totalRefund,
        type: "credit",
        description: `Refund for order #${foundOrder.order_number}`,
        reference_id: ret.id,
      });
    }

    setSubmitting(false);
    toast.success(`Return ${returnNumber} processed`);
    setCreateOpen(false);
    setFoundOrder(null);
    setItems([]);
    setOrderSearch("");
    setNotes("");
    load();
  };

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Sales Returns</h1>
          <p className="text-sm text-muted-foreground">Process refunds and exchanges</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Return
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Return #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6">Loading…</TableCell></TableRow>
            ) : returns.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No returns yet</TableCell></TableRow>
            ) : returns.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.return_number}</TableCell>
                <TableCell>{r.customer_name || "-"}<div className="text-xs text-muted-foreground">{r.customer_phone}</div></TableCell>
                <TableCell><Badge variant="outline">{r.refund_method}</Badge></TableCell>
                <TableCell className="text-right">৳{Number(r.total_refund).toFixed(2)}</TableCell>
                <TableCell><Badge>{r.status}</Badge></TableCell>
                <TableCell className="text-xs">{format(new Date(r.created_at), "dd MMM HH:mm")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>New Sales Return</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Order number (e.g. 1234) or order ID"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupOrder()}
              />
              <Button onClick={lookupOrder} variant="secondary">
                <Search className="w-4 h-4 mr-2" /> Find
              </Button>
            </div>

            {foundOrder && (
              <Card className="p-3 space-y-3">
                <div className="text-sm">
                  <div className="font-semibold">Order #{foundOrder.order_number}</div>
                  <div className="text-muted-foreground">
                    {foundOrder.customer_name} · {foundOrder.customer_phone} · ৳{Number(foundOrder.total).toFixed(2)}
                  </div>
                </div>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={it.id} className="grid grid-cols-12 gap-2 items-center text-sm border-b pb-2">
                      <div className="col-span-5">
                        <div className="font-medium">{it.product_name}</div>
                        <div className="text-xs text-muted-foreground">৳{it.price} × {it.quantity}</div>
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Refund Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          max={it.quantity}
                          value={it.refund_qty || 0}
                          onChange={(e) => {
                            const v = Math.min(it.quantity, Math.max(0, Number(e.target.value) || 0));
                            const next = [...items]; next[idx] = { ...it, refund_qty: v }; setItems(next);
                          }}
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-2 mt-4">
                        <Checkbox
                          checked={it.restock ?? true}
                          onCheckedChange={(c) => {
                            const next = [...items]; next[idx] = { ...it, restock: !!c }; setItems(next);
                          }}
                        />
                        <span className="text-xs">Restock</span>
                      </div>
                      <div className="col-span-2 text-right text-sm font-semibold">
                        ৳{((it.refund_qty || 0) * Number(it.price)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Refund Method</Label>
                    <Select value={refundMethod} onValueChange={(v: any) => setRefundMethod(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit">Store Credit</SelectItem>
                        <SelectItem value="bkash">bKash</SelectItem>
                        <SelectItem value="nagad">Nagad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end justify-end">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Total Refund</div>
                      <div className="text-2xl font-bold">৳{totalRefund.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for return" />
                </div>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitReturn} disabled={!foundOrder || submitting || totalRefund <= 0}>
              <RotateCcw className="w-4 h-4 mr-2" /> Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
