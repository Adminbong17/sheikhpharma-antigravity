import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PackageCheck, Star, MessageCircle, RotateCcw, Loader2, FileDown, PackageX, RefreshCw } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import ReviewDialog from "@/components/ReviewDialog";
import MessageVendorDialog from "@/components/MessageVendorDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import CustomerInvoiceDialog from "@/components/CustomerInvoiceDialog";

const statusConfig: Record<string, { label: string; dbStatus: string | string[]; color: string }> = {
  unpaid: { label: "Unpaid", dbStatus: "pending", color: "bg-yellow-500/10 text-yellow-600" },
  "to-ship": { label: "To Ship", dbStatus: "processing", color: "bg-blue-500/10 text-blue-600" },
  "to-receive": { label: "To Receive", dbStatus: "shipped", color: "bg-purple-500/10 text-purple-600" },
  review: { label: "Review", dbStatus: "delivered", color: "bg-green-500/10 text-green-600" },
  "return-cancel": { label: "Return & Cancel", dbStatus: ["cancelled", "refunded"], color: "bg-red-500/10 text-red-600" },
};

const MyOrders = () => {
  const { status } = useParams<{ status: string }>();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reviewTarget, setReviewTarget] = useState<{
    productId: string;
    productName: string;
    productImage?: string | null;
    orderId: string;
    orderItemId: string;
  } | null>(null);
  const [msgTarget, setMsgTarget] = useState<{
    vendorId: string;
    vendorName: string;
    orderId: string;
    orderNumber: number;
  } | null>(null);
  const [refundTarget, setRefundTarget] = useState<{
    orderId: string;
    orderNumber: number;
    amount: number;
    vendorId?: string;
    requestType: "refund" | "return";
  } | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("bkash");
  const [refundAccountNumber, setRefundAccountNumber] = useState("");
  const [refundAccountName, setRefundAccountName] = useState("");
  const [refundBankName, setRefundBankName] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);

  const { data: banks = [] } = useQuery({
    queryKey: ["banks-list"],
    queryFn: async () => {
      const { data } = await supabase.from("banks").select("id, name").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const config = status ? statusConfig[status] : null;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders-filtered", user?.id, config?.dbStatus],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, order_items(*, products(name, image_url, vendor_id, vendors(id, store_name)))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (config?.dbStatus) {
        if (Array.isArray(config.dbStatus)) {
          query = query.in("status", config.dbStatus as any);
        } else {
          query = query.eq("status", config.dbStatus as any);
        }
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: refundRequests = [], refetch: refetchRefunds } = useQuery({
    queryKey: ["my-refund-requests", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("refund_requests").select("order_id, status").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const refundByOrder: Record<string, string> = {};
  refundRequests.forEach((r: any) => { refundByOrder[r.order_id] = r.status; });

  const pageTitle = config ? config.label : "All Orders";

  const handleRefundRequest = async () => {
    if (!refundTarget) return;
    setRefundSubmitting(true);
    if (refundTarget.requestType === "refund") {
      if (!refundAccountNumber.trim()) { toast.error("Please enter your account number"); setRefundSubmitting(false); return; }
      if (!refundAccountName.trim()) { toast.error("Please enter your account holder name"); setRefundSubmitting(false); return; }
      if (refundMethod === "bank" && !refundBankName.trim()) { toast.error("Please enter your bank name"); setRefundSubmitting(false); return; }
    }
    const { error } = await (supabase as any).from("refund_requests").insert({
      order_id: refundTarget.orderId,
      user_id: user!.id,
      vendor_id: refundTarget.vendorId || null,
      amount: refundTarget.amount,
      reason: refundReason.trim() || null,
      request_type: refundTarget.requestType,
      refund_method: refundTarget.requestType === "refund" ? refundMethod : null,
      refund_account_number: refundTarget.requestType === "refund" ? refundAccountNumber.trim() : null,
      refund_account_name: refundTarget.requestType === "refund" ? refundAccountName.trim() : null,
      refund_bank_name: refundTarget.requestType === "refund" && refundMethod === "bank" ? refundBankName.trim() : null,
    });
    const typeLabel = refundTarget.requestType === "return" ? "Return" : "Refund";
    if (error) { toast.error(`Failed to submit ${typeLabel.toLowerCase()} request`); setRefundSubmitting(false); return; }
    await (supabase.from("notifications" as any) as any).insert({
      target_role: "admin",
      title: `${typeLabel} Request`,
      body: `${typeLabel} request for order #${refundTarget.orderNumber} — ${formatPrice(refundTarget.amount)}`,
      type: "refund",
      action_url: "/admin/refunds",
    });
    toast.success(`${typeLabel} request submitted!`);
    refetchRefunds();
    setRefundSubmitting(false);
    setRefundTarget(null);
    setRefundReason("");
    setRefundMethod("bkash");
    setRefundAccountNumber("");
    setRefundAccountName("");
    setRefundBankName("");
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4 flex items-center gap-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <h1 className="mb-4 text-xl font-bold">{pageTitle} Orders</h1>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <PackageCheck className="h-14 w-14 opacity-20" />
            <p className="font-medium">No {pageTitle.toLowerCase()} orders</p>
            <p className="text-sm text-center">You don't have any orders in this status yet.</p>
            <Link
              to="/"
              className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Order Header */}
                  <div className="flex items-center justify-between border-b px-4 py-2.5 bg-muted/30">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{String(order.order_number ?? 0).padStart(11, '0')}
                    </span>
                    <Badge
                      variant="secondary"
                      className={config?.color || "bg-muted text-muted-foreground"}
                    >
                      {config?.label || order.status}
                    </Badge>
                  </div>

                  {/* Order Items */}
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
                      {item.products?.image_url ? (
                        <img
                          src={item.products.image_url}
                          alt={item.products.name}
                          className="h-14 w-14 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                          <PackageCheck className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.products?.name || item.product_name || "Product"}
                        </p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <p className="text-sm font-semibold">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                        {status === "review" && (item.product_id || item.products) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            onClick={() =>
                              setReviewTarget({
                                productId: item.product_id || item.products?.id,
                                productName: item.products?.name || item.product_name || "Product",
                                productImage: item.products?.image_url,
                                orderId: order.id,
                                orderItemId: item.id,
                              })
                            }
                          >
                            <Star className="h-3 w-3" />
                            Review
                          </Button>
                        )}
                        {item.products?.vendors?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-primary"
                            onClick={() =>
                              setMsgTarget({
                                vendorId: item.products.vendors.id,
                                vendorName: item.products.vendors.store_name || "Seller",
                                orderId: order.id,
                                orderNumber: order.order_number,
                              })
                            }
                          >
                            <MessageCircle className="h-3 w-3" />
                            Message Seller
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Order Footer */}
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => setInvoiceOrder(order)}
                    >
                      <FileDown className="h-3 w-3" />
                      Invoice
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => {
                        order.order_items?.forEach((item: any) => {
                          if (item.product_id || item.products) {
                            addItem({
                              id: item.product_id || item.products?.id,
                              name: item.products?.name || item.product_name || "Product",
                              price: item.price,
                              image_url: item.products?.image_url || null,
                            });
                          }
                        });
                        toast.success("Products added to cart!");
                        navigate("/checkout");
                      }}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reorder
                    </Button>
                    {refundByOrder[order.id] ? (
                      <Badge variant="secondary" className={
                        refundByOrder[order.id] === "refunded" ? "bg-green-500/10 text-green-600" :
                        refundByOrder[order.id] === "approved" ? "bg-blue-500/10 text-blue-600" :
                        refundByOrder[order.id] === "rejected" ? "bg-red-500/10 text-red-600" :
                        "bg-yellow-500/10 text-yellow-600"
                      }>
                        Refund: {refundByOrder[order.id]}
                      </Badge>
                    ) : (order.status === "delivered" || order.status === "cancelled") && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            const vendorId = order.order_items?.[0]?.products?.vendor_id;
                            setRefundTarget({
                              orderId: order.id,
                              orderNumber: order.order_number,
                              amount: order.total,
                              vendorId,
                              requestType: "refund",
                            });
                          }}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Refund
                        </Button>
                        {order.status === "delivered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
                            onClick={() => {
                              const vendorId = order.order_items?.[0]?.products?.vendor_id;
                              setRefundTarget({
                                orderId: order.id,
                                orderNumber: order.order_number,
                                amount: order.total,
                                vendorId,
                                requestType: "return",
                              });
                            }}
                          >
                            <PackageX className="h-3 w-3" />
                            Return
                          </Button>
                        )}
                      </>
                    
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Total:</span>
                      <span className="text-sm font-bold text-primary">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      {reviewTarget && (
        <ReviewDialog
          open={!!reviewTarget}
          onOpenChange={(open) => !open && setReviewTarget(null)}
          productId={reviewTarget.productId}
          productName={reviewTarget.productName}
          productImage={reviewTarget.productImage}
          orderId={reviewTarget.orderId}
          orderItemId={reviewTarget.orderItemId}
          onReviewed={() => {
            queryClient.invalidateQueries({ queryKey: ["my-orders-filtered"] });
          }}
        />
      )}

      {/* Message Seller Dialog */}
      {msgTarget && (
        <MessageVendorDialog
          open={!!msgTarget}
          onOpenChange={(open) => !open && setMsgTarget(null)}
          vendorId={msgTarget.vendorId}
          vendorName={msgTarget.vendorName}
          orderId={msgTarget.orderId}
          orderNumber={msgTarget.orderNumber}
        />
      )}

      {/* Refund/Return Request Dialog */}
      <Dialog open={!!refundTarget} onOpenChange={(o) => !o && setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {refundTarget?.requestType === "return" ? "Request Return" : "Request Refund"}
            </DialogTitle>
          </DialogHeader>
          {refundTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <p><strong>Order:</strong> #{refundTarget.orderNumber}</p>
                <p><strong>Amount:</strong> {formatPrice(refundTarget.amount)}</p>
              </div>
              {refundTarget.requestType === "refund" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Refund Method</label>
                    <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bkash">bKash</SelectItem>
                        <SelectItem value="nagad">Nagad</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Account Holder Name</label>
                    <Input value={refundAccountName} onChange={(e) => setRefundAccountName(e.target.value)} placeholder="Enter account holder name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      {refundMethod === "bank" ? "Account Number" : `${refundMethod === "bkash" ? "bKash" : "Nagad"} Number`}
                    </label>
                    <Input value={refundAccountNumber} onChange={(e) => setRefundAccountNumber(e.target.value)} placeholder={refundMethod === "bank" ? "Enter bank account number" : `Enter ${refundMethod} number`} />
                  </div>
                  {refundMethod === "bank" && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Bank Name</label>
                      <Select value={refundBankName} onValueChange={setRefundBankName}>
                        <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                        <SelectContent className="bg-background border z-50 max-h-60">
                          {banks.map((b: any) => (
                            <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {refundTarget.requestType === "return" ? "Reason for return" : "Reason for refund"}
                </label>
                <Textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder={refundTarget.requestType === "return" ? "Describe why you want to return..." : "Describe why you want a refund..."} rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>Cancel</Button>
            <Button onClick={handleRefundRequest} disabled={refundSubmitting} variant="destructive">
              {refundSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : refundTarget?.requestType === "return" ? "Submit Return Request" : "Submit Refund Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Invoice Dialog */}
      <CustomerInvoiceDialog
        open={!!invoiceOrder}
        onOpenChange={(o) => !o && setInvoiceOrder(null)}
        order={invoiceOrder}
      />
    </div>
  );
};

export default MyOrders;
