import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, Search } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";
import BulkBrandUpload from "@/components/BulkBrandUpload";

import { uploadToVault } from "@/lib/vaultStorage";

const AdminBrands = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editBrand, setEditBrand] = useState<any>(null);
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["admin-brand-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadLogo = async (file: File) => {
    const ext = file.name.split(".").pop() || "png";
    const customName = `brand-${Date.now()}.${ext}`;
    const vaultUrl = await uploadToVault(file, customName);
    return vaultUrl;
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      let logo_url: string | null = null;
      if (logoFile) logo_url = await uploadLogo(logoFile);
      const { error } = await supabase.from("brands").insert({ name, logo_url, status: "approved" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      setAddOpen(false);
      setName("");
      setLogoFile(null);
      toast({ title: "Brand added" });
      logActivity({ action: "brand_created", details: `Brand: ${name}`, entity_type: "brand" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates, file }: { id: string; updates: any; file?: File | null }) => {
      if (file) updates.logo_url = await uploadLogo(file);
      const { error } = await supabase.from("brands").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      setEditBrand(null);
      toast({ title: "Brand updated" });
      logActivity({ action: "brand_updated", details: `Brand: ${editBrand?.name}`, entity_type: "brand", entity_id: editBrand?.id });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const brand = brands?.find(b => b.id === id);
      if (brand) {
        const { moveToTrash } = await import("@/lib/trash");
        await moveToTrash("brands", id, brand);
      }
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      toast({ title: "Brand deleted" });
      logActivity({ action: "brand_deleted", details: `Brand ID: ${id}`, entity_type: "brand", entity_id: id });
    },
  });

  const approveRequest = useMutation({
    mutationFn: async (req: any) => {
      const { error: e1 } = await supabase.from("brands").insert({ name: req.brand_name, logo_url: req.logo_url, status: "approved" });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("brand_requests").update({ status: "approved" }).eq("id", req.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      qc.invalidateQueries({ queryKey: ["admin-brand-requests"] });
      toast({ title: "Brand request approved" });
      logActivity({ action: "brand_request_approved", entity_type: "brand_request" });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brand_requests").update({ status: "rejected" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-brand-requests"] });
      toast({ title: "Brand request rejected" });
      logActivity({ action: "brand_request_rejected", entity_type: "brand_request" });
    },
  });

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="p-3 sm:p-6 space-y-6 sm:space-y-8">
      <BackButton className="mb-1" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Brand Management</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search brands..." className="pl-9 h-9" />
          </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Brand</Button>
          </DialogTrigger>
          <BulkBrandUpload onComplete={() => qc.invalidateQueries({ queryKey: ["admin-brands"] })} />
          <PrintExportButtons
            title="Brands"
            columns={[
              { header: "Name", accessor: (b) => b.name },
              { header: "Status", accessor: (b) => b.status },
              { header: "Active", accessor: (b) => b.is_active ? "Yes" : "No" },
              { header: "Created", accessor: (b) => new Date(b.created_at).toLocaleDateString() },
            ] satisfies PrintColumn[]}
            data={brands.filter((b: any) => !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase()))}
          />
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Brand</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Brand Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand name" />
              </div>
              <div>
                <Label>Logo</Label>
                <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={() => addMutation.mutate()} disabled={!name || addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add Brand"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {brands.filter((b: any) => !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase())).map((b: any) => (
          <div key={b.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-3">
              {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-10 w-10 rounded object-cover shrink-0" /> : <div className="h-10 w-10 rounded bg-muted shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{b.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Select defaultValue={b.status} onValueChange={(v) => updateMutation.mutate({ id: b.id, updates: { status: v } })}>
                    <SelectTrigger className="h-7 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Switch checked={b.is_active} onCheckedChange={(v) => updateMutation.mutate({ id: b.id, updates: { is_active: v } })} />
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditBrand(b); setName(b.name); setLogoFile(null); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(b.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Logo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.filter((b: any) => !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase())).map((b: any) => (
            <TableRow key={b.id}>
              <TableCell>
                {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted" />}
              </TableCell>
              <TableCell className="font-medium">{b.name}</TableCell>
              <TableCell>
                <Select defaultValue={b.status} onValueChange={(v) => updateMutation.mutate({ id: b.id, updates: { status: v } })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Switch checked={b.is_active} onCheckedChange={(v) => updateMutation.mutate({ id: b.id, updates: { is_active: v } })} />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => { setEditBrand(b); setName(b.name); setLogoFile(null); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(b.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editBrand} onOpenChange={(o) => { if (!o) setEditBrand(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Brand</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Brand Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>New Logo (optional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={() => updateMutation.mutate({ id: editBrand.id, updates: { name }, file: logoFile })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Brand Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Brand Requests</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingRequests.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.logo_url ? <img src={r.logo_url} alt={r.brand_name} className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted" />}
                  </TableCell>
                  <TableCell className="font-medium">{r.brand_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveRequest.mutate(r)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectRequest.mutate(r.id)}>Reject</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminBrands;
