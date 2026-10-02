import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageCircle, Send, ChevronDown, ChevronUp, Store, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

const AdminMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // New message dialog
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const loadMessages = async () => {
    setLoading(true);
    // Get all root messages with vendor info
    const { data } = await (supabase.from("messages" as any) as any)
      .select("*")
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Fetch vendor names
      const vendorIds = [...new Set(data.map((m: any) => m.vendor_id))] as string[];
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("id, store_name")
        .in("id", vendorIds);
      const vendorMap = new Map((vendorData || []).map(v => [v.id, v.store_name]));

      // Fetch sender profiles
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, username")
        .in("user_id", senderIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Check which senders are admins
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", senderIds as string[])
        .eq("role", "admin");
      const adminSet = new Set((adminRoles || []).map(r => r.user_id));

      setMessages(data.map((m: any) => ({
        ...m,
        vendor_name: vendorMap.get(m.vendor_id) || "Unknown",
        sender_profile: profileMap.get(m.sender_id),
        is_admin_sender: adminSet.has(m.sender_id),
      })));
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

    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map((r: any) => r.sender_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, username")
        .in("user_id", senderIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", senderIds as string[])
        .eq("role", "admin");
      const adminSet = new Set((adminRoles || []).map(r => r.user_id));

      // Check vendor user_ids
      const { data: vendorUsers } = await supabase
        .from("vendors")
        .select("user_id")
        .in("user_id", senderIds as string[]);
      const vendorUserSet = new Set((vendorUsers || []).map(v => v.user_id));

      return data.map((r: any) => ({
        ...r,
        sender_profile: profileMap.get(r.sender_id),
        is_admin_sender: adminSet.has(r.sender_id),
        is_vendor_sender: vendorUserSet.has(r.sender_id),
      }));
    }
    return [];
  };

  useEffect(() => { loadMessages(); }, []);

  const handleExpand = async (msg: any) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
      return;
    }
    if (!msg.is_read) {
      await (supabase.from("messages" as any) as any).update({ is_read: true }).eq("id", msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
    const replies = await loadReplies(msg.id);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, replies } : m));
    setExpandedId(msg.id);
  };

  const handleReply = async (parentMsg: any) => {
    const text = replyText[parentMsg.id]?.trim();
    if (!text || !user) return;

    setReplying(parentMsg.id);
    try {
      const { error } = await (supabase.from("messages" as any) as any).insert({
        sender_id: user.id,
        vendor_id: parentMsg.vendor_id,
        product_id: parentMsg.product_id || null,
        order_id: parentMsg.order_id || null,
        message: text,
        parent_id: parentMsg.id,
      });
      if (error) throw error;
      toast.success("Reply sent!");
      setReplyText(prev => ({ ...prev, [parentMsg.id]: "" }));
      const replies = await loadReplies(parentMsg.id);
      setMessages(prev => prev.map(m => m.id === parentMsg.id ? { ...m, replies } : m));
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setReplying(null);
    }
  };

  const openNewMessage = async () => {
    const { data } = await supabase.from("vendors").select("id, store_name").eq("status", "approved").order("store_name");
    setVendors(data || []);
    setSelectedVendorId("");
    setNewMessage("");
    setNewMsgOpen(true);
  };

  const handleSendNew = async () => {
    if (!selectedVendorId || !newMessage.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await (supabase.from("messages" as any) as any).insert({
        sender_id: user.id,
        vendor_id: selectedVendorId,
        message: newMessage.trim(),
      });
      if (error) throw error;
      toast.success("Message sent to vendor!");
      setNewMsgOpen(false);
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const getSenderLabel = (item: any) => {
    if (item.is_admin_sender) return "Admin";
    if (item.is_vendor_sender) return "Vendor";
    return "Customer";
  };

  const filtered = messages.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.vendor_name?.toLowerCase().includes(q) ||
      m.message?.toLowerCase().includes(q) ||
      m.sender_profile?.email?.toLowerCase().includes(q);
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-4xl mx-auto">
      <BackButton className="mb-1" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Vendor Messages</h1>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Button size="sm" onClick={openNewMessage} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Message
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <MessageCircle className="h-14 w-14 opacity-20" />
          <p className="font-medium">No messages</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(msg => (
            <Card key={msg.id} className={`overflow-hidden ${!msg.is_read ? "border-primary/50 bg-primary/5" : ""}`}>
              <CardContent className="p-0">
                <button
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => handleExpand(msg)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    {msg.is_admin_sender ? (
                      <span className="text-xs font-bold text-primary">A</span>
                    ) : (
                      <MessageCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {msg.is_admin_sender ? "Admin → " : "Customer → "}{msg.vendor_name}
                      </Badge>
                      {!msg.is_read && <Badge className="h-4 px-1.5 text-[10px] bg-primary text-primary-foreground">New</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(msg.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm mt-1 line-clamp-2">{msg.message}</p>
                  </div>
                  {expandedId === msg.id ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>

                {expandedId === msg.id && (
                  <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
                    <div className="rounded-lg bg-card border px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        {msg.is_admin_sender ? "Admin" : `Customer (${msg.sender_profile?.email || "unknown"})`}
                      </p>
                      <p className="text-sm">{msg.message}</p>
                    </div>

                    {msg.replies && msg.replies.length > 0 && (
                      <div className="space-y-2">
                        {msg.replies.map((reply: any) => (
                          <div key={reply.id} className={`rounded-lg px-3 py-2 border ${
                            reply.is_admin_sender ? "bg-primary/10 border-primary/20 ml-4"
                            : reply.is_vendor_sender ? "bg-green-500/10 border-green-500/20"
                            : "bg-card"
                          }`}>
                            <p className="text-xs text-muted-foreground mb-1">
                              {getSenderLabel(reply)} ·{" "}
                              {new Date(reply.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="text-sm">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Textarea
                        placeholder="Reply as Admin..."
                        value={replyText[msg.id] || ""}
                        onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        rows={2}
                      />
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleReply(msg)}
                        disabled={replying === msg.id || !replyText[msg.id]?.trim()}
                      >
                        <Send className="h-3.5 w-3.5" />
                        {replying === msg.id ? "Sending..." : "Reply as Admin"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Message Dialog */}
      <Dialog open={newMsgOpen} onOpenChange={setNewMsgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Send Message to Vendor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Vendor</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        <Store className="h-3.5 w-3.5" />
                        {v.store_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Write your message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNewMsgOpen(false)}>Cancel</Button>
              <Button onClick={handleSendNew} disabled={sending || !selectedVendorId || !newMessage.trim()}>
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMessages;
