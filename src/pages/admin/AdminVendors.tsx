import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Ban, Store, Plus, Pencil, Trash2, ExternalLink, Upload, Image as ImageIcon, Search, Printer } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import BackButton from "@/components/BackButton";

const AdminVendors = () => {
  const navigate = useNavigate();
  const { data: siteSettings } = useSiteSettings();
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [form, setForm] = useState({
    store_name: "", store_description: "", phone: "", address: "", logo_url: "", commission_rate: 0,
  });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const printVendorWithLetterhead = (v: any) => {
    const w = window.open("", "_blank");
    if (!w) return;
    const siteName = siteSettings?.site_name || "Admin";
    const logoUrl = siteSettings?.logo_url || "";
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${siteName}" style="height:48px;object-fit:contain;" />`
      : `<span style="font-size:24px;font-weight:800;color:#333;">${siteName}</span>`;

    w.document.write(`<!DOCTYPE html><html><head><title>${v.store_name} — Vendor Profile</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#333;padding:0}
  .letterhead{border-bottom:3px solid #2563eb;padding:24px 32px;display:flex;align-items:center;justify-content:space-between}
  .letterhead .right{text-align:right;font-size:11px;color:#666;line-height:1.6}
  .content{padding:28px 32px}
  h2{font-size:18px;color:#1e40af;margin:0 0 16px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
  .vendor-header{display:flex;align-items:center;gap:16px;margin-bottom:24px}
  .vendor-header img{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb}
  .vendor-header .placeholder{width:64px;height:64px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:28px;color:#2563eb;font-weight:700}
  .vendor-header .info h1{font-size:22px;margin-bottom:2px}
  .vendor-header .info .status{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;text-transform:uppercase}
  .status-approved{background:#dcfce7;color:#166534}
  .status-pending{background:#fef9c3;color:#854d0e}
  .status-rejected{background:#fecaca;color:#991b1b}
  .status-suspended{background:#f3f4f6;color:#6b7280}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 32px;margin-bottom:24px}
  .grid .item{font-size:13px}
  .grid .item .label{font-weight:600;color:#555;margin-bottom:2px}
  .grid .item .value{color:#111}
  .desc{font-size:13px;color:#444;margin-bottom:24px;line-height:1.5;background:#f9fafb;padding:12px;border-radius:6px}
  .footer{margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:10px;color:#999;text-align:center}
  @media print{
    body{padding:0}
    .letterhead{padding:16px 24px}
    .content{padding:20px 24px}
  }
</style></head><body>
<div class="letterhead">
  <div>${logoHtml}</div>
  <div class="right">
    <div style="font-weight:600;">${siteName}</div>
    <div>Vendor Profile Report</div>
    <div>${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
</div>
<div class="content">
  <div class="vendor-header">
    ${v.logo_url ? `<img src="${v.logo_url}" alt="${v.store_name}" />` : `<div class="placeholder">${v.store_name.charAt(0)}</div>`}
    <div class="info">
      <h1>${v.store_name}</h1>
      <span class="status status-${v.status}">${v.status}</span>
    </div>
  </div>

  <h2>Store Information</h2>
  <div class="grid">
    <div class="item"><div class="label">Owner Email</div><div class="value">${v.profile?.email || "—"}</div></div>
    <div class="item"><div class="label">Phone</div><div class="value">${v.phone || "—"}</div></div>
    <div class="item"><div class="label">Address</div><div class="value">${v.address || "—"}</div></div>
    <div class="item"><div class="label">Commission Rate</div><div class="value">${v.commission_rate ?? 0}%</div></div>
    <div class="item"><div class="label">Status</div><div class="value">${v.status}</div></div>
    <div class="item"><div class="label">Joined Date</div><div class="value">${new Date(v.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div></div>
  </div>

  ${v.store_description ? `<h2>Description</h2><div class="desc">${v.store_description}</div>` : ""}

  <div class="footer">Generated by ${siteName} • ${new Date().toLocaleString()}</div>
</div>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const fetchVendors = async () => {
    const { data } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) {
      const userIds = data.map((v) => v.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, email, username").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      setVendors(data.map((v) => ({ ...v, profile: profileMap.get(v.user_id) })));
    } else {
      setVendors([]);
    }
  };

  const fetchNonVendorUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("user_id, email, username");
    const { data: existingVendors } = await supabase.from("vendors").select("user_id");
    const vendorUserIds = new Set((existingVendors || []).map(v => v.user_id));
    setAllUsers((profiles || []).filter(p => !vendorUserIds.has(p.user_id)));
  };

  useEffect(() => { fetchVendors(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("vendors").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }

    const vendor = vendors.find(v => v.id === id);

    // If approving, also add vendor role
    if (status === "approved" && vendor) {
      const { data: existingRole } = await supabase.from("user_roles").select("id").eq("user_id", vendor.user_id).eq("role", "vendor").maybeSingle();
      if (!existingRole) {
        await supabase.from("user_roles").insert({ user_id: vendor.user_id, role: "vendor" });
      }
    }

    // Notify vendor about status change
    if (vendor) {
      const statusMsg: Record<string, string> = {
        approved: "আপনার ভেন্ডর আবেদন অনুমোদিত হয়েছে! 🎉",
        rejected: "আপনার ভেন্ডর আবেদন প্রত্যাখ্যাত হয়েছে।",
        suspended: "আপনার ভেন্ডর অ্যাকাউন্ট সাসপেন্ড করা হয়েছে।",
      };
      await (supabase.from("notifications" as any) as any).insert({
        user_id: vendor.user_id,
        target_role: "vendor",
        title: `ভেন্ডরশিপ ${status}`,
        body: statusMsg[status] || `আপনার ভেন্ডর স্ট্যাটাস: ${status}`,
        type: "vendor",
        action_url: "/vendor",
      });
    }

    toast.success(`Vendor ${status}!`);
    logActivity({ action: `vendor_${status}`, details: `Vendor ID: ${id}`, entity_type: "vendor", entity_id: id });
    fetchVendors();
  };

  const updateCommission = async (id: string, rate: number) => {
    const { error } = await supabase.from("vendors").update({ commission_rate: rate }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Commission rate updated!");
    logActivity({ action: "vendor_commission_updated", details: `Vendor ${id} → ${rate}%`, entity_type: "vendor", entity_id: id });
    fetchVendors();
  };

  const resetForm = () => {
    setForm({ store_name: "", store_description: "", phone: "", address: "", logo_url: "", commission_rate: 0 });
    setEditingVendor(null);
    setSelectedUserId("");
  };

  const openAddVendor = () => {
    resetForm();
    fetchNonVendorUsers();
    setOpen(true);
  };

  const openEditVendor = (v: any) => {
    setEditingVendor(v);
    setForm({
      store_name: v.store_name, store_description: v.store_description || "",
      phone: v.phone || "", address: v.address || "", logo_url: v.logo_url || "",
      commission_rate: v.commission_rate ?? 0,
    });
    setOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setLogoUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `vendor-logo-${Date.now()}.${ext}`;
    const filePath = `logos/${fileName}`;
    const { error } = await supabase.storage.from("product-images").upload(filePath, file);
    if (error) { toast.error("Upload failed: " + error.message); setLogoUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    setForm(prev => ({ ...prev, logo_url: data.publicUrl }));
    setLogoUploading(false);
    toast.success("Logo uploaded!");
  };

  const handleSaveVendor = async () => {
    if (!form.store_name.trim()) { toast.error("Store name is required"); return; }

    if (editingVendor) {
      const { error } = await supabase.from("vendors").update({
        store_name: form.store_name, store_description: form.store_description || null,
        phone: form.phone || null, address: form.address || null, logo_url: form.logo_url || null,
        commission_rate: form.commission_rate,
      }).eq("id", editingVendor.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Vendor updated!");
      logActivity({ action: "vendor_updated", details: `Store: ${form.store_name}`, entity_type: "vendor", entity_id: editingVendor.id });
    } else {
      if (!selectedUserId) { toast.error("Please select a user"); return; }
      const { error } = await supabase.from("vendors").insert({
        user_id: selectedUserId, store_name: form.store_name,
        store_description: form.store_description || null,
        phone: form.phone || null, address: form.address || null,
        logo_url: form.logo_url || null,
        status: "approved",
      });
      if (error) { toast.error(error.message); return; }
      // Add vendor role
      const { data: existingRole } = await supabase.from("user_roles").select("id").eq("user_id", selectedUserId).eq("role", "vendor").maybeSingle();
      if (!existingRole) {
        await supabase.from("user_roles").insert({ user_id: selectedUserId, role: "vendor" });
      }
      toast.success("Vendor added!");
      logActivity({ action: "vendor_created", details: `Store: ${form.store_name}`, entity_type: "vendor" });
    }
    setOpen(false);
    resetForm();
    fetchVendors();
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      // Clean up related data first
      await supabase.from("messages").delete().eq("vendor_id", id);
      await supabase.from("vendor_payment_methods").delete().eq("vendor_id", id);
      await supabase.from("vendor_payouts").delete().eq("vendor_id", id);
      await supabase.from("vendor_follows").delete().eq("vendor_id", id);
      await supabase.from("brand_requests").delete().eq("vendor_id", id);
      // Now delete the vendor (products/invoices/refunds will SET NULL via FK)
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) { toast.error(error.message); return; }
      toast.success("Vendor deleted!");
      logActivity({ action: "vendor_deleted", details: `Vendor ID: ${id}`, entity_type: "vendor", entity_id: id });
      fetchVendors();
    } catch (e: any) {
      toast.error("Delete failed: " + e.message);
    }
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600",
    approved: "bg-green-500/10 text-green-600",
    rejected: "bg-red-500/10 text-red-600",
    suspended: "bg-muted text-muted-foreground",
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-2" />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Vendor Management</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-52 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search vendors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAddVendor}><Plus className="mr-2 h-4 w-4" /> Add Vendor</Button>
          </DialogTrigger>
          <PrintExportButtons
            title="Vendors"
            columns={[
              { header: "Store Name", accessor: (v) => v.store_name },
              { header: "Email", accessor: (v) => v.profile?.email || "—" },
              { header: "Phone", accessor: (v) => v.phone || "—" },
              { header: "Status", accessor: (v) => v.status },
              { header: "Commission %", accessor: (v) => v.commission_rate },
            ] satisfies PrintColumn[]}
            data={vendors.filter(v => {
              const q = searchQuery.toLowerCase();
              const matchesSearch = !q || v.store_name.toLowerCase().includes(q) || v.profile?.email?.toLowerCase().includes(q);
              const matchesStatus = statusFilter === "all" || v.status === statusFilter;
              return matchesSearch && matchesStatus;
            })}
          />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {!editingVendor && (
                <div className="space-y-2">
                  <Label>Select User *</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger><SelectValue placeholder="Choose a user" /></SelectTrigger>
                    <SelectContent>
                      {allUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.email || u.username || u.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Store Name *</Label>
                <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder="Store name" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.store_description} onChange={(e) => setForm({ ...form, store_description: e.target.value })} placeholder="Store description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Store Logo</Label>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    {logoUploading ? "Uploading..." : "Choose Logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                  {form.logo_url ? (
                    <div className="relative h-12 w-12 overflow-hidden rounded-md border group">
                      <img src={form.logo_url} alt="Logo" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, logo_url: "" }))} className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                  )}
                </div>
              </div>
              {editingVendor && (
                <div className="space-y-2">
                  <Label>Commission Rate (%)</Label>
                  <Input type="number" min={0} max={100} value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} placeholder="0" />
                </div>
              )}
              <Button onClick={handleSaveVendor} disabled={logoUploading}>{editingVendor ? "Update" : "Add Vendor"}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {(() => {
          const filtered = vendors.filter(v => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q || v.store_name.toLowerCase().includes(q) || v.profile?.email?.toLowerCase().includes(q) || v.phone?.toLowerCase().includes(q);
            const matchesStatus = statusFilter === "all" || v.status === statusFilter;
            return matchesSearch && matchesStatus;
          });
          return filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No vendors found</div>
          ) : filtered.map((v) => (
            <div key={v.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-start gap-3">
                {v.logo_url ? (
                  <img src={v.logo_url} alt={v.store_name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Store className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{v.store_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{v.profile?.email || "—"}</p>
                  {v.phone && <p className="text-xs text-muted-foreground">{v.phone}</p>}
                </div>
                <Badge className={statusColor[v.status] + " text-[10px] shrink-0"}>{v.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Commission: {v.commission_rate}%</span>
                <div className="flex items-center gap-0.5">
                  {v.status !== "approved" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => updateStatus(v.id, "approved")}><Check className="h-3.5 w-3.5" /></Button>
                  )}
                  {v.status !== "rejected" && v.status !== "suspended" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => updateStatus(v.id, "rejected")}><X className="h-3.5 w-3.5" /></Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditVendor(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteVendor(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/vendor-dashboard/${v.id}`)}><ExternalLink className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right hidden md:table-cell">Commission %</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              const filtered = vendors.filter(v => {
                const q = searchQuery.toLowerCase();
                const matchesSearch = !q || v.store_name.toLowerCase().includes(q) || v.profile?.email?.toLowerCase().includes(q) || v.phone?.toLowerCase().includes(q);
                const matchesStatus = statusFilter === "all" || v.status === statusFilter;
                return matchesSearch && matchesStatus;
              });
              return filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No vendors found</TableCell></TableRow>
            ) : filtered.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.store_name}</TableCell>
                <TableCell>{v.profile?.email || "—"}</TableCell>
                <TableCell className="hidden sm:table-cell">{v.phone || "—"}</TableCell>
                <TableCell><Badge className={statusColor[v.status]}>{v.status}</Badge></TableCell>
                <TableCell className="text-right hidden md:table-cell">
                  <Input type="number" className="inline-block w-20 text-right" defaultValue={v.commission_rate}
                    onBlur={(e) => { const val = Number(e.target.value); if (val !== v.commission_rate) updateCommission(v.id, val); }} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    {v.status !== "approved" && (
                      <Button variant="ghost" size="icon" className="text-green-600" title="Approve" onClick={() => updateStatus(v.id, "approved")}><Check className="h-4 w-4" /></Button>
                    )}
                    {v.status !== "rejected" && v.status !== "suspended" && (
                      <Button variant="ghost" size="icon" className="text-red-600" title="Reject" onClick={() => updateStatus(v.id, "rejected")}><X className="h-4 w-4" /></Button>
                    )}
                    {v.status === "approved" && (
                      <Button variant="ghost" size="icon" className="text-muted-foreground" title="Suspend" onClick={() => updateStatus(v.id, "suspended")}><Ban className="h-4 w-4" /></Button>
                    )}
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditVendor(v)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" title="Print" onClick={() => printVendorWithLetterhead(v)}><Printer className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" title="Delete" onClick={() => handleDeleteVendor(v.id)}><Trash2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" title="View Dashboard" onClick={() => navigate(`/admin/vendor-dashboard/${v.id}`)}><ExternalLink className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ));
            })()}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminVendors;
