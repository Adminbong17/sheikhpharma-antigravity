import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Image as ImageIcon, Bluetooth } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { printViaBluetooth, isBluetoothSupported, type BTInvoiceData } from "@/lib/bluetoothPrinter";

interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_division?: string;
  customer_zilla?: string;
  customer_upazilla?: string;
  payment_method?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  delivery_charge: number;
  total: number;
  notes?: string;
  created_at: string;
}

interface Props {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hideCustomer?: boolean;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });

// ─── A4 Template ─────────────────────────────────────────────────────────────
const A4Template = ({ invoice, siteName, logoUrl, hideCustomer }: { invoice: Invoice; siteName: string; logoUrl?: string | null; hideCustomer?: boolean }) => {
  const address = [invoice.customer_upazilla, invoice.customer_zilla, invoice.customer_division].filter(Boolean).join(", ");
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#111", lineHeight: 1.6, background: "#fff", padding: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #111", paddingBottom: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {logoUrl && <img src={logoUrl} alt="logo" style={{ height: "52px", objectFit: "contain" }} />}
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{siteName}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Tax Invoice / Receipt</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "22px", fontWeight: "bold", letterSpacing: "2px" }}>INVOICE</div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#444", fontFamily: "monospace" }}>{invoice.invoice_number}</div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{formatDate(invoice.created_at)}</div>
        </div>
      </div>

      {/* Billing & Order Info */}
      {!hideCustomer && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "#f7f7f7", padding: "14px", borderRadius: "8px", borderLeft: "4px solid #111" }}>
            <div style={{ fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", color: "#888", marginBottom: "8px", letterSpacing: "1px" }}>Bill To</div>
            {invoice.customer_name && <div style={{ fontWeight: "bold", fontSize: "14px" }}>{invoice.customer_name}</div>}
            {invoice.customer_phone && <div style={{ marginTop: "4px" }}>📞 {invoice.customer_phone}</div>}
            {invoice.customer_address && <div style={{ marginTop: "4px", color: "#555" }}>📍 {invoice.customer_address}</div>}
            {address && <div style={{ color: "#888", fontSize: "12px" }}>{address}</div>}
          </div>
          <div style={{ background: "#f7f7f7", padding: "14px", borderRadius: "8px", borderLeft: "4px solid #111" }}>
            <div style={{ fontWeight: "bold", fontSize: "11px", textTransform: "uppercase", color: "#888", marginBottom: "8px", letterSpacing: "1px" }}>Payment Info</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "#666" }}>Method</span>
              <span style={{ fontWeight: "bold", textTransform: "capitalize" }}>{invoice.payment_method || "N/A"}</span>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
        <thead>
          <tr style={{ background: "#111", color: "#fff" }}>
            <th style={{ padding: "10px 14px", textAlign: "left" }}>#</th>
            <th style={{ padding: "10px 14px", textAlign: "left" }}>Product / Service</th>
            <th style={{ padding: "10px 14px", textAlign: "center" }}>Qty</th>
            <th style={{ padding: "10px 14px", textAlign: "right" }}>Unit Price</th>
            <th style={{ padding: "10px 14px", textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", color: "#888" }}>{i + 1}</td>
              <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", fontWeight: "500" }}>{item.name}</td>
              <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", textAlign: "center" }}>{item.qty}</td>
              <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", textAlign: "right" }}>৳{Number(item.price).toLocaleString()}</td>
              <td style={{ padding: "9px 14px", borderBottom: "1px solid #eee", textAlign: "right", fontWeight: "bold" }}>৳{(Number(item.qty) * Number(item.price)).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div style={{ minWidth: "250px", background: "#f7f7f7", borderRadius: "8px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#666" }}>Subtotal</span>
            <span>৳{Number(invoice.subtotal).toLocaleString()}</span>
          </div>
          {invoice.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", color: "#22c55e" }}>
              <span>Discount</span>
              <span>-৳{Number(invoice.discount).toLocaleString()}</span>
            </div>
          )}
          {invoice.delivery_charge > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#666" }}>Delivery</span>
              <span>+৳{Number(invoice.delivery_charge).toLocaleString()}</span>
            </div>
          )}
          <div style={{ borderTop: "2px solid #111", paddingTop: "10px", marginTop: "6px", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px" }}>
            <span>Total Amount</span>
            <span>৳{Number(invoice.total).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px" }}>
          <strong>Notes:</strong> {invoice.notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #ddd", paddingTop: "14px", textAlign: "center", color: "#aaa", fontSize: "11px" }}>
        Thank you for your business! • {siteName} • {invoice.invoice_number}
      </div>
    </div>
  );
};

// ─── POS Template (80mm or 56mm) ─────────────────────────────────────────────
const POSTemplate = ({ invoice, siteName, logoUrl, hideCustomer, narrow = false }: { invoice: Invoice; siteName: string; logoUrl?: string | null; hideCustomer?: boolean; narrow?: boolean }) => {
  const address = [invoice.customer_upazilla, invoice.customer_zilla, invoice.customer_division].filter(Boolean).join(", ");
  const w = narrow ? "210px" : "300px";
  const fs = narrow ? "10px" : "14px";
  return (
    <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: fs, color: "#000", width: w, margin: "0 auto", lineHeight: 1.5, background: "#fff", padding: narrow ? "8px" : "16px", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" as any }}>
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "10px" }}>
        {logoUrl && <img src={logoUrl} alt="logo" style={{ height: "40px", objectFit: "contain", marginBottom: "6px" }} />}
        <div style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "1px" }}>{siteName}</div>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#000" }}>INVOICE / RECEIPT</div>
        <div style={{ fontWeight: "900", marginTop: "6px", fontFamily: "monospace", fontSize: "13px", color: "#000" }}>{invoice.invoice_number}</div>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#333" }}>{formatDate(invoice.created_at)}</div>
      </div>

      {/* Customer */}
      {!hideCustomer && (
        <div style={{ borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "8px", fontSize: "13px", fontWeight: "600" }}>
          {invoice.customer_name && <div><strong>Name:</strong> {invoice.customer_name}</div>}
          {invoice.customer_phone && <div><strong>Phone:</strong> {invoice.customer_phone}</div>}
          {invoice.customer_address && <div><strong>Addr:</strong> {invoice.customer_address}</div>}
          {address && <div style={{ color: "#333", fontWeight: "600" }}>{address}</div>}
          <div><strong>Pay:</strong> {invoice.payment_method || "N/A"}</div>
        </div>
      )}

      {/* Items */}
      <div style={{ borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "8px" }}>
        {(invoice.items || []).map((item, i) => (
          <div key={i} style={{ marginBottom: "6px" }}>
            <div style={{ fontWeight: "900", fontSize: "13px", color: "#000" }}>{item.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "700" }}>
              <span>{item.qty} x ৳{Number(item.price).toLocaleString()}</span>
              <span style={{ fontWeight: "900" }}>৳{(Number(item.qty) * Number(item.price)).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ fontSize: "13px", marginBottom: "8px", fontWeight: "700" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal:</span><span>৳{Number(invoice.subtotal).toLocaleString()}</span>
        </div>
        {invoice.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "#000" }}>
            <span>Discount:</span><span>-৳{Number(invoice.discount).toLocaleString()}</span>
          </div>
        )}
        {invoice.delivery_charge > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Delivery:</span><span>+৳{Number(invoice.delivery_charge).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div style={{ borderTop: "2px solid #000", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "18px", color: "#000" }}>
        <span>TOTAL</span><span>৳{Number(invoice.total).toLocaleString()}</span>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ borderTop: "1px solid #000", paddingTop: "6px", marginTop: "8px", fontSize: "12px", fontWeight: "600", color: "#000" }}>
          <strong>Note:</strong> {invoice.notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "2px solid #000", paddingTop: "8px", marginTop: "8px", textAlign: "center", fontSize: "12px", fontWeight: "700", color: "#333" }}>
        Thank you! • {siteName}
      </div>
    </div>
  );
};

// ─── Main Dialog ─────────────────────────────────────────────────────────────
const InvoicePrintDialog = ({ invoice, open, onOpenChange, hideCustomer }: Props) => {
  const { data: settings } = useSiteSettings();
  const [tab, setTab] = useState<"a4" | "pos" | "pos56">("a4");
  const a4Ref = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLDivElement>(null);
  const pos56Ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const siteName = settings?.site_name || "Shop";
  const logoUrl = settings?.logo_url;

  const refForTab = (t: "a4" | "pos" | "pos56") =>
    t === "a4" ? a4Ref : t === "pos" ? posRef : pos56Ref;

  const printInvoice = (type: "a4" | "pos" | "pos56") => {
    const ref = refForTab(type);
    const content = ref.current?.innerHTML;
    if (!content) return;

    const pageStyle =
      type === "pos56"
        ? `@page { size: 56mm auto; margin: 2mm; } body { margin: 0; }`
        : type === "pos"
        ? `@page { size: 80mm auto; margin: 4mm; } body { margin: 0; }`
        : `@page { size: A4; margin: 15mm; } body { margin: 0; }`;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>${invoice.invoice_number}</title>
      <style>${pageStyle} * { box-sizing: border-box; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>
    </head><body>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
  };

  const exportAsImage = async (type: "a4" | "pos" | "pos56") => {
    const ref = refForTab(type);
    if (!ref.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const link = document.createElement("a");
      link.download = `${invoice.invoice_number}-${type.toUpperCase()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
      toast.success("Image downloaded!");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-primary">{invoice.invoice_number}</span>
            <span className="text-muted-foreground font-normal text-sm">— Preview & Export</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "a4" | "pos" | "pos56")}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="a4">📄 A4</TabsTrigger>
              <TabsTrigger value="pos">🧾 80mm</TabsTrigger>
              <TabsTrigger value="pos56">🧾 56mm</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printInvoice(tab)}>
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportAsImage(tab)} disabled={exporting}>
                <ImageIcon className="h-3.5 w-3.5" /> {exporting ? "Exporting..." : "Save as JPG"}
              </Button>
              {isBluetoothSupported() && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={async () => {
                    try {
                      const formatDate = (d: string) =>
                        new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });
                      const btData: BTInvoiceData = {
                        storeName: siteName,
                        invoiceNumber: invoice.invoice_number,
                        date: formatDate(invoice.created_at),
                        customerName: invoice.customer_name,
                        customerPhone: invoice.customer_phone,
                        customerAddress: invoice.customer_address,
                        paymentMethod: invoice.payment_method,
                        items: (invoice.items || []).map((it) => ({ name: it.name, qty: it.qty, price: it.price })),
                        subtotal: invoice.subtotal,
                        discount: invoice.discount,
                        deliveryCharge: invoice.delivery_charge,
                        total: invoice.total,
                        notes: invoice.notes,
                      };
                      await printViaBluetooth(btData);
                      toast.success("Bluetooth প্রিন্ট সফল!");
                    } catch (err: any) {
                      toast.error(err?.message || "Bluetooth প্রিন্ট ব্যর্থ");
                    }
                  }}
                >
                  <Bluetooth className="h-3.5 w-3.5" /> BT Print
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="a4">
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <div ref={a4Ref}>
                <A4Template invoice={invoice} siteName={siteName} logoUrl={logoUrl} hideCustomer={hideCustomer} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pos">
            <div className="flex justify-center">
              <div className="border rounded-xl overflow-hidden shadow-sm w-fit">
                <div ref={posRef}>
                  <POSTemplate invoice={invoice} siteName={siteName} logoUrl={logoUrl} hideCustomer={hideCustomer} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pos56">
            <div className="flex justify-center">
              <div className="border rounded-xl overflow-hidden shadow-sm w-fit">
                <div ref={pos56Ref}>
                  <POSTemplate invoice={invoice} siteName={siteName} logoUrl={logoUrl} hideCustomer={hideCustomer} narrow />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePrintDialog;
