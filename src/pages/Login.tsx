import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Phone, ShieldCheck, Loader2 } from "lucide-react";
import { logActivity } from "@/lib/logActivity";
import { normalizeBdPhone } from "@/lib/phone";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const { user, isAdmin, isVendor, loading: authLoading } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const { t, b } = useLanguage();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(isAdmin ? "/admin" : isVendor ? "/vendor" : "/dashboard", { replace: true });
    }
  }, [user, isAdmin, isVendor, authLoading, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const tTimer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(tTimer);
  }, [resendCooldown]);

  const handleSendOtp = async () => {
    const normalized = normalizeBdPhone(phone.trim());
    if (!normalized || normalized.length !== 11) {
      toast.error(b("সঠিক ১১ ডিজিটের ফোন নম্বর দিন (যেমন: 01XXXXXXXXX)", "Please enter a valid 11-digit phone number (e.g. 01XXXXXXXXX)"));
      return;
    }

    setSendingOtp(true);
    try {
      console.log("Sending OTP to:", normalized);
      const { data, error } = await supabase.functions.invoke("login-otp", {
        body: { action: "send_login_otp", phone: normalized },
      });
      console.log("login-otp result:", { data, error });

      let errorMsg: string | null = null;
      if (error) {
        const ctx = (error as any)?.context;
        if (ctx?.json) {
          try { errorMsg = (await ctx.json())?.error || null; } catch {}
        }
        if (!errorMsg && ctx?.text) {
          try { const txt = await ctx.text(); errorMsg = JSON.parse(txt)?.error || txt; } catch {}
        }
        toast.error(errorMsg || error.message || b("OTP পাঠাতে সমস্যা হয়েছে", "Failed to send OTP"));
        setSendingOtp(false);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        setSendingOtp(false);
        return;
      }
      setPhone(normalized);
      setOtpSent(true);
      setResendCooldown(60);
      toast.success(b("OTP কোড আপনার ফোনে পাঠানো হয়েছে!", "OTP code sent to your phone!"));
    } catch (err: any) {
      console.error("handleSendOtp error:", err);
      toast.error(err.message || b("OTP পাঠাতে সমস্যা হয়েছে", "Failed to send OTP"));
    }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error(b("৬ ডিজিটের OTP দিন", "Please enter 6-digit OTP"));
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("login-otp", {
        body: { action: "verify_login_otp", phone: normalizeBdPhone(phone), otp: cleanOtp },
      });
      let errorMsg: string | null = null;
      if (error) {
        const ctx = (error as any)?.context;
        if (ctx?.json) { try { errorMsg = (await ctx.json())?.error || null; } catch {} }
        if (!errorMsg && ctx?.text) {
          try { const txt = await ctx.text(); errorMsg = JSON.parse(txt)?.error || txt; } catch {}
        }
        toast.error(errorMsg || error.message || b("Login করতে সমস্যা হয়েছে", "Login failed"));
        setVerifying(false);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        setVerifying(false);
        return;
      }

      // Sign in via OTP token from edge function
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
        toast.error(b("Login করতে সমস্যা হয়েছে", "Login failed"));
        setVerifying(false);
        return;
      }

      toast.success(b("লগইন সফল হয়েছে!", "Login successful!"));
      logActivity({ action: "user_login", details: `Phone: ${phone}` });

      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", sessionData.user.id);
        const roles = (roleData || []).map((r) => r.role);
        const roleLabel = roles.includes("admin") ? "Admin" : roles.includes("vendor") ? "Vendor" : "User";
        supabase.functions
          .invoke("login-sms-notify", { body: { role: roleLabel, user_id: sessionData.user.id } })
          .catch((err) => console.error("Login SMS notify error:", err));

        if (roles.includes("admin")) navigate("/admin", { replace: true });
        else if (roles.includes("vendor")) navigate("/vendor", { replace: true });
        else navigate("/dashboard", { replace: true });
      } catch {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || b("Login করতে সমস্যা হয়েছে", "Login failed"));
    }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md relative">
          {/* Subtle Ambient Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/15 via-blue-500/15 to-emerald-500/15 rounded-3xl blur-xl opacity-60 pointer-events-none" />

          <Card className="relative border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md overflow-hidden">
            {/* Top Brand Accent Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-500 to-emerald-500" />

            <CardHeader className="text-center pb-4 pt-7 px-6 sm:px-8">
              {siteSettings?.logo_url && (
                <div className="flex justify-center mb-3">
                  <img
                    src={siteSettings.logo_url}
                    alt={siteSettings.site_name || "Sheikh Pharma"}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20 shadow-sm bg-white p-0.5"
                  />
                </div>
              )}
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {siteSettings?.site_name || "Sheikh Pharma"} {t("auth.login_title")}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {otpSent ? t("auth.otp_sub") : t("auth.login_sub")}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleVerifyOtp}>
              <CardContent className="space-y-5 px-6 sm:px-8">
                {/* Phone Number Input with OTP Send Button */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("auth.phone_label")}
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
                      className="flex-1 h-11 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                    />
                    {!otpSent && (
                      <Button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || !phone.trim()}
                        className="shrink-0 h-11 px-5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-white shadow-sm"
                      >
                        {sendingOtp ? (
                          <div className="flex items-center gap-1.5">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{t("auth.sending")}</span>
                          </div>
                        ) : (
                          t("auth.send_otp")
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* 6 Digit Segmented OTP Boxes */}
                {otpSent && (
                  <div className="space-y-3 pt-1 animate-in fade-in-50 duration-300">
                    <Label htmlFor="otp" className="text-sm font-semibold text-slate-700 dark:text-slate-200 block text-center">
                      {t("auth.otp_label")}
                    </Label>

                    <div className="flex justify-center py-1">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(val) => setOtp(val.replace(/[^0-9]/g, ""))}
                        autoFocus
                        containerClassName="justify-center"
                      >
                        <InputOTPGroup className="gap-2 sm:gap-2.5">
                          {[0, 1, 2, 3, 4, 5].map((idx) => (
                            <InputOTPSlot
                              key={idx}
                              index={idx}
                              className="w-10 h-12 sm:w-12 sm:h-14 text-xl font-bold rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm first:rounded-xl last:rounded-xl first:border-l-2 focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all text-slate-900 dark:text-slate-50"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Phone className="h-3 w-3" /> {phone}
                      </span>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={resendCooldown > 0 || sendingOtp}
                        className="text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        {resendCooldown > 0 ? `${t("auth.resend_in")} ${resendCooldown}s` : t("auth.resend_otp")}
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-3 px-6 sm:px-8 pb-7 pt-4">
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md transition-all active:scale-[0.99]"
                  disabled={verifying || !otpSent || otp.length !== 6}
                >
                  {verifying ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t("auth.verifying")}</span>
                    </div>
                  ) : (
                    t("auth.verify_login")
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  {t("auth.auto_account_note")}
                </p>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{t("auth.secure_badge")}</span>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
