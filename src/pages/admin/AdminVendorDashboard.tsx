import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, ShoppingCart, DollarSign, Image as ImageIcon, Printer } from "lucide-react";
import BackButton from "@/components/BackButton";

const printVendorDetails = (vendor: any, products: any[], orders: any[], totalRevenue: number) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const productRows = products.map(p => `<tr>
    <td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;">${p.name}</td>
    <td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;text-align:right;">$${p.price}</td>
    <td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;text-align:right;">${p.stock}</td>
    <td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;text-align:right;">${p.sold_count || 0}</td>
    <td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;">${p.is_active ? "Active" : "Inactive"}</td>
  </tr>`).join("");

  const orderRows = orders.map(o => `<tr>
    <td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;font-family:monospace;">${o.id.slice(0, 8)}...</td>
    <td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;">${o.status}</td>
    <td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;text-align:right;">$${o.total}</td>
    <td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;">${new Date(o.created_at).toLocaleDateString()}</td>
  </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><title>${vendor.store_name} - Vendor Details</title>
<style>
  body{font-family:Arial,sans-serif;padding:20px;color:#333}
  h1{font-size:22px;margin-bottom:2px}
  h2{font-size:16px;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .meta{font-size:12px;color:#666;margin-bottom:16px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:16px;font-size:13px}
  .info-grid dt{font-weight:600;color:#555}.info-grid dd{margin:0}
  .stats{display:flex;gap:20px;margin-bottom:16px}
  .stat{background:#f5f5f5;padding:12px 16px;border-radius:6px;text-align:center;flex:1}
  .stat .val{font-size:20px;font-weight:700}.stat .lbl{font-size:11px;color:#888}
  table{border-collapse:collapse;width:100%}
  th{border:1px solid #333;padding:6px 10px;background:#f5f5f5;text-align:left;font-size:12px;font-weight:600}
  tr:nth-child(even){background:#fafafa}
  @media print{body{padding:0}}
</style></head><body>
<h1>${vendor.store_name}</h1>
<p class="meta">Status: ${vendor.status} | Printed: ${new Date().toLocaleString()}</p>

<h2>Store Information</h2>
<dl class="info-grid">
  <dt>Phone</dt><dd>${vendor.phone || "—"}</dd>
  <dt>Address</dt><dd>${vendor.address || "—"}</dd>
  <dt>Commission Rate</dt><dd>${vendor.commission_rate ?? 0}%</dd>
  <dt>Description</dt><dd>${vendor.store_description || "—"}</dd>
  <dt>Joined</dt><dd>${new Date(vendor.created_at).toLocaleDateString()}</dd>
</dl>

<h2>Summary</h2>
<div class="stats">
  <div class="stat"><div class="val">${products.length}</div><div class="lbl">Products</div></div>
  <div class="stat"><div class="val">${orders.length}</div><div class="lbl">Orders</div></div>
  <div class="stat"><div class="val">$${totalRevenue.toLocaleString()}</div><div class="lbl">Revenue</div></div>
</div>

<h2>Products (${products.length})</h2>
<table><thead><tr><th>Name</th><th style="text-align:right">Price</th><th style="text-align:right">Stock</th><th style="text-align:right">Sold</th><th>Status</th></tr></thead>
<tbody>${productRows || '<tr><td colspan="5" style="text-align:center;padding:12px;color:#999">No products</td></tr>'}</tbody></table>

<h2>Orders (${orders.length})</h2>
<table><thead><tr><th>Order ID</th><th>Status</th><th style="text-align:right">Total</th><th>Date</th></tr></thead>
<tbody>${orderRows || '<tr><td colspan="4" style="text-align:center;padding:12px;color:#999">No orders</td></tr>'}</tbody></table>
</body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
};

const AdminVendorDashboard = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [vendor, setVendor] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!vendorId) return;
    const fetchData = async () => {
      const { data: v } = await supabase.from("vendors").select("*").eq("id", vendorId).single();
      setVendor(v);

      const { data: prods } = await supabase.from("products").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false });
      setProducts(prods || []);

      // Fetch orders containing this vendor's products
      const productIds = (prods || []).map(p => p.id);
      if (productIds.length > 0) {
        const { data: orderItems } = await supabase.from("order_items").select("order_id, price, quantity, product_id").in("product_id", productIds);
        const orderIds = [...new Set((orderItems || []).map(oi => oi.order_id))];
        if (orderIds.length > 0) {
          const { data: ordersData } = await supabase.from("orders").select("*").in("id", orderIds).order("created_at", { ascending: false });
          setOrders(ordersData || []);
        }
      }
    };
    fetchData();
  }, [vendorId]);

  if (!vendor) {
    return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const totalRevenue = products.reduce((sum, p) => sum + (p.price * (p.sold_count || 0)), 0);

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/vendors">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{vendor.store_name}</h1>
            <p className="text-sm text-muted-foreground">Vendor Dashboard — {vendor.status}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printVendorDetails(vendor, products, orders, totalRevenue)}>
          <Printer className="h-3.5 w-3.5" /> Print Details
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{products.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{orders.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Products</h2>
      <div className="rounded-lg border bg-card overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No products</TableCell></TableRow>
            ) : products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded bg-muted"><ImageIcon className="h-3 w-3 text-muted-foreground" /></div>}
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-right">${p.price}</TableCell>
                <TableCell className="text-right">{p.stock}</TableCell>
                <TableCell className="text-right">{p.sold_count || 0}</TableCell>
                <TableCell><Badge variant={p.is_active ? "secondary" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2 className="text-lg font-semibold mb-3">Recent Orders</h2>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No orders</TableCell></TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}...</TableCell>
                <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                <TableCell className="text-right">${o.total}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminVendorDashboard;
