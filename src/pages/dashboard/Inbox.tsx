import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Store, Package, ShoppingCart, Send, ArrowLeft, AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const BD_PHONE_REGEX = /\b01[3-9]\d{8}\b/;

const Inbox = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const loadThreads = async () => {
    if (!user) return;
    setLoading(true);
    // Load parent messages sent by the user
    const { data } = await (supabase.from("messages") as any)
      .select("*, product:product_id(id, name, image_url), vendor:vendor_id(id, store_name, logo_url)")
      .eq("sender_id", user.id)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // For each thread, check if there are unread vendor replies
      const threadIds = data.map((t: any) => t.id);
      const { data: replyData } = await (supabase.from("messages") as any)
        .select("parent_id, sender_id, is_read")
        .in("parent_id", threadIds)
        .neq("sender_id", user.id);

      const unreadMap: Record<string, boolean> = {};
      const latestReplyMap: Record<string, string> = {};
      (replyData || []).forEach((r: any) => {
        if (!r.is_read) unreadMap[r.parent_id] = true;
      });

      setThreads(data.map((t: any) => ({
        ...t,
        has_unread_reply: !!unreadMap[t.id],
      })));
    } else {
      setThreads(data || []);
    }
    setLoading(false);
  };

  const loadReplies = async (messageId: string) => {
    const { data } = await (supabase.from("messages") as any)
      .select("*")
      .eq("parent_id", messageId)
      .order("created_at", { ascending: true });
    return data || [];
  };

  useEffect(() => { loadThreads(); }, [user]);

  // Realtime: auto-refresh when new messages arrive for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          // Refresh if the message is a reply to one of user's threads, or is directed at user
          // We just reload all threads for simplicity
          loadThreads();
          // If a thread is open, also reload its replies
          if (selectedThread) {
            loadReplies(selectedThread.id).then(setReplies);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedThread]);

  const openThread = async (thread: any) => {
    setSelectedThread(thread);
    const r = await loadReplies(thread.id);
    setReplies(r);
    // Mark unread vendor replies as read
    if (user) {
      const unreadReplies = r.filter((rep: any) => rep.sender_id !== user.id && !rep.is_read);
      if (unreadReplies.length > 0) {
        const ids = unreadReplies.map((rep: any) => rep.id);
        await (supabase.from("messages") as any)
          .update({ is_read: true })
          .in("id", ids);
        // Update local thread state
        setThreads((prev) => prev.map((t) => t.id === thread.id ? { ...t, has_unread_reply: false } : t));
      }
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !user || !selectedThread) return;
    if (BD_PHONE_REGEX.test(replyText)) {
      toast.error("Phone numbers are not allowed in messages");
      return;
    }
    setSending(true);
    try {
      const { error } = await (supabase.from("messages") as any).insert({
        sender_id: user.id,
        vendor_id: selectedThread.vendor_id,
        product_id: selectedThread.product_id || null,
        order_id: selectedThread.order_id || null,
        message: replyText.trim(),
        parent_id: selectedThread.id,
      });
      if (error) throw error;
      setReplyText("");
      const r = await loadReplies(selectedThread.id);
      setReplies(r);
      toast.success("Message sent!");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const unreadCount = threads.filter((t) => t.has_unread_reply).length;

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          {selectedThread ? (
            <button
              onClick={() => { setSelectedThread(null); setReplies([]); setReplyText(""); loadThreads(); }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          )}
        </div>

        {/* THREAD LIST */}
        {!selectedThread && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Inbox
                {unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs">{unreadCount}</Badge>
                )}
              </h1>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : threads.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <MessageCircle className="h-14 w-14 opacity-20" />
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm text-center">Message a seller from a product page or your orders.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {threads.map((thread) => (
                  <Card
                    key={thread.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/30 ${thread.has_unread_reply ? "border-primary/40 bg-primary/5" : ""}`}
                    onClick={() => openThread(thread)}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      {/* Vendor avatar */}
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {thread.vendor?.logo_url ? (
                          <img src={thread.vendor.logo_url} alt={thread.vendor.store_name} className="h-full w-full object-cover" />
                        ) : (
                          <Store className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">
                            {thread.vendor?.store_name || "Seller"}
                          </p>
                          {thread.has_unread_reply && (
                            <Badge className="h-4 px-1.5 text-[10px] bg-primary text-primary-foreground shrink-0">New Reply</Badge>
                          )}
                        </div>

                        {thread.product && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <Package className="h-3 w-3 shrink-0" />
                            <span className="truncate">{thread.product.name}</span>
                          </div>
                        )}
                        {thread.order_id && !thread.product && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <ShoppingCart className="h-3 w-3 shrink-0" />
                            <span>Order inquiry</span>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{thread.message}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(thread.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* THREAD DETAIL */}
        {selectedThread && (
          <>
            {/* Vendor + context info */}
            <div className="mb-4 rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {selectedThread.vendor?.logo_url ? (
                  <img src={selectedThread.vendor.logo_url} alt={selectedThread.vendor.store_name} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{selectedThread.vendor?.store_name || "Seller"}</p>
                {selectedThread.product && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Package className="h-3 w-3 shrink-0" /> {selectedThread.product.name}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3 mb-4">
              {/* Original message */}
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-primary px-4 py-3 text-primary-foreground">
                  <p className="text-xs font-semibold mb-1 text-primary-foreground/70">You</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedThread.message}</p>
                  <p className="text-[10px] mt-1 text-primary-foreground/60">
                    {new Date(selectedThread.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {/* Replies */}
              {replies.map((reply) => {
                const isMe = reply.sender_id === user?.id;
                return (
                  <div key={reply.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 ${isMe
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border text-foreground rounded-tl-sm"
                    }`}>
                      <p className={`text-xs font-semibold mb-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {isMe ? "You" : (selectedThread.vendor?.store_name || "Seller")}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(reply.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {replies.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-2">Waiting for seller's reply...</p>
              )}
            </div>

            {/* Reply box */}
            <Card>
              <CardContent className="p-3 flex gap-2 items-end">
                <Textarea
                  placeholder="Write a follow-up message..."
                  rows={2}
                  className={`resize-none flex-1 ${BD_PHONE_REGEX.test(replyText) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (replyText.trim() && !BD_PHONE_REGEX.test(replyText)) handleReply();
                    }
                  }}
                />
                <Button
                  size="icon"
                  disabled={!replyText.trim() || sending || BD_PHONE_REGEX.test(replyText)}
                  onClick={handleReply}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </CardContent>
              {BD_PHONE_REGEX.test(replyText) && (
                <div className="flex items-center gap-1.5 px-3 pb-3 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Phone numbers are not allowed in messages.
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Inbox;
