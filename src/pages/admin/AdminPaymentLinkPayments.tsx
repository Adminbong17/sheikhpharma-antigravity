import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Printer } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  payer_name: string | null;
  payer_phone: string | null;
  payment_id: string | null;
  trx_id: string | null;
  status: string;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  custom_data: Record<string, string> | null;
  payment_links: { title: string; token: string } | null;
};

const statusBadge = (status: string) => {
  if (status === "success") return <Badge className="bg-primary">সফল</Badge>;
  if (status === "failed") return <Badge variant="destructive">ব্যর্থ</Badge>;
  return <Badge variant="secondary">পেন্ডিং</Badge>;
};

const printReceipt = (r: Payment) => {
  const rows = [
    ["Receipt No", r.id.slice(0, 8).toUpperCase()],
    ["Date", new Date(r.paid_at || r.created_at).toLocaleString("en-GB")],
    ["Payment Link", r.payment_links?.title || "—"],
    ["Payer Name", r.payer_name || "—"],
    ["Payer Phone", r.payer_phone || "—"],
    ["Amount", `Tk ${Number(r.amount).toLocaleString()}`],
    ["Method", "bKash"],
    ["Transaction ID", r.trx_id || "—"],
    ["Payment ID", r.payment_id || "—"],
    ["Status", r.status.toUpperCase()],
    ...Object.entries(r.custom_data || {}).map(([k, v]) => [k, String(v || "—")] as [string, string]),
  ];
  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>Payment Receipt ${r.id.slice(0, 8)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,Arial,sans-serif;margin:0;padding:24px;color:#111}
    .wrap{max-width:640px;margin:0 auto;border:1px solid #ddd;border-radius:12px;padding:24px}
    h1{font-size:20px;margin:0 0 4px}
    .sub{font-size:12px;color:#666;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:14px}
    td{padding:8px 4px;border-bottom:1px solid #eee}
    td:first-child{color:#666;width:45%}
    td:last-child{font-weight:600;text-align:right}
    .total{font-size:18px}
    .foot{margin-top:20px;font-size:11px;color:#888;text-align:center}
    @media print{body{padding:0}.wrap{border:none}}
  </style></head><body>
  <div class="wrap">
    <h1>Payment Receipt</h1>
    <div class="sub">Payment Link Transaction</div>
    <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td class="${k === "Amount" ? "total" : ""}">${v}</td></tr>`).join("")}</table>
    <div class="foot">Printed on ${new Date().toLocaleString("en-GB")}</div>
  </div>
  <script>window.onload=function(){window.print()}</script>
  </body></html>`;
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
};

const AdminPaymentLinkPayments = () => {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from("payment_link_payments" as any) as any)
      .select("*, payment_links(title, token)")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as Payment[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [r.payer_name, r.payer_phone, r.trx_id, r.payment_links?.title, r.status]
      .some((v) => (v || "").toLowerCase().includes(q));
  });

  const totalSuccess = rows.filter((r) => r.status === "success").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Link Payments</h1>
          <p className="text-sm text-muted-foreground">পেমেন্ট লিংক থেকে আসা পেমেন্টের স্ট্যাটাস</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> রিফ্রেশ</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">মোট সফল পেমেন্ট</p>
          <p className="text-2xl font-bold">৳{totalSuccess.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">সফল সংখ্যা</p>
          <p className="text-2xl font-bold">{rows.filter((r) => r.status === "success").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">ব্যর্থ / পেন্ডিং</p>
          <p className="text-2xl font-bold">{rows.filter((r) => r.status !== "success").length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">পেমেন্ট তালিকা ({filtered.length})</CardTitle>
          <Input className="max-w-xs" placeholder="সার্চ..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">কোনো পেমেন্ট নেই</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>লিংক</TableHead>
                  <TableHead>পেয়ার</TableHead>
                  <TableHead>অ্যামাউন্ট</TableHead>
                  <TableHead>TrxID</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead className="text-right">প্রিন্ট</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(r.paid_at || r.created_at).toLocaleString("en-GB")}
                    </TableCell>
                    <TableCell className="text-sm">{r.payment_links?.title || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {r.payer_name || "—"}
                      {r.payer_phone && <span className="block text-xs text-muted-foreground">{r.payer_phone}</span>}
                      {r.custom_data && Object.entries(r.custom_data).map(([k, v]) => (
                        <span key={k} className="block text-xs text-muted-foreground">{k}: {String(v)}</span>
                      ))}
                    </TableCell>
                    <TableCell className="font-semibold">৳{Number(r.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{r.trx_id || "—"}</TableCell>
                    <TableCell>
                      {statusBadge(r.status)}
                      {r.status === "failed" && r.failure_reason && (
                        <span className="block text-xs text-muted-foreground">{r.failure_reason}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => printReceipt(r)} title="রিসিট প্রিন্ট">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentLinkPayments;
