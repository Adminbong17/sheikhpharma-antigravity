import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplets, HeartPulse, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
import { format } from "date-fns";

interface BloodRequest {
  id: string;
  name: string;
  phone: string;
  blood_group: string;
  type: string;
  location: string;
  division: string | null;
  zilla: string | null;
  upazilla: string | null;
  details: string | null;
  status: string;
  created_at: string;
}

const AdminBloodRequests = () => {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchRequests = async () => {
    setLoading(true);
    let query = (supabase as any).from("blood_requests").select("*").order("created_at", { ascending: false });
    if (filter === "need") query = query.eq("type", "need");
    if (filter === "donor") query = query.eq("type", "donor");
    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const handleDelete = async (id: string) => {
    if (!confirm("এটি ডিলিট করতে চান?")) return;
    await (supabase as any).from("blood_requests").delete().eq("id", id);
    toast.success("ডিলিট হয়েছে");
    fetchRequests();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await (supabase as any).from("blood_requests").update({ status }).eq("id", id);
    toast.success("স্ট্যাটাস আপডেট হয়েছে");
    fetchRequests();
  };

  const needCount = requests.filter(r => r.type === "need").length;
  const donorCount = requests.filter(r => r.type === "donor").length;

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <BackButton className="mb-1" />
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <Droplets className="h-6 w-6 text-red-500" /> ব্লাড ব্যাংক ম্যানেজমেন্ট
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <Card 
          className={`cursor-pointer transition-all border-2 ${filter === "need" ? "border-red-500 bg-red-50 shadow-md" : "border-red-200 hover:border-red-400"}`}
          onClick={() => setFilter(filter === "need" ? "all" : "need")}
        >
          <CardContent className="p-4 text-center">
            <HeartPulse className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{needCount}</p>
            <p className="text-xs text-muted-foreground">রক্তের প্রয়োজন</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all border-2 ${filter === "donor" ? "border-teal-500 bg-teal-50 shadow-md" : "border-teal-200 hover:border-teal-400"}`}
          onClick={() => setFilter(filter === "donor" ? "all" : "donor")}
        >
          <CardContent className="p-4 text-center">
            <User className="h-6 w-6 text-teal-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-teal-600">{donorCount}</p>
            <p className="text-xs text-muted-foreground">রক্তদাতা</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all border-2 ${filter === "all" ? "border-blue-500 bg-blue-50 shadow-md" : "border-blue-200 hover:border-blue-400"}`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="p-4 text-center">
            <Droplets className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{requests.length}</p>
            <p className="text-xs text-muted-foreground">মোট</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</p>
      ) : requests.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">কোনো ডাটা নেই</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>ফোন</TableHead>
                  <TableHead>গ্রুপ</TableHead>
                  <TableHead>লোকেশন</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{format(new Date(r.created_at), "dd MMM yy")}</TableCell>
                    <TableCell>
                      <Badge variant={r.type === "need" ? "destructive" : "secondary"} className={r.type === "donor" ? "bg-teal-100 text-teal-700" : ""}>
                        {r.type === "need" ? "প্রয়োজন" : "দাতা"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <a href={`tel:${r.phone}`} className="text-primary underline">{r.phone}</a>
                    </TableCell>
                    <TableCell><span className="text-lg font-bold text-red-600">{r.blood_group}</span></TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      {[r.upazilla, r.zilla, r.division].filter(Boolean).join(", ") || "-"}
                      {r.location && <p className="text-foreground font-medium mt-0.5">🏥 {r.location}</p>}
                      {r.details && <p className="text-muted-foreground mt-0.5">{r.details}</p>}
                    </TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v)}>
                        <SelectTrigger className="h-8 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {requests.map((r) => (
              <Card key={r.id} className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.type === "need" ? "destructive" : "secondary"} className={r.type === "donor" ? "bg-teal-100 text-teal-700" : ""}>
                      {r.type === "need" ? "প্রয়োজন" : "দাতা"}
                    </Badge>
                    <span className="text-xl font-bold text-red-600">{r.blood_group}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM yy")}</span>
                </div>
                <p className="font-medium">{r.name}</p>
                <a href={`tel:${r.phone}`} className="text-sm text-primary underline">{r.phone}</a>
                <p className="text-xs text-muted-foreground mt-1">
                  {[r.upazilla, r.zilla, r.division].filter(Boolean).join(", ")}
                </p>
                {r.location && <p className="text-xs font-medium mt-0.5">🏥 {r.location}</p>}
                {r.details && <p className="text-xs text-muted-foreground">{r.details}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v)}>
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminBloodRequests;
