import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Printer, Search, Monitor, Globe, RefreshCw, FileText, Filter, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

const VendorActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs(data || []);
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
      l.ip_address?.toLowerCase().includes(q) ||
      l.device_info?.toLowerCase().includes(q);
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    const cutoff = getDateCutoff(dateFilter);
    const matchesDate = !cutoff || new Date(l.created_at) >= cutoff;
    return matchesSearch && matchesAction && matchesDate;
  });

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
      <h1>My Activity Log</h1>
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
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Activity Log</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 sm:w-64">
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
          <Button variant="outline" size="icon" onClick={fetchLogs}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Print All</Button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No activity logs found</p>
        ) : filtered.map((l) => (
          <div key={l.id} className="rounded-lg border bg-card p-3 space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{l.action}</Badge>
              <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
            </div>
            {l.details && <p className="text-xs text-muted-foreground line-clamp-2">{l.details}</p>}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {l.device_info && <span className="flex items-center gap-0.5"><Monitor className="h-2.5 w-2.5" />{l.device_info.substring(0, 30)}</span>}
              {l.ip_address && <span className="font-mono">{l.ip_address}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="rounded-lg border bg-card hidden sm:block" ref={printRef}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead><Monitor className="inline h-4 w-4 mr-1" />Device</TableHead>
              <TableHead><MapPin className="inline h-4 w-4 mr-1" />Location</TableHead>
              <TableHead><Globe className="inline h-4 w-4 mr-1" />IP</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No activity logs found</TableCell></TableRow>
            ) : filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell><Badge variant="secondary">{l.action}</Badge></TableCell>
                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{l.details || "—"}</TableCell>
                <TableCell className="text-xs">{l.device_info || "—"}</TableCell>
                <TableCell className="text-xs">{l.location || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{l.ip_address || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handlePrintRow(l)} title="Print this entry">
                    <FileText className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VendorActivityLog;
