import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import { normalizeBdPhone } from "@/lib/phone";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    const normalized = normalizeBdPhone(phone.trim());
    if (!normalized || normalized.length !== 11) {
      toast.error("সঠিক ১১ ডিজিটের ফোন নম্বর দিন");
      return;
    }
    if (!name.trim()) {
      toast.error("আপনার নাম দিন");
      return;
    }

    setSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("login-otp", {
        body: { action: "send_signup_otp", phone: normalized },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setSendingOtp(false);
        return;
      }
      setPhone(normalized);
      setOtpSent(true);
      setResendCooldown(60);
      toast.success("OTP কোড আপনার ফোনে পাঠানো হয়েছে!");
    } catch (err: any) {
      toast.error(err.message || "OTP পাঠাতে সমস্যা হয়েছে");
    }
    setSendingOtp(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      toast.error("৬ ডিজিটের OTP দিন");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("login-otp", {
        body: {
          action: "verify_signup_otp",
          phone: normalizeBdPhone(phone),
          otp: otp.trim(),
          name: name.trim(),
          email: email.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setCreating(false);
        return;
      }

      // Auto-login via OTP token
      let sessionData: any = null;
      let verifyErr: any = null;
      if (data.email_otp && data.email) {
        const res = await supabase.auth.verifyOtp({
          type: "email",
          email: data.email,
          token: data.email_otp,
        });
        sessionData = res.data;
        verifyErr = res.error;
      } else if (data.token_hash) {
        const res = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: data.token_hash,
        } as any);
        sessionData = res.data;
        verifyErr = res.error;
      }

      if (verifyErr || !sessionData?.session) {
        console.error("verifyOtp error:", verifyErr);
        toast.success("Account তৈরি হয়েছে! Login করুন।");
        setTimeout(() => navigate("/login"), 1500);
        setCreating(false);
        return;
      }

      toast.success("Account তৈরি হয়েছে!");
      logActivity({ action: "user_signup", details: `Phone: ${phone}` });
      setTimeout(() => navigate("/dashboard", { replace: true }), 800);
    } catch (err: any) {
      toast.error(err.message || "Signup করতে সমস্যা হয়েছে");
    }
    setCreating(false);
  };

  return (
    <>
      <Navbar />
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">Create Account</CardTitle>
            <CardDescription>
              {otpSent ? "ফোনে পাঠানো OTP কোডটি দিন" : "নাম ও ফোন নম্বর দিয়ে Sign Up করুন"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="আপনার নাম"
                  disabled={otpSent}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (otpSent) {
                        setOtpSent(false);
                        setOtp("");
                      }
                    }}
                    required
                    placeholder="01XXXXXXXXX"
                    disabled={otpSent}
                    className="flex-1"
                  />
                  {!otpSent && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || !phone.trim() || !name.trim()}
                      className="shrink-0 h-10"
                    >
                      {sendingOtp ? "পাঠানো হচ্ছে..." : "OTP পাঠান"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={otpSent}
                />
              </div>

              {otpSent && (
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP কোড (৬ ডিজিট)</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    maxLength={6}
                    autoFocus
                    className="text-center text-lg tracking-widest"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {phone}
                    </span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={resendCooldown > 0 || sendingOtp}
                      className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={creating || !otpSent || otp.length !== 6}>
                {creating ? "তৈরি হচ্ছে..." : "Create Account"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default Signup;
