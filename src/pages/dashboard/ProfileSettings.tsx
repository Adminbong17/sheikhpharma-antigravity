import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Eye, EyeOff, Plus, Pencil, Trash2, Star, MapPin, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "@/hooks/use-toast";

interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  division: string;
  zilla: string | null;
  upazilla: string | null;
  is_default: boolean;
}

interface DeliveryZone {
  division: string;
  zilla: string | null;
  upazilla: string | null;
}

const EMPTY_ADDR = { full_name: "", phone: "", address: "", division: "", zilla: "", upazilla: "" };

const ProfileSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // OTP states for password change
  const [pwOtpSent, setPwOtpSent] = useState(false);
  const [pwOtp, setPwOtp] = useState("");
  const [sendingPwOtp, setSendingPwOtp] = useState(false);

  // Address form state
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR);
  const [savingAddr, setSavingAddr] = useState(false);

  // Delivery zones for dropdowns
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);

  useEffect(() => {
    (supabase.from("delivery_zones" as any) as any)
      .select("division, zilla, upazilla")
      .eq("is_active", true)
      .then(({ data }: any) => {
        if (data) setDeliveryZones(data as DeliveryZone[]);
      });
  }, []);

  const divisions = useMemo(() => [...new Set(deliveryZones.map((z) => z.division))].sort(), [deliveryZones]);
  const zillas = useMemo(() =>
    [...new Set(deliveryZones.filter((z) => z.division === addrForm.division && z.zilla).map((z) => z.zilla!))].sort(),
    [deliveryZones, addrForm.division]);
  const upazillas = useMemo(() =>
    [...new Set(deliveryZones.filter((z) => z.division === addrForm.division && z.zilla === addrForm.zilla && z.upazilla).map((z) => z.upazilla!))].sort(),
    [deliveryZones, addrForm.division, addrForm.zilla]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from("user_addresses" as any) as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      return (data || []) as Address[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      if (profile.username) setUsername(profile.username);
      if ((profile as any).phone) setPhone((profile as any).phone);
      if ((profile as any).avatar_url) setAvatarUrl((profile as any).avatar_url);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("user_id", user.id);
      setAvatarUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Profile picture updated!" });
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ username, phone } as any).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profile updated successfully!" });
    },
    onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
  });

  const handleSendPwOtp = async () => {
    // Use phone from profile
    const userPhone = phone || (profile as any)?.phone;
    if (!userPhone) {
      toast({ title: "আপনার প্রোফাইলে ফোন নম্বর নেই। আগে ফোন নম্বর সেভ করুন।", variant: "destructive" });
      return;
    }
    setSendingPwOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset-sms", {
        body: { action: "send_otp", phone: userPhone.trim() },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: data.error, variant: "destructive" }); setSendingPwOtp(false); return; }
      setPwOtpSent(true);
      toast({ title: "OTP কোড আপনার ফোনে পাঠানো হয়েছে!" });
    } catch (err: any) {
      toast({ title: err.message || "OTP পাঠাতে সমস্যা হয়েছে", variant: "destructive" });
    }
    setSendingPwOtp(false);
  };

  const handleChangePassword = async () => {
    if (!pwOtp.trim()) {
      toast({ title: "OTP কোড দিন", variant: "destructive" }); return;
    }
    if (!newPassword || !confirmPassword) {
      toast({ title: "Please fill in all password fields", variant: "destructive" }); return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" }); return;
    }
    if (newPassword.length < 5) {
      toast({ title: "Password must be at least 5 characters", variant: "destructive" }); return;
    }
    setChangingPassword(true);
    try {
      const userPhone = phone || (profile as any)?.phone;
      const { data, error } = await supabase.functions.invoke("password-reset-sms", {
        body: { action: "verify_otp", phone: userPhone.trim(), otp: pwOtp.trim(), new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: data.error, variant: "destructive" }); setChangingPassword(false); return; }
      toast({ title: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!" });
      setNewPassword(""); setConfirmPassword(""); setPwOtp(""); setPwOtpSent(false);
    } catch (err: any) {
      toast({ title: err.message || "Failed to change password", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const openAddForm = () => {
    setEditingAddr(null);
    setAddrForm(EMPTY_ADDR);
    setShowAddrForm(true);
  };

  const openEditForm = (addr: Address) => {
    setEditingAddr(addr);
    setAddrForm({
      full_name: addr.full_name,
      phone: addr.phone,
      address: addr.address,
      division: addr.division,
      zilla: addr.zilla || "",
      upazilla: addr.upazilla || "",
    });
    setShowAddrForm(true);
  };

  const handleSaveAddress = async () => {
    if (!addrForm.full_name || !addrForm.phone || !addrForm.address || !addrForm.division) {
      toast({ title: "Please fill in all required fields", variant: "destructive" }); return;
    }
    setSavingAddr(true);
    try {
      const payload = {
        user_id: user!.id,
        full_name: addrForm.full_name,
        phone: addrForm.phone,
        address: addrForm.address,
        division: addrForm.division,
        zilla: addrForm.zilla || null,
        upazilla: addrForm.upazilla || null,
      };

      if (editingAddr) {
        const { error } = await (supabase.from("user_addresses" as any) as any)
          .update(payload)
          .eq("id", editingAddr.id);
        if (error) throw error;
      } else {
        const isFirst = addresses.length === 0;
        const { error } = await (supabase.from("user_addresses" as any) as any)
          .insert({ ...payload, is_default: isFirst });
        if (error) throw error;
      }
      refetchAddresses();
      setShowAddrForm(false);
      toast({ title: editingAddr ? "Address updated!" : "Address added!" });
    } catch {
      toast({ title: "Failed to save address", variant: "destructive" });
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await (supabase.from("user_addresses" as any) as any).delete().eq("id", id);
    refetchAddresses();
    toast({ title: "Address deleted" });
  };

  const handleSetDefault = async (id: string) => {
    // Unset all, then set this one
    await (supabase.from("user_addresses" as any) as any)
      .update({ is_default: false })
      .eq("user_id", user!.id);
    await (supabase.from("user_addresses" as any) as any)
      .update({ is_default: true })
      .eq("id", id);
    refetchAddresses();
    toast({ title: "Default address updated!" });
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-4 max-w-xl">
        <div className="mb-4 flex items-center gap-2">
          <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
        <h1 className="mb-4 text-xl font-bold">Profile Settings</h1>

        {/* Profile Info Card */}
        <Card className="mb-4">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-4 pb-2">
              <div className="relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                    {(username || user?.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <p className="font-semibold">{username || (profile?.email || user?.email || "").split("@")[0]}</p>
                <p className="text-sm text-muted-foreground">{profile?.email && !profile.email.endsWith("@phone.local") ? profile.email : user?.email}</p>
                <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline mt-0.5">
                  {avatarUploading ? "Uploading..." : "Change photo"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email && !profile.email.endsWith("@phone.local") ? profile.email : (user?.email || "")} disabled className="opacity-60" />
              <div className="space-y-2 pt-1">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="নতুন ইমেইল দিন"
                  type="email"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={changingEmail || !newEmail.trim()}
                  onClick={async () => {
                    if (!newEmail.includes("@") || newEmail.endsWith("@phone.local")) {
                      toast({ title: "সঠিক ইমেইল দিন", variant: "destructive" });
                      return;
                    }
                    setChangingEmail(true);
                    try {
                      if (user?.email?.endsWith("@phone.local") && (!profile?.email || profile.email.endsWith("@phone.local"))) {
                        // Use edge function for phone.local accounts
                        const { data, error } = await supabase.functions.invoke("update-email", {
                          body: { new_email: newEmail.trim() },
                        });
                        if (error) throw error;
                        if (data?.error) throw new Error(data.error);
                        toast({ title: "ইমেইল সেট হয়েছে! পুনরায় লগইন করুন।" });
                      } else {
                        const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
                        if (error) throw error;
                        await supabase.from("profiles").update({ email: newEmail.trim() } as any).eq("user_id", user!.id);
                        toast({ title: "ইমেইল আপডেট হয়েছে! কনফার্মেশন লিংক চেক করুন।" });
                      }
                      setNewEmail("");
                      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
                    } catch (err: any) {
                      toast({ title: err.message || "ইমেইল আপডেট ব্যর্থ", variant: "destructive" });
                    } finally {
                      setChangingEmail(false);
                    }
                  }}
                >
                  {changingEmail ? "আপডেট হচ্ছে..." : (user?.email?.endsWith("@phone.local") && (!profile?.email || profile.email.endsWith("@phone.local"))) ? "ইমেইল সেট করুন" : "ইমেইল পরিবর্তন করুন"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>

            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="w-full">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Addresses Card */}
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> My Addresses
              </h2>
              {!showAddrForm && (
                <Button size="sm" variant="outline" onClick={openAddForm}>
                  <Plus className="h-4 w-4 mr-1" /> Add Address
                </Button>
              )}
            </div>

            {/* Address Form */}
            {showAddrForm && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm">{editingAddr ? "Edit Address" : "New Address"}</p>
                  <button onClick={() => setShowAddrForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Name *</Label>
                    <Input value={addrForm.full_name} onChange={(e) => setAddrForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone *</Label>
                    <Input value={addrForm.phone} onChange={(e) => setAddrForm(p => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Address (House, Road, Area) *</Label>
                  <Input value={addrForm.address} onChange={(e) => setAddrForm(p => ({ ...p, address: e.target.value }))} placeholder="House no, road, area" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Division *</Label>
                    <Select value={addrForm.division} onValueChange={(v) => setAddrForm(p => ({ ...p, division: v, zilla: "", upazilla: "" }))}>
                      <SelectTrigger className="bg-background text-xs h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Zilla</Label>
                    <Select value={addrForm.zilla} onValueChange={(v) => setAddrForm(p => ({ ...p, zilla: v, upazilla: "" }))} disabled={!addrForm.division || zillas.length === 0}>
                      <SelectTrigger className="bg-background text-xs h-9">
                        <SelectValue placeholder={zillas.length === 0 ? "N/A" : "Select"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {zillas.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Upazilla</Label>
                    <Select value={addrForm.upazilla} onValueChange={(v) => setAddrForm(p => ({ ...p, upazilla: v }))} disabled={!addrForm.zilla || upazillas.length === 0}>
                      <SelectTrigger className="bg-background text-xs h-9">
                        <SelectValue placeholder={upazillas.length === 0 ? "N/A" : "Select"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {upazillas.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveAddress} disabled={savingAddr} className="flex-1">
                    {savingAddr ? "Saving..." : editingAddr ? "Update" : "Add Address"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddrForm(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            )}

            {/* Address List */}
            {addresses.length === 0 && !showAddrForm && (
              <p className="text-sm text-muted-foreground text-center py-4">No addresses saved yet.</p>
            )}
            {addresses.map((addr) => (
              <div key={addr.id} className={`rounded-lg border p-3 space-y-1 ${addr.is_default ? "border-primary/40 bg-primary/5" : "bg-background"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{addr.full_name}</p>
                      {addr.is_default && (
                        <span className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded px-1.5 py-0.5">
                          <Star className="h-3 w-3" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{addr.phone}</p>
                    <p className="text-xs text-foreground/80 mt-0.5">{addr.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {[addr.upazilla, addr.zilla, addr.division].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        title="Set as default"
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditForm(addr)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="font-semibold text-base">Change Password</h2>

            {!pwOtpSent ? (
              <>
                <p className="text-sm text-muted-foreground">
                  পাসওয়ার্ড পরিবর্তনের জন্য আপনার ফোনে একটি ৬ ডিজিটের OTP কোড পাঠানো হবে।
                </p>
                <Button onClick={handleSendPwOtp} disabled={sendingPwOtp} variant="outline" className="w-full">
                  {sendingPwOtp ? "পাঠানো হচ্ছে..." : "OTP কোড পাঠান"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pwOtp">OTP কোড (৬ ডিজিট)</Label>
                  <Input
                    id="pwOtp"
                    type="text"
                    value={pwOtp}
                    onChange={(e) => setPwOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password (min 5 chars)</Label>
                  <div className="relative">
                    <Input id="newPassword" type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input id="confirmPassword" type={showConfirmPw ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword} className="w-full">
                  {changingPassword ? "ভেরিফাই হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setPwOtpSent(false); setPwOtp(""); }}>
                  আবার OTP পাঠান
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings;
