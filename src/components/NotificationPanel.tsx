import { Bell, CheckCheck, X, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface NotificationPanelProps {
  role: "admin" | "vendor" | "user";
  title?: string;
}

const typeIcons: Record<string, string> = {
  order: "🛒",
  refund: "↩️",
  payout: "💰",
  vendor: "🏪",
  review: "⭐",
  coupon: "🎟️",
  info: "ℹ️",
  warning: "⚠️",
};

const NotificationPanel = ({ role, title = "Notifications" }: NotificationPanelProps) => {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications(role);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleAction = (url: string, id: string) => {
    if (!notifications.find((n) => n.id === id)?.is_read) {
      markRead.mutate(id);
    }
    navigate(url);
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
          {unreadCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-xs px-1.5">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => { markAllRead.mutate(role); toast.success("সব পড়া হিসেবে চিহ্নিত"); }}
          >
            <CheckCheck className="h-3.5 w-3.5" /> সব পড়ুন
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Bell className="h-10 w-10 opacity-20" />
            <p className="text-sm">কোনো নোটিফিকেশন নেই</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${!n.is_read ? "bg-destructive/5 border-destructive/20" : "bg-card"}`}
              >
                <span className="text-lg shrink-0 mt-0.5">{typeIcons[n.type] || typeIcons.info}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {!n.is_read && <Badge className="h-4 px-1.5 text-[10px] bg-destructive text-destructive-foreground">New</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  {n.action_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1.5 text-xs h-7 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleAction(n.action_url!, n.id)}
                    >
                      <ExternalLink className="h-3 w-3" /> বিস্তারিত দেখুন
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.is_read && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead.mutate(n.id)} title="Mark as read">
                      <CheckCheck className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteNotif.mutate(n.id)} title="Delete">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPanel;
