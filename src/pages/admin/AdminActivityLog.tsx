import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Printer, Search, Monitor, Globe, RefreshCw, FileText, Filter, MapPin, Undo2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import { restoreFromTrash } from "@/lib/trash";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: string | null;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  device_info: string | null;
  location: string | null;
  created_at: string;
  user_email?: string;
}

const DELETE_ACTIONS = [
  "product_deleted", "order_hard_deleted", "brand_deleted", "category_deleted",
  "coupon_deleted", "hero_slide_deleted", "vendor_deleted", "user_deleted",
  "subcategory_deleted", "static_page_deleted", "staff_deleted",
  "delivery_zone_deleted", "section_deleted", "incomplete_order_deleted",
];

const AdminActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [trashMap, setTrashMap] = useState<Record<string, string>>({});
  const printRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const logData = data || [];
    const userIds = [...new Set(logData.map((l) => l.user_id))];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      const emailMap = new Map((profiles || []).map((p) => [p.user_id, p.email]));
      setLogs(logData.map((l) => ({ ...l, user_email: emailMap.get(l.user_id) || "Unknown" })));
    } else {
      setLogs([]);
    }

    const { data: trashData } = await supabase
      .from("trash" as any)
      .select("id, record_id, restored_at")
      .is("restored_at", null) as any;
    
    const map: Record<string, string> = {};
    (trashData || []).forEach((t: any) => {
      map[t.record_id] = t.id;
    });
    setTrashMap(map);

    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const uniqueActions = [...new Set(logs.map((l) => l.action))].sort();

  const getDateCutoff = (filter: string) => {
    const now = new Date();
    if (filter === "today") return new Date(now.setHours(0, 0, 0, 0));
    if (filter === "week") return new Date(now.getTime() - 7 * 86400000);
    if (filter === "month") return new Date(now.getTime() - 30 * 86400000);
    return null;
  };

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      l.action.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q) ||
      l.user_email?.toLowerCase().includes(q) ||
      l.ip_address?.toLowerCase().includes(q) ||
      l.device_info?.toLowerCase().includes(q);
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    const cutoff = getDateCutoff(dateFilter);
    const matchesDate = !cutoff || new Date(l.created_at) >= cutoff;
    return matchesSearch && matchesAction && matchesDate;
  });

  const isDeleteAction = (action: string) => DELETE_ACTIONS.includes(action) || action.toLowerCase().includes("deleted");

  const handleUndo = async (log: ActivityLog) => {
    if (!log.entity_id) return;
    const trashId = trashMap[log.entity_id];
    if (!trashId) {
      toast.error("Trash record not found for this item");
      return;
    }
    setRestoringId(log.id);
    try {
      await restoreFromTrash(trashId);
      toast.success("Successfully restored!");
      fetchLogs();
    } catch (e: any) {
      toast.error(e.message || "Restore failed");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Activity Log</title>
      <style>
        body { font-family: 'Comic Sans MS', sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        h1 { font-size: 18px; margin-bottom: 10px; }
        .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
      </style></head><body>
      <h1>Activity Log Report</h1>
      <p class="meta">Generated: ${new Date().toLocaleString()} | Total: ${filtered.length} entries</p>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const handlePrintRow = (l: ActivityLog) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Activity Log Entry</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; width: 120px; }
        h1 { font-size: 18px; margin-bottom: 10px; }
        .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
      </style></head><body>
      <h1>Activity Log Entry</h1>
      <p class="meta">Generated: ${new Date().toLocaleString()}</p>
      <table>
        <tr><th>User</th><td>${l.user_email || "—"}</td></tr>
        <tr><th>Action</th><td>${l.action}</td></tr>
        <tr><th>Details</th><td>${l.details || "—"}</td></tr>
        <tr><th>Device</th><td>${l.device_info || "—"}</td></tr>
        <tr><th>IP Address</th><td>${l.ip_address || "—"}</td></tr>
        <tr><th>Time</th><td>${new Date(l.created_at).toLocaleString()}</td></tr>
      </table>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-3" />
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Activity Log</h1>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={fetchLogs}><RefreshCw className="h-4 w-4" /></Button>
            <PrintExportButtons
              title="Activity Log"
              columns={[
                { header: "User", accessor: (l) => l.user_email || "—" },
                { header: "Action", accessor: (l) => l.action },
                { header: "Details", accessor: (l) => l.details || "—" },
                { header: "IP", accessor: (l) => l.ip_address || "—" },
                { header: "Device", accessor: (l) => l.device_info || "—" },
                { header: "Time", accessor: (l) => new Date(l.created_at).toLocaleString() },
              ] satisfies PrintColumn[]}
              data={filtered}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-1" /><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No activity logs found</p>
        ) : filtered.map((l) => (
          <div key={l.id} className="rounded-lg border bg-card p-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <Badge variant={isDeleteAction(l.action) ? "destructive" : "secondary"} className="text-[10px] shrink-0">{l.action}</Badge>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{l.user_email}</p>
            {l.details && <p className="text-xs text-muted-foreground line-clamp-2">{l.details}</p>}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                {l.device_info && <span className="flex items-center gap-0.5"><Monitor className="h-3 w-3" />{l.device_info}</span>}
                {l.ip_address && <span className="font-mono">{l.ip_address}</span>}
              </div>
              <div className="flex gap-0.5">
                {isDeleteAction(l.action) && l.entity_id && trashMap[l.entity_id] && (
                  <Button variant="outline" size="icon" className="h-6 w-6 text-primary" onClick={() => handleUndo(l)} disabled={restoringId === l.id}>
                    <Undo2 className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePrintRow(l)}>
                  <FileText className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="rounded-lg border bg-card overflow-x-auto hidden sm:block" ref={printRef}>
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="px-2 py-2">User</TableHead>
              <TableHead className="px-2 py-2">Action</TableHead>
              <TableHead className="px-2 py-2">Details</TableHead>
              <TableHead className="px-2 py-2"><Monitor className="inline h-3 w-3 mr-1" />Device</TableHead>
              <TableHead className="px-2 py-2"><MapPin className="inline h-3 w-3 mr-1" />Location</TableHead>
              <TableHead className="px-2 py-2"><Globe className="inline h-3 w-3 mr-1" />IP</TableHead>
              <TableHead className="px-2 py-2">Time</TableHead>
              <TableHead className="px-2 py-2 w-14"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
             ) : filtered.length === 0 ? (
               <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No activity logs found</TableCell></TableRow>
             ) : filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="px-2 py-1.5 truncate max-w-[120px]">{l.user_email}</TableCell>
                <TableCell className="px-2 py-1.5"><Badge variant={isDeleteAction(l.action) ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">{l.action}</Badge></TableCell>
                <TableCell className="px-2 py-1.5 max-w-[150px] truncate text-muted-foreground">{l.details || "—"}</TableCell>
                <TableCell className="px-2 py-1.5 truncate max-w-[100px]">{l.device_info || "—"}</TableCell>
                <TableCell className="px-2 py-1.5">{l.location || "—"}</TableCell>
                <TableCell className="px-2 py-1.5 font-mono">{l.ip_address || "—"}</TableCell>
                <TableCell className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  <div className="flex gap-0.5">
                    {isDeleteAction(l.action) && l.entity_id && trashMap[l.entity_id] && (
                      <Button variant="outline" size="icon" className="h-6 w-6 text-primary" onClick={() => handleUndo(l)} disabled={restoringId === l.id} title="Undo (Restore)">
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePrintRow(l)} title="Print this entry">
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminActivityLog;
