import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, Wallet } from "lucide-react";
import BackButton from "@/components/BackButton";

type PaymentMethod = {
  id: string;
  vendor_id: string;
  method_type: string;
  account_name: string;
  account_number: string;
  bank_name: string | null;
  branch_name: string | null;
  is_default: boolean;
  created_at: string;
};

const BD_BANKS = [
  "Sonali Bank PLC", "Janata Bank PLC", "Agrani Bank PLC", "Rupali Bank PLC",
  "Bangladesh Krishi Bank", "Rajshahi Krishi Unnayan Bank", "Probashi Kallyan Bank",
  "Bangladesh Development Bank PLC", "AB Bank PLC", "BRAC Bank PLC", "City Bank PLC",
  "Dhaka Bank PLC", "Eastern Bank PLC", "IFIC Bank PLC", "Jamuna Bank PLC",
  "Meghna Bank PLC", "Mercantile Bank PLC", "Midland Bank PLC", "Mutual Trust Bank PLC",
  "National Bank PLC", "NRB Bank PLC", "NRB Commercial Bank PLC", "NRB Global Bank PLC",
  "One Bank PLC", "Padma Bank PLC", "Prime Bank PLC", "Pubali Bank PLC",
  "South Bangla Agriculture and Commerce Bank PLC", "Southeast Bank PLC", "Standard Bank PLC",
  "Trust Bank PLC", "United Commercial Bank PLC", "Uttara Bank PLC",
  "Islami Bank Bangladesh PLC", "Al-Arafah Islami Bank PLC", "Social Islami Bank PLC",
  "First Security Islami Bank PLC", "Global Islami Bank PLC", "Union Bank PLC",
  "EXIM Bank PLC", "ICB Islamic Bank PLC", "Standard Chartered Bangladesh",
  "HSBC Bangladesh", "Citibank N.A. Bangladesh", "Commercial Bank of Ceylon Bangladesh",
  "State Bank of India Bangladesh", "Woori Bank Bangladesh",
];

const emptyForm = { method_type: "bkash", account_name: "", account_number: "", bank_name: "", branch_name: "" };

const VendorPaymentMethods = () => {
  const { vendorId } = useVendor();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMethods = async () => {
    if (!vendorId) return;
    const { data } = await (supabase as any).from("vendor_payment_methods").select("*").eq("vendor_id", vendorId).order("created_at");
    setMethods(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMethods(); }, [vendorId]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (m: PaymentMethod) => {
    setEditing(m);
    setForm({ method_type: m.method_type, account_name: m.account_name, account_number: m.account_number, bank_name: m.bank_name || "", branch_name: m.branch_name || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.account_name || !form.account_number) { toast.error("Account name & number required"); return; }
    if (form.method_type === "bank" && !form.bank_name) { toast.error("Bank name required"); return; }
    setSaving(true);
    const payload = {
      vendor_id: vendorId,
      method_type: form.method_type,
      account_name: form.account_name,
      account_number: form.account_number,
      bank_name: form.method_type === "bank" ? form.bank_name : null,
      branch_name: form.method_type === "bank" ? form.branch_name : null,
    };
    if (editing) {
      await (supabase as any).from("vendor_payment_methods").update(payload).eq("id", editing.id);
      toast.success("Payment method updated");
    } else {
      await (supabase as any).from("vendor_payment_methods").insert(payload);
      toast.success("Payment method added");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchMethods();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    await (supabase as any).from("vendor_payment_methods").delete().eq("id", id);
    toast.success("Deleted");
    fetchMethods();
  };

  const setDefault = async (id: string) => {
    await (supabase as any).from("vendor_payment_methods").update({ is_default: false }).eq("vendor_id", vendorId);
    await (supabase as any).from("vendor_payment_methods").update({ is_default: true }).eq("id", id);
    toast.success("Default method set");
    fetchMethods();
  };

  const methodLabel: Record<string, string> = { bkash: "bKash", nagad: "Nagad", bank: "Bank Transfer" };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Add Method</Button>
      </div>

      {methods.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No payment methods added yet. Add one to receive payouts.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m) => (
            <Card key={m.id} className={m.is_default ? "border-primary" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {methodLabel[m.method_type] || m.method_type}
                  {m.is_default && <Badge className="bg-primary/10 text-primary text-[10px]">Default</Badge>}
                </CardTitle>
                <div className="flex gap-1">
                  {!m.is_default && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDefault(m.id)} title="Set as default">
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {m.account_name}</p>
                <p><span className="text-muted-foreground">Number:</span> {m.account_number}</p>
                {m.bank_name && <p><span className="text-muted-foreground">Bank:</span> {m.bank_name}</p>}
                {m.branch_name && <p><span className="text-muted-foreground">Branch:</span> {m.branch_name}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Payment Method</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Method Type</label>
              <Select value={form.method_type} onValueChange={(v) => setForm(prev => ({ ...prev, method_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Account Name</label>
              <Input value={form.account_name} onChange={(e) => setForm(prev => ({ ...prev, account_name: e.target.value }))} placeholder="Full name on account" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Account Number</label>
              <Input value={form.account_number} onChange={(e) => setForm(prev => ({ ...prev, account_number: e.target.value }))} placeholder="01XXXXXXXXX" />
            </div>
            {form.method_type === "bank" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Bank Name</label>
                  <Select value={form.bank_name} onValueChange={(v) => setForm(prev => ({ ...prev, bank_name: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>
                      {BD_BANKS.map((bank) => (
                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Branch</label>
                  <Input value={form.branch_name} onChange={(e) => setForm(prev => ({ ...prev, branch_name: e.target.value }))} placeholder="Branch name" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorPaymentMethods;
