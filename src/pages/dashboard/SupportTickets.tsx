import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/hooks/useNotifications";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Plus, MessageCircle, Send, ChevronRight, Headphones, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Open", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", icon: MessageCircle },
  resolved: { label: "Resolved", color: "bg-green-500/10 text-green-600 border-green-200", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-blue-500/10 text-blue-600" },
  high: { label: "High", color: "bg-orange-500/10 text-orange-600" },
  urgent: { label: "Urgent", color: "bg-red-500/10 text-red-600" },
};

const SupportTickets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newMessage, setNewMessage] = useState("");
  const [replyText, setReplyText] = useState("");

  // Fetch tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("support_tickets" as any) as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId);

  // Fetch messages for selected ticket
  const { data: messages = [] } = useQuery({
    queryKey: ["ticket-messages", selectedTicketId],
    queryFn: async () => {
      const { data } = await (supabase.from("ticket_messages" as any) as any)
        .select("*")
        .eq("ticket_id", selectedTicketId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedTicketId,
  });

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async () => {
      if (!newSubject.trim() || !newMessage.trim()) throw new Error("Subject and message required");
      const { data: ticket, error: ticketError } = await (supabase.from("support_tickets" as any) as any)
        .insert({ user_id: user!.id, subject: newSubject.trim(), priority: newPriority })
        .select()
        .single();
      if (ticketError) throw ticketError;
      const { error: msgError } = await (supabase.from("ticket_messages" as any) as any)
        .insert({ ticket_id: ticket.id, sender_id: user!.id, body: newMessage.trim(), is_admin: false });
      if (msgError) throw msgError;
      return ticket;
    },
    onSuccess: async (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setNewSubject("");
      setNewMessage("");
      setNewPriority("normal");
      setSelectedTicketId(ticket.id);
      setView("detail");
      toast.success("Ticket created successfully!");

      // Send SMS + notification to admin
      try {
        const { data: smsSettings } = await (supabase.from("sms_settings" as any) as any)
          .select("admin_phone, is_enabled")
          .limit(1)
          .single();

        if (smsSettings?.is_enabled && smsSettings.admin_phone) {
          const { data: siteSettings } = await supabase
            .from("site_settings")
            .select("site_name")
            .limit(1)
            .single();
          const siteName = siteSettings?.site_name || "QweekBD";
          const truncatedMsg = newMessage.trim().length > 100 ? newMessage.trim().slice(0, 100) + "..." : newMessage.trim();
          const msg = `${siteName}: নতুন সাপোর্ট টিকেট!\nবিষয়: ${ticket.subject}\nমেসেজ: ${truncatedMsg}`;
          await supabase.functions.invoke("send-sms", {
            body: { phone: smsSettings.admin_phone, message: msg, event_type: "support_new_ticket" },
          });
        }

        // In-app notification
        await createNotification({
          target_role: "admin",
          title: "নতুন সাপোর্ট টিকেট",
          body: `বিষয়: ${ticket.subject}`,
          type: "info",
          action_url: "/admin/support-tickets",
        });
      } catch (e) {
        console.error("Support ticket SMS error:", e);
      }
    },
    onError: () => toast.error("Failed to create ticket"),
  });

  // Send reply
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!replyText.trim()) throw new Error("Message required");
      const { error } = await (supabase.from("ticket_messages" as any) as any)
        .insert({ ticket_id: selectedTicketId, sender_id: user!.id, body: replyText.trim(), is_admin: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", selectedTicketId] });
      setReplyText("");
    },
    onError: () => toast.error("Failed to send message"),
  });

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          {view === "list" ? (
            <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          ) : (
            <button
              onClick={() => { setView("list"); setSelectedTicketId(null); }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
        </div>

        {/* LIST VIEW */}
        {view === "list" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" /> Support Tickets
              </h1>
              <Button size="sm" onClick={() => setView("create")} className="gap-1">
                <Plus className="h-4 w-4" /> New Ticket
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : tickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <Headphones className="h-14 w-14 opacity-20" />
                  <p className="font-medium">No support tickets yet</p>
                  <p className="text-sm text-center">Need help? Open a ticket and we'll get back to you.</p>
                  <Button onClick={() => setView("create")} className="mt-2 gap-1">
                    <Plus className="h-4 w-4" /> Open a Ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket: any) => {
                  const s = statusConfig[ticket.status] || statusConfig.open;
                  const p = priorityConfig[ticket.priority] || priorityConfig.normal;
                  return (
                    <Card
                      key={ticket.id}
                      className="cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => { setSelectedTicketId(ticket.id); setView("detail"); }}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${s.color}`}>{s.label}</Badge>
                            <Badge variant="secondary" className={`text-xs ${p.color}`}>{p.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(ticket.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* CREATE VIEW */}
        {view === "create" && (
          <>
            <h1 className="mb-4 text-xl font-bold">Open New Ticket</h1>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    placeholder="Briefly describe your issue..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Describe your issue in detail..."
                    rows={5}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setView("list")}>Cancel</Button>
                  <Button
                    className="flex-1 gap-1"
                    disabled={!newSubject.trim() || !newMessage.trim() || createTicket.isPending}
                    onClick={() => createTicket.mutate()}
                  >
                    {createTicket.isPending ? "Submitting..." : <><Send className="h-4 w-4" /> Submit Ticket</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && selectedTicket && (
          <>
            <div className="mb-4">
              <h1 className="text-lg font-bold line-clamp-2">{selectedTicket.subject}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={`text-xs ${(statusConfig[selectedTicket.status] || statusConfig.open).color}`}>
                  {(statusConfig[selectedTicket.status] || statusConfig.open).label}
                </Badge>
                <Badge variant="secondary" className={`text-xs ${(priorityConfig[selectedTicket.priority] || priorityConfig.normal).color}`}>
                  {(priorityConfig[selectedTicket.priority] || priorityConfig.normal).label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  #{selectedTicket.id.slice(0, 8)}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-3 mb-4">
              {messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.is_admin ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.is_admin
                    ? "bg-card border text-foreground rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                  }`}>
                    {msg.is_admin && (
                      <p className="text-xs font-semibold mb-1 opacity-70">Support Team</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${msg.is_admin ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                      {new Date(msg.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            {selectedTicket.status !== "closed" && (
              <Card>
                <CardContent className="p-3 flex gap-2 items-end">
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
                </CardContent>
              </Card>
            )}
            {selectedTicket.status === "closed" && (
              <p className="text-center text-sm text-muted-foreground py-3">This ticket is closed.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupportTickets;
