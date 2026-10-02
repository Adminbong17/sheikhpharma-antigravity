import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageCircle, Store, AlertTriangle } from "lucide-react";

// Detect Bangladeshi 11-digit phone numbers (01XXXXXXXXX)
const BD_PHONE_REGEX = /\b01[3-9]\d{8}\b/;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  productId?: string;
  productName?: string;
  orderId?: string;
  orderNumber?: number;
}

const MessageVendorDialog = ({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  productId,
  productName,
  orderId,
  orderNumber,
}: Props) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  const handleMessageChange = (val: string) => {
    setMessage(val);
    setPhoneError(BD_PHONE_REGEX.test(val));
  };

  const handleSend = async () => {
    if (!user) {
      toast.error("Please login to send a message");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    if (message.trim().length > 1000) {
      toast.error("Message must be less than 1000 characters");
      return;
    }

    // Block if phone number detected — log attempt to admin
    if (BD_PHONE_REGEX.test(message)) {
      toast.error("Phone numbers are not allowed in messages");
      await (supabase.from("admin_notifications" as any) as any).insert({
        type: "phone_in_message",
        title: "Phone Number Detected in Message",
        body: `User tried to send a phone number via message to vendor "${vendorName}".${productName ? ` Product: ${productName}.` : ""}${orderNumber ? ` Order: #${String(orderNumber).padStart(11, "0")}.` : ""}`,
        metadata: {
          sender_id: user.id,
          vendor_id: vendorId,
          product_id: productId || null,
          order_id: orderId || null,
        },
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("messages" as any).insert({
        sender_id: user.id,
        vendor_id: vendorId,
        product_id: productId || null,
        order_id: orderId || null,
        message: message.trim(),
      } as any);

      if (error) throw error;

      toast.success("Message sent to seller!");
      setMessage("");
      setPhoneError(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Message Seller
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seller info */}
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <Store className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Sending to</p>
              <p className="text-sm font-semibold truncate">{vendorName}</p>
            </div>
          </div>

          {/* Context info */}
          {(productName || orderNumber) && (
            <div className="rounded-lg border bg-card px-3 py-2 space-y-0.5">
              {productName && (
                <p className="text-xs text-muted-foreground">
                  Product: <span className="text-foreground font-medium">{productName}</span>
                </p>
              )}
              {orderNumber && (
                <p className="text-xs text-muted-foreground">
                  Order: <span className="text-foreground font-medium">#{String(orderNumber).padStart(11, "0")}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Your Message</Label>
            <Textarea
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder="Write your question or inquiry here..."
              rows={4}
              maxLength={1000}
              className={phoneError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {phoneError ? (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Phone numbers are not allowed in messages.
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !message.trim() || phoneError}>
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageVendorDialog;
