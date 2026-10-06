import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react";
import { format } from "date-fns";
import BackButton from "@/components/BackButton";

const AdminApiKeys = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("api_keys").insert({ name, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setNewName("");
      toast({ title: "API Key তৈরি হয়েছে" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("api_keys").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "আপডেট হয়েছে" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast({ title: "ডিলিট হয়েছে" });
    },
  });

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "কপি হয়েছে!" });
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-w-0">
      <BackButton className="mb-1" />
      <div className="flex items-center gap-3">
        <Key className="h-6 w-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold">API Keys</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">নতুন API Key তৈরি করুন</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Key এর নাম (যেমন: Partner Site)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button
              onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
              disabled={!newName.trim() || createMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">তৈরি করুন</span><span className="sm:hidden">Add</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</p>
        ) : keys.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">কোনো API Key নেই</p>
        ) : keys.map((key) => (
          <Card key={key.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{key.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded truncate max-w-[150px]">
                      {visibleKeys.has(key.id) ? key.api_key : `${key.api_key.slice(0, 8)}${"•".repeat(12)}`}
                    </code>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleVisibility(key.id)}>
                      {visibleKeys.has(key.id) ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyKey(key.api_key)}>
                      <Copy className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
                <Badge variant={key.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {key.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{format(new Date(key.created_at), "dd MMM yyyy")}</span>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleMutation.mutate({ id: key.id, is_active: !key.is_active })}>
                    {key.is_active ? <ToggleRight className="h-3.5 w-3.5 text-primary" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate(key.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden sm:block overflow-hidden shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>নাম</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>সর্বশেষ ব্যবহার</TableHead>
                <TableHead>তৈরি</TableHead>
                <TableHead className="text-right">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
              ) : keys.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো API Key নেই</TableCell></TableRow>
              ) : keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                        {visibleKeys.has(key.id) ? key.api_key : `${key.api_key.slice(0, 8)}${"•".repeat(20)}`}
                      </code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisibility(key.id)}>
                        {visibleKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyKey(key.api_key)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.is_active ? "default" : "secondary"}>
                      {key.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {key.last_used_at ? format(new Date(key.last_used_at), "dd MMM yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(key.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: key.id, is_active: !key.is_active })}>
                        {key.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(key.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApiKeys;
