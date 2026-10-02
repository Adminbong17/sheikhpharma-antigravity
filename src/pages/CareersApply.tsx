import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Briefcase, Upload, CreditCard, UserCircle } from "lucide-react";

const CareersApply = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", address: "",
    experience: "", educational_qualification: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [nidPreview, setNidPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (file: File | null, type: "photo" | "nid") => {
    if (!file) return;
    if (type === "photo") {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setNidFile(file);
      setNidPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      let photoUrl: string | null = null;
      let nidUrl: string | null = null;
      const ts = Date.now();

      if (photoFile) {
        photoUrl = await uploadFile(photoFile, `career-photos/${ts}-${photoFile.name}`);
      }
      if (nidFile) {
        nidUrl = await uploadFile(nidFile, `career-nids/${ts}-${nidFile.name}`);
      }

      const { error } = await (supabase.from("career_applications" as any) as any).insert({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        address: form.address || null,
        experience: form.experience || null,
        educational_qualification: form.educational_qualification || null,
        photo_url: photoUrl,
        nid_url: nidUrl,
      });
      if (error) throw error;
      toast.success("Application submitted successfully!");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex items-center justify-center px-4 py-20">
          <Card className="w-full max-w-lg text-center">
            <CardContent className="py-12 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Briefcase className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Application Submitted!</h2>
              <p className="text-muted-foreground">Thank you for your interest. We will review your application and get back to you soon.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="mb-4"><BackButton /></div>
        <div className="flex items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Career Application</CardTitle>
            <CardDescription>Join our team — fill in your details below</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Your address" />
              </div>
              <div className="space-y-2">
                <Label>Experience</Label>
                <Textarea value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="Describe your work experience..." />
              </div>
              <div className="space-y-2">
                <Label>Educational Qualification</Label>
                <Textarea value={form.educational_qualification} onChange={(e) => setForm({ ...form, educational_qualification: e.target.value })} placeholder="e.g. BSc in Computer Science, HSC..." />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><UserCircle className="h-4 w-4" /> Photo</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/50">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Photo preview" className="h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <>
                      <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload your photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] || null, "photo")} />
                </label>
              </div>

              {/* NID Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> NID (National ID Card)</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-muted/50">
                  {nidPreview ? (
                    <img src={nidPreview} alt="NID preview" className="h-20 w-auto rounded-lg object-cover" />
                  ) : (
                    <>
                      <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload NID photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] || null, "nid")} />
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </CardContent>
          </form>
        </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CareersApply;
