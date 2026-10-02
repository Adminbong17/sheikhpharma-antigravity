import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Image as ImageIcon } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import html2canvas from "html2canvas";
import { toast } from "sonner";
interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product_name?: string | null;
  products?: { name: string; image_url?: string };
}

interface Order {
  id: string;
  order_number?: number;
  created_at: string;
  status: string;
  payment_method?: string;
  transaction_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_division?: string | null;
  customer_zilla?: string | null;
  customer_upazilla?: string | null;
  customer_email?: string | null;
  order_notes?: string | null;
  total: number;
  order_items?: OrderItem[];
  steadfast_tracking_code?: string | null;
}

interface Props {
  order: Order;
  hideCustomer?: boolean;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const padOrderNum = (n?: number) => String(n ?? 0).padStart(11, "0");

// ─── A4 Invoice ────────────────────────────────────────────────────────────────
const A4PrintContent = ({ order, siteName, logoUrl, hideCustomer }: { order: Order; siteName: string; logoUrl?: string | null; hideCustomer?: boolean }) => {
  const address = [order.customer_upazilla, order.customer_zilla, order.customer_division].filter(Boolean).join(", ");
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#111", lineHeight: 1.5 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #111", paddingBottom: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {logoUrl && <img src={logoUrl} alt="logo" style={{ height: "48px", objectFit: "contain" }} />}
          <div>
            <div style={{ fontSize: "22px", fontWeight: "bold" }}>{siteName}</div>
            <div style={{ fontSize: "11px", color: "#555" }}>Tax Invoice / Receipt</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "20px", fontWeight: "bold" }}>INVOICE</div>
          <div style={{ fontSize: "12px", color: "#555" }}>#{padOrderNum(order.order_number)}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>{formatDate(order.created_at)}</div>
        </div>
      </div>

      {/* Billing Info */}
      <div style={{ display: "grid", gridTemplateColumns: hideCustomer ? "1fr" : "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {!hideCustomer && (
          <div style={{ background: "#f5f5f5", padding: "12px", borderRadius: "6px" }}>
            <div style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", color: "#555" }}>Bill To</div>
            {order.customer_name && <div style={{ fontWeight: "bold" }}>{order.customer_name}</div>}
            {order.customer_phone && <div>{order.customer_phone}</div>}
            {order.customer_email && <div style={{ fontSize: "11px", color: "#555" }}>{order.customer_email}</div>}
            {order.customer_address && <div style={{ marginTop: "4px" }}>{order.customer_address}</div>}
            {address && <div style={{ color: "#555", fontSize: "12px" }}>{address}</div>}
          </div>
        )}
        <div style={{ background: "#f5f5f5", padding: "12px", borderRadius: "6px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase", color: "#555" }}>Order Info</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Status</span><span style={{ textTransform: "capitalize", fontWeight: "bold" }}>{order.status}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Payment</span><span style={{ textTransform: "capitalize" }}>{order.payment_method || "N/A"}</span></div>
          {order.transaction_id && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Txn ID</span><span style={{ fontFamily: "monospace", fontSize: "11px" }}>{order.transaction_id}</span></div>}
          {order.steadfast_tracking_code && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tracking</span><span style={{ fontFamily: "monospace", fontWeight: "bold" }}>{order.steadfast_tracking_code}</span></div>}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
        <thead>
          <tr style={{ background: "#111", color: "#fff" }}>
            <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: "bold" }}>Product</th>
            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: "bold" }}>Qty</th>
            <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: "bold" }}>Unit Price</th>
            <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: "bold" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items?.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
              <td style={{ padding: "8px 12px", borderBottom: "1px solid #eee" }}>{item.products?.name || item.product_name || "Product"}</td>
              <td style={{ padding: "8px 12px", textAlign: "center", borderBottom: "1px solid #eee" }}>{item.quantity}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #eee" }}>৳{item.price.toLocaleString()}</td>
              <td style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid #eee", fontWeight: "bold" }}>৳{(item.price * item.quantity).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div style={{ minWidth: "220px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#111", color: "#fff", borderRadius: "6px", fontWeight: "bold", fontSize: "15px" }}>
            <span>Total Amount</span>
            <span>৳{order.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Notes & Footer */}
      {order.order_notes && (
        <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "6px", padding: "10px 12px", marginBottom: "16px", fontSize: "12px" }}>
          <strong>Notes:</strong> {order.order_notes}
        </div>
      )}
      <div style={{ borderTop: "1px solid #ddd", paddingTop: "12px", textAlign: "center", color: "#888", fontSize: "11px" }}>
        Thank you for your order! • {siteName}
      </div>
    </div>
  );
};

// ─── POS Invoice (80mm style) ───────────────────────────────────────────────
const POSPrintContent = ({ order, siteName, logoUrl, hideCustomer, narrow = false }: { order: Order; siteName: string; logoUrl?: string | null; hideCustomer?: boolean; narrow?: boolean }) => {
  const address = [order.customer_upazilla, order.customer_zilla, order.customer_division].filter(Boolean).join(", ");
  const width = narrow ? "200px" : "280px";
  const baseFs = narrow ? "10px" : "14px";
  const titleFs = narrow ? "14px" : "20px";
  const itemFs = narrow ? "10px" : "13px";
  const totalFs = narrow ? "13px" : "18px";
  return (
    <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: baseFs, color: "#000", width, margin: "0 auto", lineHeight: 1.5, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" as any }}>
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "6px" }}>
        {logoUrl && <img src={logoUrl} alt="logo" style={{ height: narrow ? "26px" : "36px", objectFit: "contain", marginBottom: "4px" }} />}
        <div style={{ fontSize: titleFs, fontWeight: "900", letterSpacing: "1px" }}>{siteName}</div>
        <div style={{ fontSize: narrow ? "9px" : "12px", fontWeight: "700", color: "#000" }}>INVOICE / RECEIPT</div>
        <div style={{ marginTop: "4px", fontSize: narrow ? "10px" : "12px", fontWeight: "900" }}>#{padOrderNum(order.order_number)}</div>
        <div style={{ fontSize: narrow ? "9px" : "12px", fontWeight: "600", color: "#333" }}>{formatDate(order.created_at)}</div>
      </div>

      {/* Customer */}
      {!hideCustomer && (
        <div style={{ borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "6px", fontWeight: "600", fontSize: itemFs }}>
          {order.customer_name && <div><strong>Name:</strong> {order.customer_name}</div>}
          {order.customer_phone && <div><strong>Phone:</strong> {order.customer_phone}</div>}
          {order.customer_address && <div><strong>Addr:</strong> {order.customer_address}</div>}
          {address && <div style={{ fontWeight: "600", color: "#333" }}>{address}</div>}
        </div>
      )}

      {/* Payment */}
      <div style={{ borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "6px", fontWeight: "600", fontSize: itemFs }}>
        <div><strong>Payment:</strong> {order.payment_method || "N/A"}</div>
        <div><strong>Status:</strong> {order.status}</div>
        {order.transaction_id && <div style={{ fontSize: narrow ? "9px" : "12px" }}><strong>Txn:</strong> {order.transaction_id}</div>}
        {order.steadfast_tracking_code && <div><strong>Track:</strong> {order.steadfast_tracking_code}</div>}
      </div>

      {/* Items */}
      <div style={{ borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "6px" }}>
        {order.order_items?.map((item) => (
          <div key={item.id} style={{ marginBottom: "4px" }}>
            <div style={{ fontWeight: "900", fontSize: itemFs, color: "#000" }}>{item.products?.name || item.product_name || "Product"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: itemFs, fontWeight: "700" }}>
              <span>{item.quantity} x ৳{item.price.toLocaleString()}</span>
              <span style={{ fontWeight: "900" }}>৳{(item.price * item.quantity).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: totalFs, marginBottom: "6px", color: "#000" }}>
        <span>TOTAL</span>
        <span>৳{order.total.toLocaleString()}</span>
      </div>

      {/* Notes */}
      {order.order_notes && (
        <div style={{ fontSize: narrow ? "9px" : "12px", fontWeight: "600", color: "#000", borderTop: "1px solid #000", paddingTop: "4px", marginBottom: "4px" }}>
          <strong>Notes:</strong> {order.order_notes}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: "center", borderTop: "2px solid #000", paddingTop: "6px", fontSize: narrow ? "9px" : "12px", fontWeight: "700", color: "#333" }}>
        Thank you! • {siteName}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export const OrderInvoicePrint = ({ order, hideCustomer }: Props) => {
  const { data: settings } = useSiteSettings();
  const a4Ref = useRef<HTMLDivElement>(null);
  const posRef = useRef<HTMLDivElement>(null);
  const pos56Ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  type PrintMode = "a4" | "pos80" | "pos56";

  const printContent = (ref: React.RefObject<HTMLDivElement>, mode: PrintMode) => {
    const content = ref.current?.innerHTML;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const pageStyle =
      mode === "pos56"
        ? `@page { size: 56mm auto; margin: 2mm; } body { margin: 0; }`
        : mode === "pos80"
        ? `@page { size: 80mm auto; margin: 4mm; } body { margin: 0; }`
        : `@page { size: A4; margin: 20mm; } body { margin: 0; }`;

    const isPos = mode !== "a4";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${padOrderNum(order.order_number)}</title>
          <style>
            ${pageStyle}
            * { box-sizing: border-box; }
            body { font-family: ${isPos ? "'Courier New', Courier, monospace" : "Arial, sans-serif"}; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const exportAsImage = async (ref: React.RefObject<HTMLDivElement>, label: string) => {
    if (!ref.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: ref.current.scrollWidth,
        windowHeight: ref.current.scrollHeight,
      });
      const link = document.createElement("a");
      link.download = `Invoice-${padOrderNum(order.order_number)}-${label}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
      toast.success("Image downloaded!");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const siteName = settings?.site_name || "Shop";
  const logoUrl = settings?.logo_url;

  return (
    <>
      {/* Off-screen print content containers — use absolute positioning instead of display:none so html2canvas can measure dimensions correctly */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, opacity: 0, pointerEvents: "none" }}>
        <div ref={a4Ref} style={{ width: "794px", background: "#fff", padding: "32px" }}>
          <A4PrintContent order={order} siteName={siteName} logoUrl={logoUrl} hideCustomer={hideCustomer} />
        </div>
        <div ref={posRef} style={{ background: "#fff", padding: "16px" }}>
          <POSPrintContent order={order} siteName={siteName} logoUrl={logoUrl} hideCustomer={hideCustomer} />
        </div>
        <div ref={pos56Ref} style={{ background: "#fff", padding: "8px" }}>
          <POSPrintContent order={order} siteName={siteName} logoUrl={logoUrl} hideCustomer={hideCustomer} narrow />
        </div>
      </div>

      {/* Print & Save buttons */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <Printer className="h-4 w-4" /> Print / Save Invoice
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => printContent(a4Ref, "a4")}>
            <Printer className="h-3.5 w-3.5" /> A4 Print
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => printContent(posRef, "pos80")}>
            <Printer className="h-3.5 w-3.5" /> 80mm Print
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => printContent(pos56Ref, "pos56")}>
            <Printer className="h-3.5 w-3.5" /> 56mm Print
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => exportAsImage(a4Ref, "A4")} disabled={exporting}>
            <ImageIcon className="h-3.5 w-3.5" /> {exporting ? "Saving..." : "A4 JPG"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => exportAsImage(posRef, "80mm")} disabled={exporting}>
            <ImageIcon className="h-3.5 w-3.5" /> {exporting ? "Saving..." : "80mm JPG"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => exportAsImage(pos56Ref, "56mm")} disabled={exporting}>
            <ImageIcon className="h-3.5 w-3.5" /> {exporting ? "Saving..." : "56mm JPG"}
          </Button>
        </div>
      </div>
    </>
  );
};
