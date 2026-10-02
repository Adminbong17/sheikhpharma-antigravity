import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Users, Plus, Edit, Trash2, Eye, Upload, ArrowLeft, Printer, Image, FileText, CreditCard } from "lucide-react";
import { format } from "date-fns";
import BackButton from "@/components/BackButton";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Staff = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  designation: string | null;
  department: string | null;
  joining_date: string | null;
  salary: number;
  pay_method: string | null;
  pay_account_number: string | null;
  bank_name: string | null;
  nid_url: string | null;
  photo_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  career_application_id: string | null;
  experience: string | null;
  educational_qualification: string | null;
};

const emptyForm = {
  full_name: "", email: "", phone: "", address: "", designation: "", department: "",
  joining_date: "", salary: "", pay_method: "bkash", pay_account_number: "", bank_name: "",
  notes: "", status: "active",
};

const buildStaffCVHtml = (s: Staff, branding: any) => {
  const logoHtml = branding.logoUrl
    ? `<img src="${branding.logoUrl}" style="height:48px;width:auto;object-fit:contain;" crossorigin="anonymous" />`
    : "";
  const contactParts: string[] = [];
  if (branding.officeAddress) contactParts.push(branding.officeAddress);
  if (branding.officePhone) contactParts.push(`📞 ${branding.officePhone}`);
  if (branding.officeEmail) contactParts.push(`✉ ${branding.officeEmail}`);
  const contactLine = contactParts.length
    ? `<div style="font-size:11px;color:#555;margin-top:2px;">${contactParts.join(" &nbsp;|&nbsp; ")}</div>`
    : "";

  return `<!DOCTYPE html><html><head><title>CV - ${s.full_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #222; max-width: 800px; margin: 0 auto; background: #fff; }
    .letterhead { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 2px solid #333; margin-bottom: 20px; }
    .letterhead-name { font-weight: 700; font-size: 20px; letter-spacing: 0.5px; }
    .header { text-align: center; margin-bottom: 30px; }
    .photo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #333; margin-bottom: 10px; }
    .name { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    .designation { font-size: 15px; color: #555; margin-bottom: 2px; }
    .contact { font-size: 13px; color: #555; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; letter-spacing: 1px; }
    .section-body { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; }
    .info-grid .label { color: #888; font-size: 12px; }
    .info-grid .value { font-weight: 500; }
    .nid-section img { max-width: 400px; border: 1px solid #ccc; border-radius: 8px; margin-top: 8px; }
    .no-upload { font-style: italic; color: #999; font-size: 13px; }
    .signature { margin-top: 48px; text-align: right; font-size: 13px; }
    .signature-line { border-top: 1px solid #333; display: inline-block; padding-top: 4px; min-width: 180px; text-align: center; }
    .signature-name { font-weight: 600; }
    .signature-label { color: #666; font-size: 11px; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <div class="letterhead">
    ${logoHtml}
    <div>
      <div class="letterhead-name">${branding.siteName || ""}</div>
      ${contactLine}
    </div>
  </div>
  <div class="header">
    ${s.photo_url ? `<img src="${s.photo_url}" class="photo" crossorigin="anonymous" />` : ""}
    <div class="name">${s.full_name}</div>
    ${s.designation ? `<div class="designation">${s.designation}${s.department ? ` — ${s.department}` : ""}</div>` : ""}
    <div class="contact">${[s.email, s.phone].filter(Boolean).join(" | ")}</div>
  </div>
  <div class="section">
    <div class="section-title">Personal Information</div>
    <div class="info-grid">
      ${s.joining_date ? `<div><div class="label">Joining Date</div><div class="value">${format(new Date(s.joining_date), "dd MMM yyyy")}</div></div>` : ""}
      <div><div class="label">Status</div><div class="value" style="text-transform:capitalize;">${s.status}</div></div>
    </div>
  </div>
  ${s.address ? `<div class="section"><div class="section-title">Address</div><div class="section-body">${s.address}</div></div>` : ""}
  ${s.educational_qualification ? `<div class="section"><div class="section-title">Educational Qualification</div><div class="section-body">${s.educational_qualification}</div></div>` : ""}
  ${s.experience ? `<div class="section"><div class="section-title">Experience</div><div class="section-body">${s.experience}</div></div>` : ""}
  <div class="section nid-section">
    <div class="section-title">NID (National ID)</div>
    ${s.nid_url ? `<img src="${s.nid_url}" crossorigin="anonymous" />` : '<p class="no-upload">আপলোড করেনি</p>'}
  </div>
  <div class="signature">
    <div class="signature-line">
      <div class="signature-name">${branding.ceoName || "CEO"}</div>
      <div class="signature-label">Authorized Signature</div>
    </div>
  </div>
  </body></html>`;
};

const buildIdCardFrontHtml = (s: Staff, branding: any) => {
  const logoHtml = branding.logoUrl
    ? `<img src="${branding.logoUrl}" style="height:36px;width:auto;object-fit:contain;" crossorigin="anonymous" />`
    : "";
  const watermarkLogo = branding.logoUrl
    ? `<img src="${branding.logoUrl}" style="height:100px;width:auto;object-fit:contain;opacity:0.08;" crossorigin="anonymous" />`
    : "";

  return `<div style="width:340px;font-family:'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#87CEEB 0%,#5BA3D9 50%,#4A90C4 100%);color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.3);position:relative;">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;">${watermarkLogo}</div>
    <div style="position:relative;z-index:1;">
      <div style="padding:16px 20px 12px;display:flex;align-items:center;gap:10px;border-bottom:2px solid rgba(255,255,255,0.25);">
        ${logoHtml}
        <div>
          <div style="font-weight:700;font-size:16px;letter-spacing:0.5px;">${branding.siteName || "Company"}</div>
          <div style="font-size:10px;opacity:0.85;letter-spacing:1px;">EMPLOYEE ID CARD</div>
        </div>
      </div>
      <div style="padding:16px 20px;display:flex;gap:14px;align-items:center;">
        ${s.photo_url
          ? `<img src="${s.photo_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.5);" crossorigin="anonymous" />`
          : `<div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;">${s.full_name[0]}</div>`}
        <div style="flex:1;">
          <div style="font-size:18px;font-weight:700;margin-bottom:2px;">${s.full_name}</div>
          ${s.designation ? `<div style="font-size:12px;opacity:0.9;font-weight:500;">${s.designation}</div>` : ""}
          ${s.department ? `<div style="font-size:11px;opacity:0.7;">${s.department}</div>` : ""}
        </div>
      </div>
      <div style="padding:0 20px 16px;font-size:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${s.phone ? `<div><span style="opacity:0.7;">📞</span> ${s.phone}</div>` : ""}
          ${s.email ? `<div><span style="opacity:0.7;">✉</span> ${s.email}</div>` : ""}
          ${s.joining_date ? `<div><span style="opacity:0.7;">📅</span> ${format(new Date(s.joining_date), "dd MMM yyyy")}</div>` : ""}
          <div><span style="opacity:0.7;">🔖</span> ID: ${s.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>
      <div style="background:rgba(0,0,0,0.15);padding:8px 20px;font-size:10px;text-align:center;opacity:0.85;">
        ${branding.officeAddress || ""} ${branding.officePhone ? `| 📞 ${branding.officePhone}` : ""}
      </div>
    </div>
  </div>`;
};

const buildIdCardBackHtml = (branding: any) => {
  const watermarkLogo = branding.logoUrl
    ? `<img src="${branding.logoUrl}" style="height:100px;width:auto;object-fit:contain;opacity:0.08;" crossorigin="anonymous" />`
    : "";

  const contactLines: string[] = [];
  if (branding.officeAddress) contactLines.push(`<div style="margin-bottom:4px;">📍 ${branding.officeAddress}</div>`);
  if (branding.officePhone) contactLines.push(`<div style="margin-bottom:4px;">📞 ${branding.officePhone}</div>`);
  if (branding.officeEmail) contactLines.push(`<div style="margin-bottom:4px;">✉ ${branding.officeEmail}</div>`);

  return `<div style="width:340px;font-family:'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#87CEEB 0%,#5BA3D9 50%,#4A90C4 100%);color:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.3);position:relative;">
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;">${watermarkLogo}</div>
    <div style="position:relative;z-index:1;">
      <div style="padding:16px 20px 12px;border-bottom:2px solid rgba(255,255,255,0.25);text-align:center;">
        <div style="font-size:13px;font-weight:700;letter-spacing:1.5px;">TERMS & CONDITIONS</div>
      </div>
      <div style="padding:20px 24px;text-align:center;">
        <div style="font-size:11px;opacity:0.9;line-height:1.7;max-width:280px;margin:0 auto 16px;">
          This card is the property of ${branding.siteName || "the company"}. 
          If found, please return to the address below. 
          This card is non-transferable and must be carried during office hours.
        </div>
        <div style="width:60px;height:1px;background:rgba(255,255,255,0.3);margin:0 auto 14px;"></div>
        <div style="font-size:11px;opacity:0.9;line-height:1.6;">
          ${contactLines.join("")}
        </div>
      </div>
      <div style="background:rgba(0,0,0,0.15);padding:8px 20px;font-size:10px;display:flex;justify-content:space-between;align-items:center;opacity:0.85;">
        <div>www.${(branding.siteName || "company").toLowerCase().replace(/\s+/g, "")}.com</div>
        <div style="font-weight:600;letter-spacing:1px;">${branding.siteName || "COMPANY"}</div>
      </div>
    </div>
  </div>`;
};

const AdminStaff = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewStaff, setViewStaff] = useState<Staff | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [nidPreview, setNidPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [idCardStaff, setIdCardStaff] = useState<Staff | null>(null);
  const { data: siteSettings } = useSiteSettings();

  const branding = {
    logoUrl: siteSettings?.logo_url,
    siteName: siteSettings?.site_name,
    ceoName: (siteSettings as any)?.ceo_name || "CEO",
    officeAddress: (siteSettings as any)?.office_address,
    officePhone: (siteSettings as any)?.office_phone,
    officeEmail: (siteSettings as any)?.office_email,
  };

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("staff_members" as any) as any)
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Staff[];
    },
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["banks-list"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("banks" as any) as any)
        .select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("avatars").getPublicUrl(data.path).data.publicUrl;
  };

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setPhotoFile(null); setNidFile(null);
    setPhotoPreview(null); setNidPreview(null);
    setDialogOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditId(s.id);
    setForm({
      full_name: s.full_name, email: s.email || "", phone: s.phone || "",
      address: s.address || "", designation: s.designation || "", department: s.department || "",
      joining_date: s.joining_date || "", salary: String(s.salary), pay_method: s.pay_method || "bkash",
      pay_account_number: s.pay_account_number || "", bank_name: s.bank_name || "",
      notes: s.notes || "", status: s.status,
    });
    setPhotoPreview(s.photo_url); setNidPreview(s.nid_url);
    setPhotoFile(null); setNidFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      let photoUrl = photoPreview;
      let nidUrl = nidPreview;
      const ts = Date.now();
      if (photoFile) photoUrl = await uploadFile(photoFile, `staff-photos/${ts}-${photoFile.name}`);
      if (nidFile) nidUrl = await uploadFile(nidFile, `staff-nids/${ts}-${nidFile.name}`);

      const payload = {
        full_name: form.full_name, email: form.email || null, phone: form.phone || null,
        address: form.address || null, designation: form.designation || null,
        department: form.department || null, joining_date: form.joining_date || null,
        salary: Number(form.salary) || 0, pay_method: form.pay_method || null,
        pay_account_number: form.pay_account_number || null, bank_name: form.bank_name || null,
        photo_url: photoUrl || null, nid_url: nidUrl || null, notes: form.notes || null,
        status: form.status,
      };

      if (editId) {
        const { error } = await (supabase.from("staff_members" as any) as any).update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("Staff updated");
      } else {
        const { error } = await (supabase.from("staff_members" as any) as any).insert(payload);
        if (error) throw error;
        toast.success("Staff added");
      }
      qc.invalidateQueries({ queryKey: ["staff-members"] });
      setDialogOpen(false);
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("staff_members" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff-members"] }); toast.success("Deleted"); },
  });

  const backToApplication = useMutation({
    mutationFn: async (s: Staff) => {
      if (!s.career_application_id) throw new Error("No linked application");
      // Update career app status back to pending
      await (supabase.from("career_applications" as any) as any)
        .update({ status: "pending" })
        .eq("id", s.career_application_id);
      // Delete staff entry
      const { error } = await (supabase.from("staff_members" as any) as any).delete().eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-members"] });
      qc.invalidateQueries({ queryKey: ["career-applications"] });
      qc.invalidateQueries({ queryKey: ["staff-career-links"] });
      toast.success("Application এ ফেরত পাঠানো হয়েছে!");
      setViewStaff(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const printCV = (s: Staff) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildStaffCVHtml(s, branding));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const saveCVAsJpg = async (s: Staff) => {
    const { default: html2canvas } = await import("html2canvas");
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;background:white;width:794px;";
    const htmlContent = buildStaffCVHtml(s, branding)
      .replace(/<!DOCTYPE html>|<\/?html>|<\/?head>|<title>.*?<\/title>/gi, "")
      .replace(/<\/?body>/gi, "");
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    try {
      await new Promise(r => setTimeout(r, 500));
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `CV_${s.full_name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } finally {
      document.body.removeChild(container);
    }
  };

  const saveIdCardAsJpg = async (s: Staff, side: "front" | "back" = "front") => {
    const { default: html2canvas } = await import("html2canvas");
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;width:340px;";
    container.innerHTML = side === "front" ? buildIdCardFrontHtml(s, branding) : buildIdCardBackHtml(branding);
    document.body.appendChild(container);
    try {
      const images = container.querySelectorAll("img");
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));
      await new Promise(r => setTimeout(r, 300));
      const cardEl = container.firstElementChild as HTMLElement;
      const canvas = await html2canvas(cardEl, { 
        scale: 3, 
        useCORS: true, 
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      // Save as PNG to preserve the card background without any white/black around it
      const link = document.createElement("a");
      link.download = `ID_Card_${side === "front" ? s.full_name.replace(/\s+/g, "_") : "Back"}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      document.body.removeChild(container);
    }
  };

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <BackButton className="mb-1" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Staff</h1>
          <Badge variant="secondary">{staff.length}</Badge>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Staff</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : staff.length === 0 ? (
        <p className="text-muted-foreground">No staff members added yet.</p>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-2 sm:hidden">
            {staff.map(s => (
              <div key={s.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start gap-3">
                  {s.photo_url ? <img src={s.photo_url} className="h-10 w-10 rounded-full object-cover shrink-0" /> : <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">{s.full_name[0]}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{s.full_name}</p>
                      <div className="flex items-center gap-1">
                        {s.career_application_id && <Badge variant="outline" className="text-[10px]">From App</Badge>}
                        <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.designation || "—"}</p>
                    {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-medium">৳{Number(s.salary).toLocaleString()}</span>
                      <span className="text-[11px] text-muted-foreground capitalize">{s.pay_method || "—"} {s.pay_account_number ? `(${s.pay_account_number})` : ""}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 mt-2 border-t pt-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setViewStaff(s)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIdCardStaff(s)}><CreditCard className="h-3.5 w-3.5 mr-1" /> ID</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { if (confirm("Delete?")) deleteMut.mutate(s.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Pay Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.photo_url ? <img src={s.photo_url} className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{s.full_name[0]}</div>}
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.full_name}
                      {s.career_application_id && <Badge variant="outline" className="ml-2 text-[10px]">From App</Badge>}
                    </TableCell>
                    <TableCell>{s.designation || "—"}</TableCell>
                    <TableCell>{s.phone || "—"}</TableCell>
                    <TableCell>৳{Number(s.salary).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{s.pay_method || "—"} {s.pay_account_number ? `(${s.pay_account_number})` : ""}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setViewStaff(s)}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setIdCardStaff(s)} title="ID Card"><CreditCard className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMut.mutate(s.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Staff" : "Add Staff"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Full Name *</Label>
                <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone" />
              </div>
              <div className="space-y-1">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={e => set("designation", e.target.value)} placeholder="e.g. Manager" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Department</Label>
                <Input value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Sales" />
              </div>
              <div className="space-y-1">
                <Label>Joining Date</Label>
                <Input type="date" value={form.joining_date} onChange={e => set("joining_date", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={e => set("address", e.target.value)} placeholder="Address" />
            </div>

            <div className="border-t pt-3">
              <h3 className="font-semibold mb-2">Salary & Payment</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Salary (৳)</Label>
                  <Input type="number" value={form.salary} onChange={e => set("salary", e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label>Pay Method</Label>
                  <Select value={form.pay_method} onValueChange={v => set("pay_method", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bkash">bKash</SelectItem>
                      <SelectItem value="nagad">Nagad</SelectItem>
                      <SelectItem value="rocket">Rocket</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1">
                  <Label>Account Number</Label>
                  <Input value={form.pay_account_number} onChange={e => set("pay_account_number", e.target.value)} placeholder="Account number" />
                </div>
                <div className="space-y-1">
                  <Label>Bank Name</Label>
                  <Select value={form.bank_name} onValueChange={v => set("bank_name", v)}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>
                      {banks.map(b => (
                        <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Photo</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-3 hover:border-primary/50 hover:bg-muted/50">
                  {photoPreview ? <img src={photoPreview} className="h-16 w-16 rounded-full object-cover" /> : <><Upload className="h-5 w-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Upload</span></>}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }} />
                </label>
              </div>
              <div className="space-y-1">
                <Label>NID</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-3 hover:border-primary/50 hover:bg-muted/50">
                  {nidPreview ? <img src={nidPreview} className="h-16 w-auto rounded-lg object-cover" /> : <><Upload className="h-5 w-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Upload</span></>}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setNidFile(f); setNidPreview(URL.createObjectURL(f)); } }} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any notes..." />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editId ? "Update Staff" : "Add Staff"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewStaff} onOpenChange={() => setViewStaff(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Staff Details</DialogTitle></DialogHeader>
          {viewStaff && (
            <div className="space-y-4">
              {viewStaff.photo_url && (
                <div className="flex justify-center">
                  <img src={viewStaff.photo_url} className="h-24 w-24 rounded-full object-cover border-2 border-border" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Name</p><p className="font-medium">{viewStaff.full_name}</p></div>
                <div><p className="text-muted-foreground">Designation</p><p className="font-medium">{viewStaff.designation || "—"}</p></div>
                <div><p className="text-muted-foreground">Department</p><p className="font-medium">{viewStaff.department || "—"}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{viewStaff.phone || "—"}</p></div>
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{viewStaff.email || "—"}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge variant={viewStaff.status === "active" ? "default" : "secondary"}>{viewStaff.status}</Badge></div>
                <div><p className="text-muted-foreground">Salary</p><p className="font-medium">৳{Number(viewStaff.salary).toLocaleString()}</p></div>
                <div><p className="text-muted-foreground">Pay Method</p><p className="font-medium capitalize">{viewStaff.pay_method || "—"}</p></div>
                <div><p className="text-muted-foreground">Account</p><p className="font-medium">{viewStaff.pay_account_number || "—"}</p></div>
                {viewStaff.bank_name && <div><p className="text-muted-foreground">Bank</p><p className="font-medium">{viewStaff.bank_name}</p></div>}
                {viewStaff.joining_date && <div><p className="text-muted-foreground">Joining Date</p><p className="font-medium">{format(new Date(viewStaff.joining_date), "dd MMM yyyy")}</p></div>}
              </div>
              {viewStaff.address && <div className="text-sm"><p className="text-muted-foreground">Address</p><p>{viewStaff.address}</p></div>}
              {viewStaff.experience && <div className="text-sm"><p className="text-muted-foreground">Experience</p><p className="whitespace-pre-wrap">{viewStaff.experience}</p></div>}
              {viewStaff.educational_qualification && <div className="text-sm"><p className="text-muted-foreground">Educational Qualification</p><p className="whitespace-pre-wrap">{viewStaff.educational_qualification}</p></div>}
              {viewStaff.notes && <div className="text-sm"><p className="text-muted-foreground">Notes</p><p className="whitespace-pre-wrap">{viewStaff.notes}</p></div>}
              {viewStaff.nid_url && <div className="text-sm"><p className="text-muted-foreground mb-1">NID</p><img src={viewStaff.nid_url} className="w-full max-w-sm rounded-lg border" /></div>}
              
              <div className="flex flex-col gap-2 pt-2 border-t">
                {/* CV Print/JPG */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Printer className="h-4 w-4" /> CV Print / Save
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    <DropdownMenuItem onClick={() => printCV(viewStaff)}>
                      <FileText className="h-4 w-4 mr-2" /> Print CV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => saveCVAsJpg(viewStaff)}>
                      <Image className="h-4 w-4 mr-2" /> Save CV as JPG
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* ID Card */}
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { setViewStaff(null); setIdCardStaff(viewStaff); }}>
                  <CreditCard className="h-4 w-4" /> Generate ID Card
                </Button>

                {/* Back to Application */}
                {viewStaff.career_application_id && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      if (confirm("Application এ ফেরত পাঠাতে চান? Staff থেকে মুছে যাবে।")) backToApplication.mutate(viewStaff);
                    }}
                    disabled={backToApplication.isPending}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {backToApplication.isPending ? "Processing..." : "Back to Application"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ID Card Dialog */}
      <Dialog open={!!idCardStaff} onOpenChange={() => setIdCardStaff(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Employee ID Card</DialogTitle></DialogHeader>
          {idCardStaff && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground text-center">Front Side</p>
                  <div dangerouslySetInnerHTML={{ __html: buildIdCardFrontHtml(idCardStaff, branding) }} />
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => saveIdCardAsJpg(idCardStaff, "front")}>
                    <Image className="h-3.5 w-3.5" /> Save Front JPG
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground text-center">Back Side (Common)</p>
                  <div dangerouslySetInnerHTML={{ __html: buildIdCardBackHtml(branding) }} />
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => saveIdCardAsJpg(idCardStaff, "back")}>
                    <Image className="h-3.5 w-3.5" /> Save Back JPG
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStaff;
