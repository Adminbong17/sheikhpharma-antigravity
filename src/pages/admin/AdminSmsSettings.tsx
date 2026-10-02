import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Settings, Bell, Send, History, Loader2, TestTube, Phone } from "lucide-react";
import { format } from "date-fns";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

const AdminSmsSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["sms-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("sms_settings" as any) as any)
        .select("*").limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["sms-logs"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("sms_logs" as any) as any)
        .select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const [form, setForm] = useState<any>({});
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("এটি একটি টেস্ট SMS");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from("sms_settings" as any) as any)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-settings"] });
      toast.success("SMS সেটিংস সেভ হয়েছে!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = () => {
    const { id, ...rest } = form;
    updateMutation.mutate(rest);
  };

  const handleTestSms = async () => {
    if (!testPhone.trim()) return toast.error("ফোন নম্বর দিন");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { phone: testPhone, message: testMsg, event_type: "test" },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("টেস্ট SMS পাঠানো হয়েছে!");
      } else {
        toast.error(data?.error || "SMS পাঠাতে ব্যর্থ");
      }
      queryClient.invalidateQueries({ queryKey: ["sms-logs"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl">
      <BackButton className="mb-1" />
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">SMS Settings</h1>
          <p className="text-sm text-muted-foreground">ReveSMS API দিয়ে অটো SMS নোটিফিকেশন</p>
        </div>
      </div>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> API কনফিগারেশন
          </CardTitle>
          <CardDescription>ReveSMS / SAS Bulk SMS API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">SMS সিস্টেম চালু করুন</Label>
              <p className="text-xs text-muted-foreground">এটি বন্ধ থাকলে কোনো SMS পাঠানো হবে না</p>
            </div>
            <Switch
              checked={form.is_enabled || false}
              onCheckedChange={(v) => setForm({ ...form, is_enabled: v })}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>API URL</Label>
              <Input
                value={form.api_url || ""}
                onChange={(e) => setForm({ ...form, api_url: e.target.value })}
                placeholder="https://smpp.revesms.com:7790/sendtext"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Caller ID (Sender)</Label>
              <Input
                value={form.caller_id || ""}
                onChange={(e) => setForm({ ...form, caller_id: e.target.value })}
                placeholder="88017XXXXXXXX"
              />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input
                value={form.api_key || ""}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                placeholder="Your API Key"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Secret Key</Label>
              <Input
                type="password"
                value={form.secret_key || ""}
                onChange={(e) => setForm({ ...form, secret_key: e.target.value })}
                placeholder="Your Secret Key"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Admin ফোন নম্বর (SMS পাবেন)</Label>
            <Input
              value={form.admin_phone || ""}
              onChange={(e) => setForm({ ...form, admin_phone: e.target.value })}
              placeholder="01XXXXXXXXX"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> ইভেন্ট সেটিংস
          </CardTitle>
          <CardDescription>কোন কোন ইভেন্টে SMS যাবে তা সিলেক্ট করুন</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: "on_new_order", label: "নতুন অর্ডার আসলে" },
              { key: "on_order_confirmed", label: "অর্ডার কনফার্ম হলে" },
              { key: "on_order_shipped", label: "অর্ডার শিপ হলে" },
              { key: "on_order_delivered", label: "অর্ডার ডেলিভারি হলে" },
              { key: "on_order_cancelled", label: "অর্ডার বাতিল হলে" },
              { key: "on_payment_received", label: "পেমেন্ট পেলে" },
              { key: "on_refund_approved", label: "রিফান্ড অ্যাপ্রুভ হলে" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{label}</Label>
                <Switch
                  checked={form[key] ?? true}
                  onCheckedChange={(v) => setForm({ ...form, [key]: v })}
                />
              </div>
            ))}
          </div>

          <Separator />

          <p className="text-sm font-semibold">কাকে SMS পাঠাবে</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { key: "notify_admin", label: "Admin" },
              { key: "notify_customer", label: "Customer" },
              { key: "notify_vendor", label: "Vendor" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-sm">{label}</Label>
                <Switch
                  checked={form[key] ?? true}
                  onCheckedChange={(v) => setForm({ ...form, [key]: v })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto">
        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        সেটিংস সেভ করুন
      </Button>

      {/* Test SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" /> টেস্ট SMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>ফোন নম্বর</Label>
              <Input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>মেসেজ</Label>
              <Input value={testMsg} onChange={(e) => setTestMsg(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleTestSms} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                পাঠান
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> SMS লগ (সর্বশেষ ৫০টি)
          </CardTitle>
          {logs?.length > 0 && (
            <PrintExportButtons
              title="SMS Logs"
              columns={[
                { header: "সময়", accessor: (r: any) => format(new Date(r.created_at), "dd MMM yy, hh:mm a") },
                { header: "ফোন", accessor: (r: any) => r.phone },
                { header: "ইভেন্ট", accessor: (r: any) => r.event_type },
                { header: "স্ট্যাটাস", accessor: (r: any) => r.status },
                { header: "মেসেজ", accessor: (r: any) => r.message },
              ] as PrintColumn[]}
              data={logs}
            />
          )}
        </CardHeader>
        <CardContent>
          {!logs?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">কোনো SMS লগ নেই</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>সময়</TableHead>
                    <TableHead>ফোন</TableHead>
                    <TableHead>ইভেন্ট</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="hidden md:table-cell">মেসেজ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM yy, hh:mm a")}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{log.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{log.event_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-xs">
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs max-w-[200px] truncate">
                        {log.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSmsSettings;
