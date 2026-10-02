import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/contexts/VendorContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Package, ShoppingCart, Send, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

// Detect Bangladeshi 11-digit phone numbers (01XXXXXXXXX)
const BD_PHONE_REGEX = /\b01[3-9]\d{8}\b/;

const VendorMessages = () => {
  const { vendorId } = useVendor();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);

  const loadMessages = async () => {
    if (!vendorId) return;
    setLoading(true);
    const { data } = await (supabase.from("messages" as any) as any)
      .select("*, parent:parent_id(*), product:product_id(id, name, image_url, slug)")
      .eq("vendor_id", vendorId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Check which senders are admins
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))] as string[];
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", senderIds)
        .eq("role", "admin");
      const adminSet = new Set((adminRoles || []).map((r: any) => r.user_id));
      setMessages(data.map((m: any) => ({ ...m, is_admin_sender: adminSet.has(m.sender_id) })));
    } else {
      setMessages([]);
    }
    setLoading(false);
  };

  const loadReplies = async (messageId: string) => {
    const { data } = await (supabase.from("messages" as any) as any)
      .select("*")
      .eq("parent_id", messageId)
      .order("created_at", { ascending: true });
    return data || [];
  };

  useEffect(() => {
    loadMessages();
  }, [vendorId]);

  // Realtime: auto-refresh when new messages arrive for this vendor
  useEffect(() => {
    if (!vendorId) return;
    const channel = supabase
      .channel("vendor-messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `vendor_id=eq.${vendorId}` },
        (payload: any) => {
          loadMessages();
          // If a thread is expanded, reload its replies
          if (expandedId) {
            loadReplies(expandedId).then((replies) => {
              setMessages((prev) => prev.map((m) => m.id === expandedId ? { ...m, replies } : m));
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendorId, expandedId]);

  const handleExpand = async (msg: any) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
      return;
    }
    // Mark as read
    if (!msg.is_read) {
      await (supabase.from("messages" as any) as any).update({ is_read: true }).eq("id", msg.id);
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
    }
    // Load replies
    const replies = await loadReplies(msg.id);
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, replies } : m));
    setExpandedId(msg.id);
  };

  const handleReply = async (parentMsg: any) => {
    const text = replyText[parentMsg.id]?.trim();
    if (!text) { toast.error("Please enter a reply"); return; }
    if (!user || !vendorId) return;

    // Block phone numbers in replies
    if (BD_PHONE_REGEX.test(text)) {
      toast.error("Phone numbers are not allowed in messages");
      await (supabase.from("admin_notifications" as any) as any).insert({
        type: "phone_in_message",
        title: "Phone Number Detected in Reply",
        body: `Vendor tried to send a phone number in a reply message.`,
        metadata: {
          sender_id: user.id,
          vendor_id: vendorId,
          parent_message_id: parentMsg.id,
        },
      });
      return;
    }

    setReplying(parentMsg.id);
    try {
      const { error } = await (supabase.from("messages" as any) as any).insert({
        sender_id: user.id,
        vendor_id: vendorId,
        product_id: parentMsg.product_id || null,
        order_id: parentMsg.order_id || null,
        message: text,
        parent_id: parentMsg.id,
      });
      if (error) throw error;
      toast.success("Reply sent!");
      setReplyText((prev) => ({ ...prev, [parentMsg.id]: "" }));
      // Reload replies
      const replies = await loadReplies(parentMsg.id);
      setMessages((prev) => prev.map((m) => m.id === parentMsg.id ? { ...m, replies } : m));
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply");
    } finally {
      setReplying(null);
    }
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-3xl mx-auto">
      <BackButton className="mb-1" />
      <div className="flex items-center gap-3 mb-2">
        <MessageCircle className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">Customer Messages</h1>
        {unreadCount > 0 && (
          <Badge className="bg-primary text-primary-foreground">{unreadCount} new</Badge>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <MessageCircle className="h-14 w-14 opacity-20" />
          <p className="font-medium">No messages yet</p>
          <p className="text-sm">Customer messages will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} className={`overflow-hidden transition-all ${!msg.is_read ? "border-primary/50 bg-primary/5" : ""}`}>
              <CardContent className="p-0">
                {/* Message Header */}
                <button
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => handleExpand(msg)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{msg.is_admin_sender ? "Admin" : "Customer"}</span>
                      {msg.is_admin_sender && <Badge className="h-4 px-1.5 text-[10px] bg-primary text-primary-foreground">Admin</Badge>}
                      {!msg.is_read && <Badge className="h-4 px-1.5 text-[10px] bg-destructive text-destructive-foreground">New</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(msg.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Product context */}
                    {msg.product && (
                      <div className="flex items-center gap-2 mt-1.5 rounded-md bg-muted/60 border px-2 py-1.5">
                        {msg.product.image_url && (
                          <img src={msg.product.image_url} alt={msg.product.name} className="h-8 w-8 rounded object-cover shrink-0 border" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Product</p>
                          <p className="text-xs font-medium truncate">{msg.product.name}</p>
                        </div>
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
                      </div>
                    )}
                    {msg.order_id && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <ShoppingCart className="h-3 w-3" /> Order inquiry
                      </div>
                    )}

                    <p className="text-sm text-foreground mt-1 line-clamp-2">{msg.message}</p>
                  </div>
                  {expandedId === msg.id ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded replies + reply box */}
                {expandedId === msg.id && (
                  <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
                    {/* Original message full */}
                    <div className="rounded-lg bg-card border px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-1">{msg.is_admin_sender ? "Admin's message" : "Customer's message"}</p>
                      <p className="text-sm">{msg.message}</p>
                    </div>

                    {/* Replies thread */}
                    {msg.replies && msg.replies.length > 0 && (
                      <div className="space-y-2">
                        {msg.replies.map((reply: any) => (
                          <div key={reply.id} className={`rounded-lg px-3 py-2 border ${reply.sender_id === user?.id ? "bg-primary/10 border-primary/20 ml-4" : "bg-card"}`}>
                            <p className="text-xs text-muted-foreground mb-1">
                              {reply.sender_id === user?.id ? "You (Seller)" : "Customer"} ·{" "}
                              {new Date(reply.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="text-sm">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Write your reply..."
                        value={replyText[msg.id] || ""}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                        rows={2}
                        maxLength={1000}
                        className={BD_PHONE_REGEX.test(replyText[msg.id] || "") ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {BD_PHONE_REGEX.test(replyText[msg.id] || "") && (
                        <div className="flex items-center gap-1.5 text-xs text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Phone numbers are not allowed in messages.
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleReply(msg)}
                        disabled={replying === msg.id || !replyText[msg.id]?.trim() || BD_PHONE_REGEX.test(replyText[msg.id] || "")}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {replying === msg.id ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorMessages;
