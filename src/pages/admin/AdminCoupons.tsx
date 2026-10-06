import { useState } from "react";
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, useCouponAssignments, useAssignCoupon, useRemoveCouponAssignment, type Coupon } from "@/hooks/useCoupons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Ticket, Plus, Pencil, Trash2, Users, UserPlus, X } from "lucide-react";
import { format } from "date-fns";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import BackButton from "@/components/BackButton";

const emptyForm = {
  code: "",
  description: "",
  discount_type: "percentage" as Coupon["discount_type"],
  discount_value: 0,
  minimum_order_amount: 0,
  max_uses: "" as string | number,
  max_uses_per_user: 1,
  starts_at: "",
  expires_at: "",
  is_active: true,
  is_user_specific: false,
};

const AdminCoupons = () => {
  const { data: coupons, isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const assignCoupon = useAssignCoupon();
  const removeAssignment = useRemoveCouponAssignment();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Assign users dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCouponId, setAssignCouponId] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignReason, setAssignReason] = useState("");

  const { data: assignments = [] } = useCouponAssignments(assignCouponId);

  // Search users for assignment
  const { data: searchedUsers = [] } = useQuery({
    queryKey: ["admin-search-users-coupon", assignSearch],
    queryFn: async () => {
      if (assignSearch.length < 2) return [];
      const { data } = await (supabase.from("profiles" as any) as any)
        .select("user_id, username, email, phone")
        .or(`email.ilike.%${assignSearch}%,username.ilike.%${assignSearch}%,phone.ilike.%${assignSearch}%`)
        .limit(10);
      return (data || []) as { user_id: string; username: string | null; email: string | null; phone: string | null }[];
    },
    enabled: assignSearch.length >= 2,
  });

  // Fetch profiles for assigned users
  const assignedUserIds = assignments.map((a) => a.user_id);
  const { data: assignedProfiles = [] } = useQuery({
    queryKey: ["assigned-profiles", assignedUserIds.join(",")],
    queryFn: async () => {
      if (assignedUserIds.length === 0) return [];
      const { data } = await (supabase.from("profiles" as any) as any)
        .select("user_id, username, email, phone")
        .in("user_id", assignedUserIds);
      return (data || []) as { user_id: string; username: string | null; email: string | null; phone: string | null }[];
    },
    enabled: assignedUserIds.length > 0,
  });

  const resetForm = () => { setForm(emptyForm); setEditId(null); };

  const openEdit = (c: Coupon) => {
    setEditId(c.id);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      minimum_order_amount: c.minimum_order_amount,
      max_uses: c.max_uses ?? "",
      max_uses_per_user: c.max_uses_per_user ?? 1,
      starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      is_active: c.is_active,
      is_user_specific: c.is_user_specific,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Coupon code is required"); return; }
    const payload: any = {
      code: form.code,
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
      minimum_order_amount: Number(form.minimum_order_amount) || 0,
      max_uses: form.max_uses !== "" ? Number(form.max_uses) : null,
      max_uses_per_user: Number(form.max_uses_per_user) || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
      is_user_specific: form.is_user_specific,
    };
    try {
      if (editId) {
        await updateCoupon.mutateAsync({ id: editId, ...payload });
        toast.success("Coupon updated!");
      } else {
        await createCoupon.mutateAsync(payload);
        toast.success("Coupon created!");
      }
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await deleteCoupon.mutateAsync(id);
      toast.success("Coupon deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAssignUser = async (userId: string) => {
    if (!assignCouponId) return;
    // Check if already assigned
    if (assignments.some((a) => a.user_id === userId)) {
      toast.error("User already assigned to this coupon");
      return;
    }
    try {
      await assignCoupon.mutateAsync({ coupon_id: assignCouponId, user_id: userId, reason: assignReason || undefined });
      toast.success("User assigned!");
      setAssignSearch("");
      setAssignReason("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!assignCouponId) return;
    try {
      await removeAssignment.mutateAsync({ id, coupon_id: assignCouponId });
      toast.success("User removed from coupon");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const discountLabel = (c: Coupon) => {
    if (c.discount_type === "percentage") return `${c.discount_value}%`;
    if (c.discount_type === "fixed") return `৳${c.discount_value}`;
    return "Free Shipping";
  };

  const getProfileLabel = (p: { username: string | null; email: string | null; phone: string | null }) => {
    return p.username || p.email || p.phone || "Unknown";
  };

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Loading...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-2" />
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Coupons</h1>
        </div>
        <div className="flex items-center gap-2">
          <PrintExportButtons
            title="Coupons"
            columns={[
              { header: "Code", accessor: (c) => c.code },
              { header: "Discount", accessor: (c) => discountLabel(c) },
              { header: "Min Order", accessor: (c) => c.minimum_order_amount },
              { header: "Uses", accessor: (c) => `${c.current_uses}${c.max_uses ? "/" + c.max_uses : ""}` },
              { header: "Expires", accessor: (c) => c.expires_at ? format(new Date(c.expires_at), "dd MMM yyyy") : "—" },
              { header: "Active", accessor: (c) => c.is_active ? "Yes" : "No" },
            ] satisfies PrintColumn[]}
            data={coupons || []}
          />
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" size="sm"><Plus className="h-4 w-4" /> Add Coupon</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Coupon Code *</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SUMMER20" className="uppercase" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select value={form.discount_type} onValueChange={(v: any) => setForm({ ...form, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                        <SelectItem value="free_shipping">Free Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.discount_type !== "free_shipping" && (
                    <div className="space-y-2">
                      <Label>Discount Value</Label>
                      <Input type="number" min={0} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Minimum Order Amount (৳)</Label>
                  <Input type="number" min={0} value={form.minimum_order_amount} onChange={(e) => setForm({ ...form, minimum_order_amount: Number(e.target.value) })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Total Uses</Label>
                    <Input type="number" min={0} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value === "" ? "" : Number(e.target.value) })} placeholder="Unlimited" />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Uses Per User</Label>
                    <Input type="number" min={1} value={form.max_uses_per_user} onChange={(e) => setForm({ ...form, max_uses_per_user: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <Label>Active</Label>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4 bg-primary/5">
                  <div>
                    <Label>User-Specific Coupon</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">শুধুমাত্র নির্দিষ্ট ইউজারদের জন্য</p>
                  </div>
                  <Switch checked={form.is_user_specific} onCheckedChange={(v) => setForm({ ...form, is_user_specific: v })} />
                </div>
                <Button onClick={handleSave} className="w-full" disabled={createCoupon.isPending || updateCoupon.isPending}>
                  {editId ? "Update Coupon" : "Create Coupon"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {(!coupons || coupons.length === 0) ? (
          <div className="text-center text-muted-foreground py-8">No coupons yet</div>
        ) : coupons.map((c) => (
          <div key={c.id} className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono font-bold text-sm">{c.code}</p>
                <p className="text-sm text-primary font-medium">{discountLabel(c)}</p>
                {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
              </div>
              <Switch
                checked={c.is_active}
                onCheckedChange={async (v) => {
                  try {
                    await updateCoupon.mutateAsync({ id: c.id, is_active: v });
                    toast.success(v ? "Coupon activated" : "Coupon deactivated");
                  } catch (err: any) { toast.error(err.message); }
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>Min: ৳{c.minimum_order_amount}</span>
              <span>Uses: {c.current_uses}{c.max_uses ? `/${c.max_uses}` : ""}</span>
              {c.expires_at && <span>Exp: {format(new Date(c.expires_at), "dd MMM yyyy")}</span>}
              {c.is_user_specific ? (
                <Badge variant="secondary" className="gap-1 text-[10px]"><Users className="h-3 w-3" /> User-Specific</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Public</Badge>
              )}
            </div>
            <div className="flex items-center justify-end gap-1">
              {c.is_user_specific && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAssignCouponId(c.id); setAssignOpen(true); }}>
                  <Users className="h-3.5 w-3.5 text-primary" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!coupons || coupons.length === 0) ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No coupons yet</TableCell></TableRow>
                ) : coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-bold pl-4">{c.code}</TableCell>
                    <TableCell>{discountLabel(c)}</TableCell>
                    <TableCell>৳{c.minimum_order_amount}</TableCell>
                    <TableCell>{c.current_uses}{c.max_uses ? `/${c.max_uses}` : ""}</TableCell>
                    <TableCell>
                      {c.is_user_specific ? (
                        <Badge variant="secondary" className="gap-1 text-[10px]"><Users className="h-3 w-3" /> User-Specific</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Public</Badge>
                      )}
                    </TableCell>
                    <TableCell>{c.expires_at ? format(new Date(c.expires_at), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={async (v) => {
                          try {
                            await updateCoupon.mutateAsync({ id: c.id, is_active: v });
                            toast.success(v ? "Coupon activated" : "Coupon deactivated");
                          } catch (err: any) { toast.error(err.message); }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-1 pr-4">
                      {c.is_user_specific && (
                        <Button variant="ghost" size="icon" onClick={() => { setAssignCouponId(c.id); setAssignOpen(true); }} title="Manage Users">
                          <Users className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Users Dialog */}
      <Dialog open={assignOpen} onOpenChange={(v) => { setAssignOpen(v); if (!v) { setAssignCouponId(null); setAssignSearch(""); setAssignReason(""); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> ইউজার অ্যাসাইন করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Search users */}
            <div className="space-y-2">
              <Label>ইউজার খুঁজুন (Email, Username, Phone)</Label>
              <Input
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="Search by email, username or phone..."
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>কারণ (Optional)</Label>
              <Input
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="e.g. ৫টি অর্ডার কমপ্লিট, ২০০০০৳ শপিং..."
              />
            </div>

            {/* Search results */}
            {searchedUsers.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchedUsers.map((u) => {
                  const alreadyAssigned = assignments.some((a) => a.user_id === u.user_id);
                  return (
                    <div key={u.user_id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{u.username || "No username"}</p>
                        <p className="text-xs text-muted-foreground">{u.email} {u.phone ? `• ${u.phone}` : ""}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyAssigned ? "secondary" : "default"}
                        disabled={alreadyAssigned || assignCoupon.isPending}
                        onClick={() => handleAssignUser(u.user_id)}
                        className="gap-1 text-xs"
                      >
                        {alreadyAssigned ? "Added" : <><UserPlus className="h-3 w-3" /> Add</>}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Currently assigned users */}
            {assignments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">অ্যাসাইন করা ইউজার ({assignments.length})</Label>
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {assignments.map((a) => {
                    const profile = assignedProfiles.find((p) => p.user_id === a.user_id);
                    return (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{profile ? getProfileLabel(profile) : a.user_id.slice(0, 8) + "..."}</p>
                          {profile?.email && <p className="text-xs text-muted-foreground">{profile.email}</p>}
                          {a.reason && <p className="text-[10px] text-primary mt-0.5">{a.reason}</p>}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive h-7 w-7"
                          onClick={() => handleRemoveAssignment(a.id)}
                          disabled={removeAssignment.isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {assignments.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">এখনো কোনো ইউজার অ্যাসাইন করা হয়নি</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
