import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Eye, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PrintExportButtons from "@/components/PrintExportButtons";
import type { PrintColumn } from "@/lib/printExport";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";
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

interface UserRow {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [confirm, setConfirm] = useState<{ userId: string; action: "grant" | "revoke" | "delete"; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const roleMap = new Map<string, string[]>();
    (roles || []).forEach((r) => {
      const existing = roleMap.get(r.user_id) || [];
      roleMap.set(r.user_id, [...existing, r.role]);
    });

    const merged = (profiles || []).map((p) => ({
      ...p,
      roles: roleMap.get(p.user_id) || ["user"],
    }));
    setUsers(merged);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleGrantAdmin = async () => {
    if (!confirm) return;
    setLoading(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: confirm.userId, role: "admin" });
    if (error) {
      toast.error("Failed to grant admin role: " + error.message);
    } else {
      toast.success(`Admin role granted to ${confirm.name}`);
      await fetchUsers();
    }
    setLoading(false);
    setConfirm(null);
  };

  const handleRevokeAdmin = async () => {
    if (!confirm) return;
    setLoading(true);
    const { error } = await supabase.from("user_roles").delete()
      .eq("user_id", confirm.userId)
      .eq("role", "admin");
    if (error) {
      toast.error("Failed to revoke admin role: " + error.message);
    } else {
      toast.success(`Admin role revoked from ${confirm.name}`);
      await fetchUsers();
    }
    setLoading(false);
    setConfirm(null);
  };

  const handleDeleteUser = async () => {
    if (!confirm) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: confirm.userId },
      });
      if (error || data?.error) {
        toast.error("Failed to delete user: " + (data?.error || error?.message));
      } else {
        toast.success(`User "${confirm.name}" deleted successfully`);
        await fetchUsers();
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    }
    setLoading(false);
    setConfirm(null);
  };

  const getDisplayRole = (roles: string[]) => {
    if (roles.includes("admin")) return "admin";
    if (roles.includes("vendor")) return "vendor";
    return "user";
  };

  const filtered = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
    const displayRole = getDisplayRole(u.roles);
    const matchesRole = roleFilter === "all" || displayRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-3 sm:p-6">
      <BackButton className="mb-2" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Users</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <PrintExportButtons
            title="Users"
            columns={[
              { header: "Email", accessor: (u) => u.email || "—" },
              { header: "Username", accessor: (u) => u.username || "—" },
              { header: "Phone", accessor: (u) => u.phone || "—" },
              { header: "Role", accessor: (u) => u.roles.join(", ") },
              { header: "Joined", accessor: (u) => new Date(u.created_at).toLocaleDateString() },
            ] satisfies PrintColumn[]}
            data={filtered}
          />
        </div>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No users found</div>
        ) : filtered.map((u) => {
          const displayRole = getDisplayRole(u.roles);
          const isAdmin = u.roles.includes("admin");
          const displayName = u.email || u.username || u.user_id.slice(0, 8);
          return (
            <div key={u.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{u.username || "No username"}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email || "No email"}</p>
                  {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {u.roles.map(r => (
                    <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-[10px]">{r}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Joined: {new Date(u.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  {isAdmin ? (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-destructive border-destructive/30"
                      onClick={() => setConfirm({ userId: u.user_id, action: "revoke", name: displayName })}>
                      <ShieldOff className="h-3 w-3 mr-1" /> Revoke
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-primary border-primary/30"
                      onClick={() => setConfirm({ userId: u.user_id, action: "grant", name: displayName })}>
                      <ShieldCheck className="h-3 w-3 mr-1" /> Admin
                    </Button>
                  )}
                  {displayRole === "user" && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] px-2"
                      onClick={() => navigate(`/admin/customer-dashboard/${u.user_id}`)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-destructive border-destructive/30"
                    onClick={() => setConfirm({ userId: u.user_id, action: "delete", name: displayName })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg border bg-card">
        <Table>
           <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
            ) : filtered.map((u) => {
              const displayRole = getDisplayRole(u.roles);
              const isAdmin = u.roles.includes("admin");
              const displayName = u.email || u.username || u.user_id.slice(0, 8);
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell>{u.username || "—"}</TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map(r => (
                        <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => setConfirm({ userId: u.user_id, action: "revoke", name: displayName })}
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Revoke Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs text-primary border-primary/30 hover:bg-primary/5"
                          onClick={() => setConfirm({ userId: u.user_id, action: "grant", name: displayName })}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Make Admin
                        </Button>
                      )}
                      {displayRole === "user" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => navigate(`/admin/customer-dashboard/${u.user_id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => setConfirm({ userId: u.user_id, action: "delete", name: displayName })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "grant" ? "Grant Admin Role?" : confirm?.action === "revoke" ? "Revoke Admin Role?" : "Delete User?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "grant"
                ? `"${confirm?.name}" কে admin role দেওয়া হবে। এই user সব admin panel এবং settings এ access পাবে।`
                : confirm?.action === "revoke"
                ? `"${confirm?.name}" এর admin role তুলে নেওয়া হবে। এই user আর admin panel এ access পাবে না।`
                : `"${confirm?.name}" কে permanently delete করা হবে। এই action undo করা যাবে না!`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              className={confirm?.action === "revoke" || confirm?.action === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
              onClick={confirm?.action === "grant" ? handleGrantAdmin : confirm?.action === "revoke" ? handleRevokeAdmin : handleDeleteUser}
            >
              {loading ? "Processing..." : confirm?.action === "grant" ? "Grant Admin" : confirm?.action === "revoke" ? "Revoke Admin" : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
