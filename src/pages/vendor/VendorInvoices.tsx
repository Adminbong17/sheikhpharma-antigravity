import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/contexts/VendorContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Printer, Trash2 } from "lucide-react";
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

const VendorInvoices = () => {
  const { vendorId } = useVendor();
  const [search, setSearch] = useState("");
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ["vendor-invoices", vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("invoices" as any) as any)
        .select("*")
        .eq("vendor_id", vendorId)
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
    const { error } = await (supabase.from("invoices" as any) as any)
      .delete()
      .eq("id", deleteId)
      .eq("vendor_id", vendorId);
    if (error) {
      toast.error("Delete failed");
    } else {
      toast.success("Invoice deleted");
      refetch();
    }
    setDeleteId(null);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} total invoices</p>
        </div>
        <Button className="gap-2" size="sm" onClick={() => setGeneratorOpen(true)}>
          <Plus className="h-4 w-4" /> Create Invoice
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by invoice number, customer name or phone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No invoices found</p>
          </div>
        ) : filtered.map((inv: any) => {
          const itemCount = Array.isArray(inv.items) ? inv.items.length : 0;
          return (
            <div key={inv.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-primary">{inv.invoice_number}</span>
                {inv.status === "approved" ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{inv.customer_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{inv.customer_phone || ""}</p>
                </div>
                <p className="font-bold text-lg">৳{Number(inv.total).toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{itemCount} item{itemCount !== 1 ? "s" : ""} · {inv.payment_method || "—"}</span>
                <span>{formatDate(inv.created_at)}</span>
              </div>
              <div className="flex gap-2 pt-1">
                {inv.status === "approved" ? (
                  <Button size="sm" variant="outline" className="gap-1 h-7 text-xs flex-1" onClick={() => setPrintInvoice(inv)}>
                    <Printer className="h-3 w-3" /> Print
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1 h-7 text-xs flex-1 opacity-50" disabled>
                    <Printer className="h-3 w-3" /> Locked
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs" onClick={() => setDeleteId(inv.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="rounded-xl border bg-card hidden sm:block">
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
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No invoices found</p>
                  <p className="text-xs">Click "Create Invoice" to get started</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv: any) => {
                const itemCount = Array.isArray(inv.items) ? inv.items.length : 0;
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <span className="font-mono text-sm font-semibold text-primary">{inv.invoice_number}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{inv.customer_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{inv.customer_phone || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{itemCount} item{itemCount !== 1 ? "s" : ""}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">৳{Number(inv.total).toLocaleString()}</TableCell>
                    <TableCell>
                      {inv.status === "approved" ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="capitalize text-sm">{inv.payment_method || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(inv.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        {inv.status === "approved" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => setPrintInvoice(inv)}
                          >
                            <Printer className="h-3.5 w-3.5" /> Print
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 opacity-50 cursor-not-allowed"
                            disabled
                            title="Waiting for admin approval"
                          >
                            <Printer className="h-3.5 w-3.5" /> Locked
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(inv.id)}
                        >
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

      {/* Invoice generator — passes vendorId so only vendor's products are shown */}
      <InvoiceGeneratorDialog
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        vendorId={vendorId}
        onSaved={() => { refetch(); setGeneratorOpen(false); }}
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

export default VendorInvoices;
