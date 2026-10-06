import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BackButton from "@/components/BackButton";

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  in_progress: { label: "In Progress", color: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  resolved: { label: "Resolved", color: "bg-green-500/10 text-green-600 border-green-200" },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground border-border" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-blue-500/10 text-blue-600" },
  high: { label: "High", color: "bg-orange-500/10 text-orange-600" },
  urgent: { label: "Urgent", color: "bg-red-500/10 text-red-600" },
};

const AdminSupportTickets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const { data: ticketData } = await (supabase.from("support_tickets" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (!ticketData || ticketData.length === 0) return [];

      // Fetch profiles separately to avoid RLS join issues
      const userIds = [...new Set(ticketData.map((t: any) => t.user_id))];
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, username, email")
        .in("user_id", userIds as string[]);

      const profileMap = (profileData || []).reduce((acc: any, p: any) => {
        acc[p.user_id] = p;
        return acc;
      }, {});

      return ticketData.map((t: any) => ({ ...t, profile: profileMap[t.user_id] || null }));
    },
  });

  const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId);

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-ticket-messages", selectedTicketId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("ticket_messages" as any) as any)
        .select("*")
        .eq("ticket_id", selectedTicketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTicketId,
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!replyText.trim() || !user) throw new Error("Message required");
      const { error } = await (supabase.from("ticket_messages" as any) as any).insert({
        ticket_id: selectedTicketId,
        sender_id: user.id,
        body: replyText.trim(),
        is_admin: true,
      });
      if (error) throw error;
      // Auto set to in_progress if open
      if (selectedTicket?.status === "open") {
        await (supabase.from("support_tickets" as any) as any)
          .update({ status: "in_progress" })
          .eq("id", selectedTicketId);
      }

      // Send SMS notification to customer
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, username")
          .eq("user_id", selectedTicket.user_id)
          .single();

        if (profile?.phone) {
          const { data: siteSettings } = await supabase
            .from("site_settings")
            .select("site_name")
            .limit(1)
            .single();
          const siteName = siteSettings?.site_name || "QweekBD";
          const truncatedReply = replyText.trim().length > 100 ? replyText.trim().slice(0, 100) + "..." : replyText.trim();
          const msg = `${siteName}: আপনার সাপোর্ট টিকেটে "${selectedTicket.subject}" রিপ্লাই:\n${truncatedReply}`;
          await supabase.functions.invoke("send-sms", {
            body: { phone: profile.phone, message: msg, event_type: "support_reply" },
          });
        }

        // Also send in-app notification
        await (supabase.from("notifications" as any) as any).insert({
          user_id: selectedTicket.user_id,
          target_role: "user",
          title: "সাপোর্ট টিকেটে রিপ্লাই",
          body: `আপনার টিকেট "${selectedTicket.subject}" এ নতুন রিপ্লাই এসেছে।`,
          type: "info",
          action_url: "/dashboard/support",
        });
      } catch (e) {
        console.error("Support reply SMS error:", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      setReplyText("");
      toast.success("Reply sent!");
    },
    onError: () => toast.error("Failed to send reply"),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await (supabase.from("support_tickets" as any) as any)
        .update({ status })
        .eq("id", selectedTicketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success("Ticket status updated");
    },
  });

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <Badge variant="secondary">{tickets.length} tickets</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
        {/* Ticket list */}
        <div className="lg:col-span-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <MessageCircle className="h-10 w-10 opacity-20" />
              <p className="text-sm">No support tickets yet</p>
            </div>
          ) : (
            tickets.map((ticket: any) => {
              const s = statusConfig[ticket.status] || statusConfig.open;
              const p = priorityConfig[ticket.priority] || priorityConfig.normal;
              const isSelected = selectedTicketId === ticket.id;
              return (
                <Card
                  key={ticket.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/30 ${isSelected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <CardContent className="p-3 space-y-1.5">
                    <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ticket.profile?.username || ticket.profile?.email || "Unknown user"}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-xs ${s.color}`}>{s.label}</Badge>
                      <Badge variant="secondary" className={`text-xs ${p.color}`}>{p.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ticket.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Ticket detail */}
        <div className="lg:col-span-2 flex flex-col">
          {!selectedTicket ? (
            <Card className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 opacity-20 mx-auto mb-2" />
                <p>Select a ticket to view details</p>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="border-b pb-3 flex-none">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{selectedTicket.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedTicket.profile?.username || selectedTicket.profile?.email || "Unknown user"}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Select value={selectedTicket.status} onValueChange={(v) => updateStatus.mutate(v)}>
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.is_admin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.is_admin
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                    }`}>
                      {!msg.is_admin && (
                        <p className="text-xs font-semibold mb-1 opacity-70">Customer</p>
                      )}
                      {msg.is_admin && (
                        <p className="text-xs font-semibold mb-1 text-primary-foreground/70">Support Team</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${msg.is_admin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              {selectedTicket.status !== "closed" && (
                <div className="border-t p-3 flex gap-2 items-end flex-none">
                  <Textarea
                    placeholder="Type your reply..."
                    rows={2}
                    className="resize-none flex-1"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim()) sendReply.mutate();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    disabled={!replyText.trim() || sendReply.isPending}
                    onClick={() => sendReply.mutate()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {selectedTicket.status === "closed" && (
                <p className="text-center text-sm text-muted-foreground py-3 border-t">This ticket is closed.</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportTickets;
