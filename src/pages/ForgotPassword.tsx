import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Phone } from "lucide-react";
import { normalizeBdPhone } from "@/lib/phone";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("ফোন নম্বর দিন");
      return;
    }

    setLoading(true);

    const normalized = normalizeBdPhone(identifier.trim());
    if (!normalized) {
      toast.error("সঠিক ফোন নম্বর দিন (01XXXXXXXXX)");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("password-reset-sms", {
        body: { action: "send_otp", phone: normalized },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      setIdentifier(normalized);
      setOtpSent(true);
      toast.success("OTP কোড SMS এ পাঠানো হয়েছে!");
    } catch (err: any) {
      toast.error(err.message || "SMS পাঠাতে সমস্যা হয়েছে");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("OTP কোড দিন");
      return;
    }
    if (newPassword.length < 5) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৫ অক্ষরের হতে হবে");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না");
      return;
    }

    const normalized = normalizeBdPhone(identifier.trim());
    if (!normalized) {
      toast.error("সঠিক ফোন নম্বর দিন");
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("password-reset-sms", {
        body: { action: "verify_otp", phone: normalized, otp: otp.trim(), new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setVerifying(false);
        return;
      }

      // Try auto-login
      if (data?.auth_email) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: data.auth_email,
          password: newPassword,
        });
        if (!loginError) {
          toast.success("পাসওয়ার্ড আপডেট হয়েছে! লগইন হচ্ছে...");
          setTimeout(() => navigate("/dashboard", { replace: true }), 1000);
          setVerifying(false);
          return;
        }
      }

      setResetDone(true);
      toast.success("পাসওয়ার্ড সফলভাবে আপডেট হয়েছে!");
    } catch (err: any) {
      toast.error(err.message || "OTP ভেরিফাই করতে সমস্যা হয়েছে");
    }
    setVerifying(false);
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">পাসওয়ার্ড রিসেট</CardTitle>
            <CardDescription className="flex items-center justify-center gap-1.5">
              <Phone className="h-4 w-4" /> ফোন নম্বর দিয়ে পাসওয়ার্ড রিসেট করুন
            </CardDescription>
          </CardHeader>

          <CardContent>
            {resetDone ? (
              <div className="py-4 text-center space-y-3">
                <p className="text-sm font-medium text-primary">✅ পাসওয়ার্ড সফলভাবে আপডেট হয়েছে!</p>
                <Link to="/login">
                  <Button className="w-full">লগইন করুন</Button>
                </Link>
              </div>
            ) : !otpSent ? (
              <form onSubmit={handleSendReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">ফোন নম্বর</Label>
                  <Input
                    id="identifier"
                    type="tel"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="01XXXXXXXXX"
                  />
                  {identifier.trim() && (
                    <p className="text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> SMS এ OTP কোড পাঠানো হবে</span>
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "পাঠানো হচ্ছে..." : "OTP কোড পাঠান"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP কোড (6 ডিজিট)</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    placeholder="123456"
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">{identifier} নম্বরে পাঠানো ৬ ডিজিটের কোডটি লিখুন</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">নতুন পাসওয়ার্ড (কমপক্ষে ৫ অক্ষর)</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      minLength={5}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPass">পাসওয়ার্ড নিশ্চিত করুন</Label>
                  <Input
                    id="confirmPass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={5}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={verifying}>
                  {verifying ? "ভেরিফাই হচ্ছে..." : "পাসওয়ার্ড আপডেট করুন"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                  }}
                >
                  আবার OTP পাঠান
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center pb-6">
            <Link to="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> লগইনে ফিরে যান
            </Link>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default ForgotPassword;
