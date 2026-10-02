import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Printer, Trash2, CheckCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import InvoiceGeneratorDialog from "@/components/InvoiceGeneratorDialog";
import InvoicePrintDialog from "@/components/InvoicePrintDialog";
import BackButton from "@/components/BackButton";

const AdminInvoices = () => {
  const [search, setSearch] = useState("");
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any | null>(null);
  const [printInvoice, setPrintInvoice] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("invoices" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = invoices.filter((inv: any) =>
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_phone?.includes(search)
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase.from("invoices" as any) as any).delete().eq("id", deleteId);
    if (error) {
      toast.error("Delete failed");
    } else {
      toast.success("Invoice deleted");
      refetch();
    }
    setDeleteId(null);
  };

  const handleApprove = async (id: string) => {
    const { error } = await (supabase.from("invoices" as any) as any)
      .update({ status: "approved" })
      .eq("id", id);
    if (error) {
      toast.error("Approve failed");
    } else {
      toast.success("Invoice approved!");
      refetch();
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <BackButton className="mb-1" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} total</p>
        </div>
        <Button className="gap-2" size="sm" onClick={() => setGeneratorOpen(true)}>
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search invoices..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No invoices found</p>
          </div>
        ) : filtered.map((inv: any) => {
          const itemCount = Array.isArray(inv.items) ? inv.items.length : 0;
          return (
            <div key={inv.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-primary">{inv.invoice_number}</p>
                  <p className="text-sm font-medium mt-0.5">{inv.customer_name || "—"}</p>
                  {inv.customer_phone && <p className="text-xs text-muted-foreground">{inv.customer_phone}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">৳{Number(inv.total).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(inv.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">{itemCount} items</Badge>
                  {inv.status === "approved" || inv.status === "saved" ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">{inv.status === "saved" ? "Saved" : "Approved"}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">Pending</Badge>
                  )}
                  {inv.payment_method && <span className="text-[10px] text-muted-foreground capitalize">{inv.payment_method}</span>}
                </div>
                <div className="flex items-center gap-1">
                  {inv.status === "pending" && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => handleApprove(inv.id)}>
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditInvoice(inv); setGeneratorOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPrintInvoice(inv)}>
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(inv.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No invoices found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv: any) => {
                const itemCount = Array.isArray(inv.items) ? inv.items.length : 0;
                return (
                  <TableRow key={inv.id}>
                    <TableCell><span className="font-mono text-sm font-semibold text-primary">{inv.invoice_number}</span></TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{inv.customer_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{inv.customer_phone || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{itemCount} item{itemCount !== 1 ? "s" : ""}</Badge></TableCell>
                    <TableCell className="font-semibold">৳{Number(inv.total).toLocaleString()}</TableCell>
                    <TableCell>
                      {inv.status === "approved" || inv.status === "saved" ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">{inv.status === "saved" ? "Saved" : "Approved"}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="capitalize text-sm">{inv.payment_method || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(inv.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        {inv.status === "pending" && (
                          <Button size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50" onClick={() => handleApprove(inv.id)}>
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditInvoice(inv); setGeneratorOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPrintInvoice(inv)}>
                          <Printer className="h-3.5 w-3.5" /> Print
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(inv.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceGeneratorDialog
        open={generatorOpen}
        onOpenChange={(v) => { setGeneratorOpen(v); if (!v) setEditInvoice(null); }}
        editInvoice={editInvoice}
        onSaved={() => { refetch(); setGeneratorOpen(false); setEditInvoice(null); }}
      />

      {printInvoice && (
        <InvoicePrintDialog
          invoice={printInvoice}
          open={!!printInvoice}
          onOpenChange={(v) => { if (!v) setPrintInvoice(null); }}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminInvoices;
