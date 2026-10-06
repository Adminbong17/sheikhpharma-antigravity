import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Eye, Phone, Loader2, Printer, Download, MapPin } from "lucide-react";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { printTable, saveAsJpg, type PrintColumn, type PrintBranding } from "@/lib/printExport";

interface PrescriptionOrder {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_division: string | null;
  customer_zilla: string | null;
  customer_upazilla: string | null;
  prescription_url: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-300",
  processing: "bg-blue-500/10 text-blue-600 border-blue-300",
  completed: "bg-green-500/10 text-green-600 border-green-300",
  cancelled: "bg-red-500/10 text-red-600 border-red-300",
};

/** Parse medicine list from notes field */
const parseMedicines = (notes: string | null): { name: string; qty: string; instruction: string }[] => {
  if (!notes || !notes.startsWith("[Manual Prescription]")) return [];
  const lines = notes.split("\n").filter((l) => /^\d+\.\s/.test(l.trim()));
  return lines.map((line) => {
    const cleaned = line.replace(/^\d+\.\s*/, "");
    const qtyMatch = cleaned.match(/—\s*Qty:\s*(\d+)/);
    const instrMatch = cleaned.match(/\(([^)]+)\)\s*$/);
    const name = cleaned.replace(/\s*—\s*Qty:\s*\d+/, "").replace(/\s*\([^)]+\)\s*$/, "").trim();
    return { name, qty: qtyMatch?.[1] || "", instruction: instrMatch?.[1] || "" };
  });
};

const buildPrescriptionHtml = (order: PrescriptionOrder, branding: PrintBranding) => {
  const meds = parseMedicines(order.notes);
  const isManual = meds.length > 0;
  const logoSize = "48px";
  const logo = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="Logo" style="height:${logoSize};width:auto;object-fit:contain;" crossorigin="anonymous" />`
    : "";
  const contactParts: string[] = [];
  if (branding.officeAddress) contactParts.push(branding.officeAddress);
  if (branding.officePhone) contactParts.push(`📞 ${branding.officePhone}`);
  if (branding.officeEmail) contactParts.push(`✉ ${branding.officeEmail}`);
  const contactLine = contactParts.length
    ? `<div style="font-size:11px;color:#555;margin-top:2px;">${contactParts.join(" &nbsp;|&nbsp; ")}</div>`
    : "";

  const addressParts = [order.customer_address, order.customer_upazilla, order.customer_zilla, order.customer_division].filter(Boolean);

  let medsHtml = "";
  if (isManual) {
    medsHtml = `
      <h3 style="font-size:15px;font-weight:700;margin:18px 0 8px;color:#1a1a1a;">Medicine List</h3>
      <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
        <thead>
          <tr style="background:#f0f9f0;">
            <th style="border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:13px;font-weight:600;">#</th>
            <th style="border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:13px;font-weight:600;">Medicine Name</th>
            <th style="border:1px solid #ccc;padding:8px 12px;text-align:center;font-size:13px;font-weight:600;">Qty</th>
            <th style="border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:13px;font-weight:600;">Special Instruction</th>
          </tr>
        </thead>
        <tbody>
          ${meds.map((m, i) => `
            <tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"};">
              <td style="border:1px solid #ddd;padding:8px 12px;font-size:13px;font-weight:600;">${i + 1}</td>
              <td style="border:1px solid #ddd;padding:8px 12px;font-size:13px;font-weight:700;color:#1a1a1a;">${m.name}</td>
              <td style="border:1px solid #ddd;padding:8px 12px;font-size:13px;text-align:center;font-weight:600;">${m.qty || "—"}</td>
              <td style="border:1px solid #ddd;padding:8px 12px;font-size:12px;color:#555;">${m.instruction || "—"}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }

  const additionalNotes = order.notes?.includes("Additional Notes:")
    ? order.notes.split("Additional Notes:")[1]?.trim()
    : !isManual ? order.notes : null;

  return `<!DOCTYPE html>
<html><head><title>Prescription - ${order.customer_name || "Customer"}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: Arial, sans-serif; padding: 24px; max-width: 210mm; margin: 0 auto; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { body { padding: 0; } }
</style>
</head><body>
  <div style="display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:2px solid #333;margin-bottom:20px;">
    ${logo}
    <div>
      <div style="font-weight:700;font-size:20px;letter-spacing:0.5px;">${branding.siteName || ""}</div>
      ${contactLine}
    </div>
  </div>

  <h1 style="font-size:22px;font-weight:800;color:#1E6FD9;margin-bottom:4px;">
    ${isManual ? "📋 Manual Prescription" : "📎 Uploaded Prescription"}
  </h1>
  <p style="font-size:12px;color:#666;margin-bottom:20px;">
    Date: ${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
    &nbsp;|&nbsp; Status: <strong>${order.status.toUpperCase()}</strong>
  </p>

  <div style="background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin-bottom:20px;">
    <h3 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#333;">Customer Information</h3>
    <table style="font-size:13px;line-height:1.8;">
      <tr><td style="font-weight:600;padding-right:16px;color:#555;">Name:</td><td style="font-weight:700;">${order.customer_name || "—"}</td></tr>
      <tr><td style="font-weight:600;padding-right:16px;color:#555;">Phone:</td><td>${order.customer_phone || "—"}</td></tr>
      ${addressParts.length ? `<tr><td style="font-weight:600;padding-right:16px;color:#555;">Address:</td><td>${addressParts.join(", ")}</td></tr>` : ""}
    </table>
  </div>

  ${medsHtml}

  ${!isManual && order.prescription_url ? `
    <div style="margin:16px 0;">
      <h3 style="font-size:15px;font-weight:700;margin-bottom:8px;">Prescription Image</h3>
      ${order.prescription_url.endsWith(".pdf")
        ? `<p style="font-size:13px;color:#555;">PDF prescription attached. <a href="${order.prescription_url}" target="_blank">View PDF</a></p>`
        : `<img src="${order.prescription_url}" alt="Prescription" style="max-width:100%;max-height:500px;border:1px solid #ddd;border-radius:8px;" crossorigin="anonymous" />`
      }
    </div>
  ` : ""}

  ${additionalNotes ? `
    <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:12px;margin-top:16px;">
      <h3 style="font-size:14px;font-weight:700;margin:0 0 4px;color:#f57f17;">Additional Notes</h3>
      <p style="font-size:13px;color:#333;white-space:pre-line;margin:0;">${additionalNotes}</p>
    </div>
  ` : ""}

  <div style="margin-top:48px;text-align:right;font-size:13px;">
    <div style="border-top:1px solid #333;display:inline-block;padding-top:4px;min-width:180px;text-align:center;">
      <div style="font-weight:600;">Pharmacist</div>
      <div style="color:#666;font-size:11px;">Authorized Signature</div>
    </div>
  </div>
</body></html>`;
};

const AdminPrescriptions = () => {
  const [orders, setOrders] = useState<PrescriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState<PrescriptionOrder | null>(null);
  const { data: settings } = useSiteSettings();

  const branding: PrintBranding = {
    logoUrl: settings?.logo_url,
    siteName: (settings as any)?.site_name || "",
    officeAddress: (settings as any)?.office_address,
    officePhone: (settings as any)?.office_phone,
    officeEmail: (settings as any)?.office_email,
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await (supabase.from("prescription_orders" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    setOrders((data || []) as PrescriptionOrder[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase.from("prescription_orders" as any) as any)
      .update({ status })
      .eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Status updated to ${status}`);
    fetchOrders();
  };

  const handlePrint = (order: PrescriptionOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(buildPrescriptionHtml(order, branding));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  const handleSaveJpg = async (order: PrescriptionOrder) => {
    const { default: html2canvas } = await import("html2canvas");
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;background:white;width:794px;";
    const htmlStr = buildPrescriptionHtml(order, branding);
    container.innerHTML = htmlStr
      .replace(/<!DOCTYPE html>|<\/?html>|<\/?head>|<title>.*?<\/title>|<style>[\s\S]*?<\/style>/gi, "")
      .replace(/<\/?body>/gi, "");
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `Prescription_${order.customer_name || "Customer"}_${new Date(order.created_at).toISOString().slice(0, 10)}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } finally {
      document.body.removeChild(container);
    }
  };

  const handlePrintAll = () => {
    const columns: PrintColumn[] = [
      { header: "Date", accessor: (r) => new Date(r.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "2-digit" }) },
      { header: "Customer", accessor: (r) => r.customer_name || "—" },
      { header: "Phone", accessor: (r) => r.customer_phone || "—" },
      { header: "Type", accessor: (r) => r.notes?.startsWith("[Manual") ? "Manual" : "Upload" },
      { header: "Status", accessor: (r) => r.status },
      { header: "Address", accessor: (r) => [r.customer_address, r.customer_upazilla, r.customer_zilla, r.customer_division].filter(Boolean).join(", ") || "—" },
    ];
    printTable("Prescription Orders", columns, orders, "a4", branding);
  };

  const getMeds = (order: PrescriptionOrder) => parseMedicines(order.notes);
  const isManual = (order: PrescriptionOrder) => getMeds(order).length > 0;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-2" />
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Prescription Orders
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={handlePrintAll}>
            <Printer className="h-3.5 w-3.5" /> Print All
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">No prescription orders yet.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(o.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "2-digit" })}
                    </TableCell>
                    <TableCell className="font-medium">{o.customer_name || "—"}</TableCell>
                    <TableCell>
                      {o.customer_phone ? (
                        <a href={`tel:${o.customer_phone}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Phone className="h-3 w-3" /> {o.customer_phone}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={isManual(o) ? "bg-green-500/10 text-green-700 border-green-300" : "bg-blue-500/10 text-blue-700 border-blue-300"}>
                        {isManual(o) ? "Manual" : "Upload"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs">
                      {[o.customer_address, o.customer_upazilla, o.customer_zilla, o.customer_division].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                        <SelectTrigger className="h-7 w-[120px]">
                          <Badge className={statusColors[o.status] || ""}>{o.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setViewOrder(o)}>
                          <Eye className="h-3 w-3" /> View
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handlePrint(o)}>
                          <Printer className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handleSaveJpg(o)}>
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {orders.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{o.customer_name || "Unknown"}</span>
                    <div className="flex gap-1.5 items-center">
                      <Badge variant="outline" className={isManual(o) ? "bg-green-500/10 text-green-700 border-green-300 text-[10px]" : "bg-blue-500/10 text-blue-700 border-blue-300 text-[10px]"}>
                        {isManual(o) ? "Manual" : "Upload"}
                      </Badge>
                      <Badge className={`${statusColors[o.status] || ""} text-[10px]`}>{o.status}</Badge>
                    </div>
                  </div>
                  {o.customer_phone && (
                    <a href={`tel:${o.customer_phone}`} className="flex items-center gap-1 text-sm text-primary">
                      <Phone className="h-3 w-3" /> {o.customer_phone}
                    </a>
                  )}
                  {(o.customer_address || o.customer_division) && (
                    <p className="flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      {[o.customer_address, o.customer_upazilla, o.customer_zilla, o.customer_division].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {isManual(o) && (
                    <p className="text-xs text-muted-foreground">{getMeds(o).length} medicine(s)</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                    <div className="flex gap-1 ml-auto">
                      <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setViewOrder(o)}>
                        <Eye className="h-3 w-3" /> View
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handlePrint(o)}>
                        <Printer className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleSaveJpg(o)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                      <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* View Prescription Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={(o) => !o && setViewOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Prescription Details
            </DialogTitle>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                <h3 className="font-bold text-sm mb-2">Customer Information</h3>
                <p className="text-sm"><span className="font-semibold">Name:</span> {viewOrder.customer_name || "—"}</p>
                <p className="text-sm"><span className="font-semibold">Phone:</span> {viewOrder.customer_phone || "—"}</p>
                {(viewOrder.customer_address || viewOrder.customer_division) && (
                  <p className="text-sm flex items-start gap-1">
                    <span className="font-semibold shrink-0">Address:</span>
                    {[viewOrder.customer_address, viewOrder.customer_upazilla, viewOrder.customer_zilla, viewOrder.customer_division].filter(Boolean).join(", ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted: {new Date(viewOrder.created_at).toLocaleString()}
                </p>
              </div>

              {/* Medicine List for Manual */}
              {isManual(viewOrder) && (
                <div>
                  <h3 className="font-bold text-sm mb-2 text-green-700">Medicine List ({getMeds(viewOrder).length})</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-green-50">
                          <TableHead className="font-bold">#</TableHead>
                          <TableHead className="font-bold">Medicine</TableHead>
                          <TableHead className="font-bold text-center">Qty</TableHead>
                          <TableHead className="font-bold">Instruction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getMeds(viewOrder).map((m, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold">{i + 1}</TableCell>
                            <TableCell className="font-bold">{m.name}</TableCell>
                            <TableCell className="text-center font-semibold">{m.qty || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{m.instruction || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Uploaded Prescription Image */}
              {!isManual(viewOrder) && viewOrder.prescription_url && (
                <div>
                  <h3 className="font-bold text-sm mb-2 text-blue-700">Uploaded Prescription</h3>
                  {viewOrder.prescription_url.endsWith(".pdf") ? (
                    <iframe src={viewOrder.prescription_url} className="w-full h-[50vh] rounded-lg border" />
                  ) : (
                    <img src={viewOrder.prescription_url} alt="Prescription" className="w-full rounded-lg object-contain max-h-[50vh] border" />
                  )}
                </div>
              )}

              {/* Additional Notes */}
              {viewOrder.notes && !isManual(viewOrder) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h3 className="font-bold text-sm mb-1 text-yellow-800">Notes</h3>
                  <p className="text-sm whitespace-pre-line">{viewOrder.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button className="gap-1.5 flex-1" onClick={() => handlePrint(viewOrder)}>
                  <Printer className="h-4 w-4" /> Print A4
                </Button>
                <Button variant="outline" className="gap-1.5 flex-1" onClick={() => handleSaveJpg(viewOrder)}>
                  <Download className="h-4 w-4" /> Save as JPG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPrescriptions;
