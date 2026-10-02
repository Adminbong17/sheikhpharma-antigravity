import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Eye, Trash2, Briefcase, Printer, UserPlus, Image, FileText, Receipt } from "lucide-react";
import { format } from "date-fns";
import BackButton from "@/components/BackButton";
import { type PrintColumn } from "@/lib/printExport";
import PrintExportButtons from "@/components/PrintExportButtons";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CareerApp = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string | null;
  experience: string | null;
  educational_qualification: string | null;
  photo_url: string | null;
  nid_url: string | null;
  status: string;
  created_at: string;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const printColumns: PrintColumn[] = [
  { header: "Name", accessor: (r: CareerApp) => r.full_name },
  { header: "Email", accessor: (r: CareerApp) => r.email },
  { header: "Phone", accessor: (r: CareerApp) => r.phone },
  { header: "Qualification", accessor: (r: CareerApp) => r.educational_qualification || "—" },
  { header: "Status", accessor: (r: CareerApp) => r.status },
  { header: "Date", accessor: (r: CareerApp) => format(new Date(r.created_at), "dd MMM yyyy") },
];

const buildCVHtml = (app: CareerApp, branding: any, forJpg = false) => {
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

  return `<!DOCTYPE html><html><head><title>CV - ${app.full_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #222; max-width: 800px; margin: 0 auto; background: #fff; }
    .letterhead { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 2px solid #333; margin-bottom: 20px; }
    .letterhead-name { font-weight: 700; font-size: 20px; letter-spacing: 0.5px; }
    .header { text-align: center; margin-bottom: 30px; }
    .photo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #333; margin-bottom: 10px; }
    .name { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    .contact { font-size: 13px; color: #555; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; letter-spacing: 1px; }
    .section-body { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    .nid-section img { max-width: 400px; border: 1px solid #ccc; border-radius: 8px; margin-top: 8px; }
    .no-upload { font-style: italic; color: #999; font-size: 13px; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
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
    ${app.photo_url ? `<img src="${app.photo_url}" class="photo" crossorigin="anonymous" />` : ""}
    <div class="name">${app.full_name}</div>
    <div class="contact">${app.email} | ${app.phone}</div>
  </div>
  ${app.address ? `<div class="section"><div class="section-title">Address</div><div class="section-body">${app.address}</div></div>` : ""}
  ${app.educational_qualification ? `<div class="section"><div class="section-title">Educational Qualification</div><div class="section-body">${app.educational_qualification}</div></div>` : ""}
  ${app.experience ? `<div class="section"><div class="section-title">Experience</div><div class="section-body">${app.experience}</div></div>` : ""}
  <div class="section nid-section">
    <div class="section-title">NID (National ID)</div>
    ${app.nid_url ? `<img src="${app.nid_url}" crossorigin="anonymous" />` : '<p class="no-upload">আপলোড করেনি</p>'}
  </div>
  <div class="footer">Applied on: ${format(new Date(app.created_at), "dd MMM yyyy, hh:mm a")}</div>
  <div class="signature">
    <div class="signature-line">
      <div class="signature-name">${branding.ceoName || "CEO"}</div>
      <div class="signature-label">Authorized Signature</div>
    </div>
  </div>
  </body></html>`;
};

const AdminCareers = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<CareerApp | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const { data: siteSettings } = useSiteSettings();

  const branding = {
    logoUrl: siteSettings?.logo_url,
    siteName: siteSettings?.site_name,
    ceoName: (siteSettings as any)?.ceo_name || "CEO",
    officeAddress: (siteSettings as any)?.office_address,
    officePhone: (siteSettings as any)?.office_phone,
    officeEmail: (siteSettings as any)?.office_email,
  };

  const printCV = (app: CareerApp) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildCVHtml(app, branding));
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const saveCVAsJpg = async (app: CareerApp) => {
    const { default: html2canvas } = await import("html2canvas");
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;background:white;width:794px;";
    const htmlContent = buildCVHtml(app, branding, true)
      .replace(/<!DOCTYPE html>|<\/?html>|<\/?head>|<title>.*?<\/title>/gi, "")
      .replace(/<\/?body>/gi, "");
    container.innerHTML = htmlContent;
    document.body.appendChild(container);
    try {
      await new Promise(r => setTimeout(r, 500));
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `CV_${app.full_name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } finally {
      document.body.removeChild(container);
    }
  };

  const sendToStaff = useMutation({
    mutationFn: async (app: CareerApp) => {
      const { error } = await (supabase.from("staff_members" as any) as any).insert({
        full_name: app.full_name,
        email: app.email || null,
        phone: app.phone || null,
        address: app.address || null,
        photo_url: app.photo_url || null,
        nid_url: app.nid_url || null,
        experience: app.experience || null,
        educational_qualification: app.educational_qualification || null,
        career_application_id: app.id,
        status: "active",
      });
      if (error) throw error;
      // Update career application status to accepted
      await (supabase.from("career_applications" as any) as any)
        .update({ status: "accepted" })
        .eq("id", app.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-applications"] });
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      toast.success("Staff এ পাঠানো হয়েছে!");
      setSelected(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["career-applications"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("career_applications" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CareerApp[];
    },
  });

  // Check which applications are already sent to staff
  const { data: staffLinks = [] } = useQuery({
    queryKey: ["staff-career-links"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("staff_members" as any) as any)
        .select("career_application_id")
        .not("career_application_id", "is", null);
      if (error) throw error;
      return (data as any[]).map((d: any) => d.career_application_id);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from("career_applications" as any) as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-applications"] });
      toast.success("Status updated");
    },
  });

  const deleteApp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("career_applications" as any) as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-applications"] });
      toast.success("Application deleted");
    },
  });

  const isAlreadyStaff = (appId: string) => staffLinks.includes(appId);

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Career Applications</h1>
          <Badge variant="secondary">{applications.length}</Badge>
        </div>
        {applications.length > 0 && (
          <PrintExportButtons
            title="Career Applications"
            columns={printColumns}
            data={applications}
          />
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : applications.length === 0 ? (
        <p className="text-muted-foreground">No career applications yet.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {applications.map((app) => (
              <div key={app.id} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{app.full_name}</p>
                    <p className="text-xs text-muted-foreground">{app.email}</p>
                    <p className="text-xs text-muted-foreground">{app.phone}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAlreadyStaff(app.id) && <Badge variant="outline" className="text-[10px]">Staff</Badge>}
                    <Badge className={statusColors[app.status] || ""} >{app.status}</Badge>
                  </div>
                </div>
                {app.educational_qualification && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{app.educational_qualification}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{format(new Date(app.created_at), "dd MMM yyyy")}</span>
                  <div className="flex gap-1">
                    <Select value={app.status} onValueChange={(val) => updateStatus.mutate({ id: app.id, status: val })}>
                      <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(app)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                      if (confirm("Delete?")) deleteApp.mutate(app.id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="rounded-lg border overflow-auto hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      {app.full_name}
                      {isAlreadyStaff(app.id) && <Badge variant="outline" className="ml-2 text-[10px]">Staff</Badge>}
                    </TableCell>
                    <TableCell>{app.email}</TableCell>
                    <TableCell>{app.phone}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{app.educational_qualification || "—"}</TableCell>
                    <TableCell>
                      <Select value={app.status} onValueChange={(val) => updateStatus.mutate({ id: app.id, status: val })}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewed">Reviewed</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(app.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setSelected(app)}><Eye className="h-4 w-4" /></Button>
                        {!isAlreadyStaff(app.id) && (
                          <Button size="icon" variant="ghost" title="Send to Staff" onClick={() => {
                            if (confirm("Send to Staff?")) sendToStaff.mutate(app);
                          }}><UserPlus className="h-4 w-4 text-green-600" /></Button>
                        )}
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                          if (confirm("Delete this application?")) deleteApp.mutate(app.id);
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Application Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {selected.photo_url ? (
                  <img
                    src={selected.photo_url}
                    alt="Applicant"
                    className="h-32 w-32 rounded-full object-cover border-2 border-border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setZoomedImage(selected.photo_url)}
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
                    <p className="text-xs text-muted-foreground text-center">Photo<br/>আপলোড করেনি</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Full Name</p><p className="font-medium">{selected.full_name}</p></div>
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selected.email}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selected.phone}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge className={statusColors[selected.status] || ""}>{selected.status}</Badge></div>
              </div>
              {selected.address && (<div className="text-sm"><p className="text-muted-foreground">Address</p><p>{selected.address}</p></div>)}
              {selected.experience && (<div className="text-sm"><p className="text-muted-foreground">Experience</p><p className="whitespace-pre-wrap">{selected.experience}</p></div>)}
              {selected.educational_qualification && (<div className="text-sm"><p className="text-muted-foreground">Educational Qualification</p><p className="whitespace-pre-wrap">{selected.educational_qualification}</p></div>)}
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">NID</p>
                {selected.nid_url ? (
                  <img
                    src={selected.nid_url}
                    alt="NID"
                    className="w-full max-w-sm rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setZoomedImage(selected.nid_url)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">NID আপলোড করেনি</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Applied on: {format(new Date(selected.created_at), "dd MMM yyyy, hh:mm a")}</p>
              
              <div className="flex flex-col gap-2">
                {/* CV Print/JPG dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Printer className="h-4 w-4" /> CV Print / Save
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    <DropdownMenuItem onClick={() => printCV(selected)}>
                      <FileText className="h-4 w-4 mr-2" /> Print CV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => saveCVAsJpg(selected)}>
                      <Image className="h-4 w-4 mr-2" /> Save CV as JPG
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Send to Staff button */}
                {!isAlreadyStaff(selected.id) ? (
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      if (confirm("Send to Staff?")) sendToStaff.mutate(selected);
                    }}
                    disabled={sendToStaff.isPending}
                  >
                    <UserPlus className="h-4 w-4" />
                    {sendToStaff.isPending ? "Sending..." : "Send to Staff"}
                  </Button>
                ) : (
                  <Badge variant="outline" className="w-full justify-center py-2">Already in Staff</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen Image Zoom Dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4 flex items-center justify-center">
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="Zoomed view"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCareers;
