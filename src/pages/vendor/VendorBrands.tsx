import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/contexts/VendorContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import BackButton from "@/components/BackButton";

const VendorBrands = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { vendor } = useVendor();
  const [open, setOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: requests = [] } = useQuery({
    queryKey: ["vendor-brand-requests", vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_requests")
        .select("*")
        .eq("vendor_id", vendor!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: approvedBrands = [] } = useQuery({
    queryKey: ["approved-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").eq("status", "approved").order("name");
      if (error) throw error;
      return data;
    },
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      let logo_url: string | null = null;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `brands/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, logoFile);
        if (error) throw error;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        logo_url = data.publicUrl;
      }
      const { error } = await supabase.from("brand_requests").insert({
        vendor_id: vendor!.id,
        brand_name: brandName,
        logo_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-brand-requests"] });
      setOpen(false);
      setBrandName("");
      setLogoFile(null);
      toast({ title: "Brand request submitted" });
      logActivity({ action: "brand_request_submitted", details: `Brand: ${brandName}`, entity_type: "brand_request" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <div className="p-3 sm:p-6 space-y-8">
      <BackButton className="mb-1" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Brands</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search brands..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Request New Brand</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Request New Brand</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Brand Name</Label>
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Enter brand name" />
              </div>
              <div>
                <Label>Logo (optional)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={() => submitRequest.mutate()} disabled={!brandName || submitRequest.isPending}>
                {submitRequest.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* My Requests — Mobile cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">My Brand Requests</h2>
        {/* Mobile */}
        <div className="space-y-2 sm:hidden">
          {requests.filter((r: any) => !searchQuery || r.brand_name.toLowerCase().includes(searchQuery.toLowerCase())).map((r: any) => (
            <div key={r.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              {r.logo_url ? <img src={r.logo_url} alt={r.brand_name} className="h-10 w-10 rounded object-cover shrink-0" /> : <div className="h-10 w-10 rounded bg-muted shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{r.brand_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant={statusColor(r.status)}>{r.status}</Badge>
            </div>
          ))}
          {requests.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No requests yet</p>}
        </div>
        {/* Desktop */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.filter((r: any) => !searchQuery || r.brand_name.toLowerCase().includes(searchQuery.toLowerCase())).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.logo_url ? <img src={r.logo_url} alt={r.brand_name} className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted" />}
                  </TableCell>
                  <TableCell className="font-medium">{r.brand_name}</TableCell>
                  <TableCell><Badge variant={statusColor(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No requests yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Approved Brands */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Approved Brands</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {approvedBrands.filter((b: any) => !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase())).map((b: any) => (
            <div key={b.id} className="flex flex-col items-center gap-2 rounded-lg border p-3">
              {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-12 w-12 rounded object-cover" /> : <div className="h-12 w-12 rounded bg-muted" />}
              <span className="text-sm font-medium text-center">{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorBrands;
