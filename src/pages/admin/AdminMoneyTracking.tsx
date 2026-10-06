import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Users, Banknote, UserPlus } from "lucide-react";
import PrintExportButtons from "@/components/PrintExportButtons";

type MoneyHolder = { id: string; name: string; phone: string | null; created_at: string };
type TrackingEntry = {
  id: string; order_id: string; holder_id: string; amount: number;
  notes: string | null; tracking_date: string; created_at: string;
  orders: { order_number: number; customer_name: string | null; total: number; status: string } | null;
  money_holders: { name: string } | null;
};

export default function AdminMoneyTracking() {
  const qc = useQueryClient();
  const [holderDialog, setHolderDialog] = useState(false);
  const [trackingDialog, setTrackingDialog] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [holderPhone, setHolderPhone] = useState("");
  const [selectedHolder, setSelectedHolder] = useState("");
  const [selectedOrder, setSelectedOrder] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [filterHolder, setFilterHolder] = useState("all");

  const { data: holders = [] } = useQuery({
    queryKey: ["money-holders"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("money_holders" as any) as any)
        .select("*").order("name");
      if (error) throw error;
      return data as MoneyHolder[];
    },
  });

  const { data: trackingEntries = [] } = useQuery({
    queryKey: ["order-money-tracking"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("order_money_tracking" as any) as any)
        .select("*, orders(order_number, customer_name, total, status), money_holders(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TrackingEntry[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders-for-tracking"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id, order_number, customer_name, total, status")
        .order("order_number", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const addHolder = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("money_holders" as any) as any)
        .insert({ name: holderName.trim(), phone: holderPhone.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["money-holders"] });
      setHolderDialog(false); setHolderName(""); setHolderPhone("");
      toast.success("ব্যক্তি যোগ করা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteHolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("money_holders" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["money-holders"] });
      qc.invalidateQueries({ queryKey: ["order-money-tracking"] });
      toast.success("ব্যক্তি মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTracking = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("order_money_tracking" as any) as any).insert({
        order_id: selectedOrder, holder_id: selectedHolder,
        amount: parseFloat(amount), notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-money-tracking"] });
      setTrackingDialog(false); setSelectedHolder(""); setSelectedOrder("");
      setAmount(""); setNotes("");
      toast.success("এন্ট্রি যোগ করা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTracking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("order_money_tracking" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-money-tracking"] });
      toast.success("এন্ট্রি মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = filterHolder === "all"
    ? trackingEntries
    : trackingEntries.filter(e => e.holder_id === filterHolder);

  // Summary per holder
  const holderSummary = holders.map(h => {
    const entries = trackingEntries.filter(e => e.holder_id === h.id);
    const total = entries.reduce((s, e) => s + Number(e.amount), 0);
    return { ...h, total, count: entries.length };
  }).filter(h => h.count > 0);

  const grandTotal = holderSummary.reduce((s, h) => s + h.total, 0);

  const exportData = filtered.map(e => ({
    "Order #": e.orders?.order_number || "",
    "Customer": e.orders?.customer_name || "",
    "Holder": e.money_holders?.name || "",
    "Amount": e.amount,
    "Notes": e.notes || "",
    "Date": e.tracking_date,
  }));

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-xl font-bold">💰 টাকা ট্র্যাকিং</h1>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={holderDialog} onOpenChange={setHolderDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><UserPlus className="w-4 h-4 mr-1" /> ব্যক্তি যোগ</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>নতুন ব্যক্তি যোগ করুন</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>নাম *</Label><Input value={holderName} onChange={e => setHolderName(e.target.value)} placeholder="ব্যক্তির নাম" /></div>
                <div><Label>ফোন</Label><Input value={holderPhone} onChange={e => setHolderPhone(e.target.value)} placeholder="01XXXXXXXXX" /></div>
                <Button onClick={() => addHolder.mutate()} disabled={!holderName.trim() || addHolder.isPending} className="w-full">
                  {addHolder.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={trackingDialog} onOpenChange={setTrackingDialog}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> এন্ট্রি যোগ</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>টাকা ট্র্যাকিং এন্ট্রি</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>অর্ডার *</Label>
                  <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                    <SelectTrigger><SelectValue placeholder="অর্ডার সিলেক্ট করুন" /></SelectTrigger>
                    <SelectContent>
                      {orders.filter(o => !trackingEntries.some(e => e.order_id === o.id)).map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          #{o.order_number} - {o.customer_name || "N/A"} (৳{o.total})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ব্যক্তি *</Label>
                  <Select value={selectedHolder} onValueChange={setSelectedHolder}>
                    <SelectTrigger><SelectValue placeholder="ব্যক্তি সিলেক্ট করুন" /></SelectTrigger>
                    <SelectContent>
                      {holders.map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>টাকার পরিমাণ *</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></div>
                <div><Label>নোট</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="অতিরিক্ত তথ্য" /></div>
                <Button onClick={() => addTracking.mutate()} disabled={!selectedOrder || !selectedHolder || !amount || addTracking.isPending} className="w-full">
                  {addTracking.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <PrintExportButtons
            title="টাকা ট্র্যাকিং"
            columns={[
              { header: "অর্ডার #", accessor: (r: any) => r["Order #"] },
              { header: "কাস্টমার", accessor: (r: any) => r["Customer"] },
              { header: "ব্যক্তি", accessor: (r: any) => r["Holder"] },
              { header: "টাকা", accessor: (r: any) => r["Amount"] },
              { header: "নোট", accessor: (r: any) => r["Notes"] },
              { header: "তারিখ", accessor: (r: any) => r["Date"] },
            ]}
            data={exportData}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card className="border-primary/30">
          <CardContent className="p-3 text-center">
            <Banknote className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">মোট টাকা</p>
            <p className="text-lg font-bold">৳{grandTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
        {holderSummary.map(h => (
          <Card key={h.id}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground truncate">{h.name}</p>
              <p className="text-lg font-bold">৳{h.total.toLocaleString()}</p>
              <Badge variant="secondary" className="text-[10px]">{h.count} অর্ডার</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tracking">
        <TabsList>
          <TabsTrigger value="tracking">ট্র্যাকিং</TabsTrigger>
          <TabsTrigger value="holders"><Users className="w-4 h-4 mr-1" /> ব্যক্তি তালিকা</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">ফিল্টার:</Label>
            <Select value={filterHolder} onValueChange={setFilterHolder}>
              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সবাই</SelectItem>
                {holders.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {filtered.map(e => (
              <Card key={e.id}>
                <CardContent className="p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">#{e.orders?.order_number}</span>
                    <Badge>{e.money_holders?.name}</Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{e.orders?.customer_name || "N/A"}</span>
                    <span className="font-bold text-foreground">৳{Number(e.amount).toLocaleString()}</span>
                  </div>
                  {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">{e.tracking_date}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteTracking.mutate(e.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">কোনো এন্ট্রি নেই</p>}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block rounded-xl border bg-card shadow-xs overflow-hidden" id="money-tracking-table">
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>অর্ডার #</TableHead>
                    <TableHead>কাস্টমার</TableHead>
                    <TableHead>ব্যক্তি</TableHead>
                    <TableHead className="text-right">টাকা</TableHead>
                    <TableHead>নোট</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">#{e.orders?.order_number}</TableCell>
                      <TableCell>{e.orders?.customer_name || "N/A"}</TableCell>
                      <TableCell><Badge variant="outline">{e.money_holders?.name}</Badge></TableCell>
                      <TableCell className="text-right font-bold">৳{Number(e.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{e.notes || "-"}</TableCell>
                      <TableCell className="text-xs">{e.tracking_date}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => deleteTracking.mutate(e.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো এন্ট্রি নেই</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="holders">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {holders.map(h => (
              <Card key={h.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{h.name}</p>
                    {h.phone && <p className="text-xs text-muted-foreground">{h.phone}</p>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteHolder.mutate(h.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {holders.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">কোনো ব্যক্তি যোগ করা হয়নি</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
