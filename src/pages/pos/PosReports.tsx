import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, ShoppingBag, Package, DollarSign } from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

interface Props {
  vendorId?: string | null;
  scope: "admin" | "vendor";
}

export default function PosReports({ vendorId, scope }: Props) {
  const today = new Date();
  const [from, setFrom] = useState(format(subDays(today, 7), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(today, "yyyy-MM-dd"));
  const [orders, setOrders] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const fromD = startOfDay(new Date(from)).toISOString();
    const toD = endOfDay(new Date(to)).toISOString();

    let oQ = supabase
      .from("orders")
      .select("id, order_number, total, payment_method, status, customer_name, created_at, vendor_id, is_pos_sale, staff_id")
      .gte("created_at", fromD).lte("created_at", toD)
      .order("created_at", { ascending: false });
    if (vendorId) oQ = oQ.eq("vendor_id", vendorId);
    const { data: oData } = await oQ;
    setOrders(oData ?? []);

    let rQ = supabase
      .from("sales_returns")
      .select("*")
      .gte("created_at", fromD).lte("created_at", toD);
    if (vendorId) rQ = rQ.eq("vendor_id", vendorId);
    const { data: rData } = await rQ;
    setReturns(rData ?? []);

    if (oData && oData.length) {
      const ids = oData.map((o) => o.id);
      const { data: iData } = await supabase
        .from("order_items")
        .select("product_id, product_name, quantity, price, order_id")
        .in("order_id", ids);
      setItems(iData ?? []);
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [vendorId]);

  // Aggregations
  const totals = useMemo(() => {
    const sales = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    const refunds = returns.reduce((s, r) => s + Number(r.total_refund || 0), 0);
    const posSales = orders.filter((o) => o.is_pos_sale).reduce((s, o) => s + Number(o.total || 0), 0);
    return {
      sales, refunds, net: sales - refunds, txns: orders.length, posSales, refundCount: returns.length,
    };
  }, [orders, returns]);

  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; sales: number; refunds: number; txns: number }>();
    orders.forEach((o) => {
      const d = format(new Date(o.created_at), "MMM dd");
      const cur = map.get(d) || { date: d, sales: 0, refunds: 0, txns: 0 };
      cur.sales += Number(o.total || 0);
      cur.txns += 1;
      map.set(d, cur);
    });
    returns.forEach((r) => {
      const d = format(new Date(r.created_at), "MMM dd");
      const cur = map.get(d) || { date: d, sales: 0, refunds: 0, txns: 0 };
      cur.refunds += Number(r.total_refund || 0);
      map.set(d, cur);
    });
    return Array.from(map.values());
  }, [orders, returns]);

  const hourlyData = useMemo(() => {
    const buckets = new Array(24).fill(0).map((_, h) => ({ hour: `${h}:00`, sales: 0, txns: 0 }));
    orders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      buckets[h].sales += Number(o.total || 0);
      buckets[h].txns += 1;
    });
    return buckets;
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    items.forEach((i) => {
      const key = i.product_name || i.product_id || "Unknown";
      const cur = map.get(key) || { name: key, qty: 0, revenue: 0 };
      cur.qty += Number(i.quantity || 0);
      cur.revenue += Number(i.quantity || 0) * Number(i.price || 0);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [items]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const m = o.payment_method || "unknown";
      map.set(m, (map.get(m) || 0) + Number(o.total || 0));
    });
    return Array.from(map.entries()).map(([method, total]) => ({ method, total }));
  }, [orders]);

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <div>
        <h1 className="text-xl font-bold">POS Reports</h1>
        <p className="text-sm text-muted-foreground">Sales analytics, top products, hourly trends</p>
      </div>

      <Card className="p-3 flex flex-wrap items-end gap-2">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={load} disabled={loading}>{loading ? "Loading…" : "Apply"}</Button>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />Gross Sales</div>
          <div className="text-2xl font-bold">৳{totals.sales.toFixed(0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />Net (after refunds)</div>
          <div className="text-2xl font-bold text-green-600">৳{totals.net.toFixed(0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><ShoppingBag className="w-3 h-3" />Transactions</div>
          <div className="text-2xl font-bold">{totals.txns}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" />Refunds</div>
          <div className="text-2xl font-bold text-destructive">৳{totals.refunds.toFixed(0)} <span className="text-xs">({totals.refundCount})</span></div>
        </Card>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="hourly">Hourly</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" name="Sales" />
                <Line type="monotone" dataKey="refunds" stroke="hsl(var(--destructive))" name="Refunds" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="hourly">
          <Card className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No data</TableCell></TableRow>
                ) : topProducts.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right font-semibold">৳{p.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Method</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {paymentBreakdown.map((p) => (
                  <TableRow key={p.method}>
                    <TableCell><Badge variant="outline">{p.method}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">৳{p.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
