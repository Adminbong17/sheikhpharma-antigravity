import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import html2canvas from "html2canvas";

interface CustomerInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

const CustomerInvoiceDialog = ({ open, onOpenChange, order }: CustomerInvoiceDialogProps) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { formatPrice } = useCurrency();

  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = `invoice-${order.order_number}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  if (!order) return null;

  // Group items by vendor
  const vendorNames = [...new Set(
    (order.order_items || [])
      .map((item: any) => item.products?.vendors?.store_name)
      .filter(Boolean)
  )];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>অর্ডার ইনভয়েস</DialogTitle>
        </DialogHeader>

        <div ref={invoiceRef} className="bg-white text-black p-6 space-y-4" style={{ fontFamily: "sans-serif" }}>
          {/* Header */}
          <div className="text-center border-b pb-3">
            <h2 className="text-lg font-bold">INVOICE</h2>
            <p className="text-xs text-gray-500">Order #{String(order.order_number ?? 0).padStart(11, '0')}</p>
            <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>

          {/* Vendor Info (only vendor name) */}
          {vendorNames.length > 0 && (
            <div className="text-sm">
              <p className="text-xs text-gray-500">Sold by</p>
              <p className="font-semibold">{vendorNames.join(", ")}</p>
            </div>
          )}

          {/* Items */}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 text-xs text-gray-500">Item</th>
                <th className="text-center py-1.5 text-xs text-gray-500">Qty</th>
                <th className="text-right py-1.5 text-xs text-gray-500">Price</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items?.map((item: any) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 text-sm">{item.products?.name || item.product_name || "Product"}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right font-medium">{formatPrice(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="flex justify-between items-center border-t pt-3 font-bold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>

          {/* Payment Method */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Payment: {order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}
          </div>
        </div>

        <Button onClick={handleDownload} className="w-full gap-2">
          <Download className="h-4 w-4" /> ডাউনলোড করুন (JPG)
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerInvoiceDialog;
