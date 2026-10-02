import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type PaymentLink = {
  id: string;
  token: string;
  title: string;
  description: string | null;
  fixed_amount: number | null;
  is_active: boolean;
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_color: string | null;
  brand_website: string | null;
  brand_footer_note: string | null;
  hide_site_chrome: boolean | null;
  require_otp: boolean | null;
  custom_fields: CustomField[] | null;
  mode: string | null;
};

type CustomField = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea";
  placeholder?: string;
  required?: boolean;
};

type Phase = "loading" | "form" | "verifying" | "success" | "failed" | "notfound";

const hexToHsl = (hex: string): string | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const PayLink = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [trxId, setTrxId] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const paymentID = searchParams.get("paymentID");
  const bkashStatus = searchParams.get("status");
  const payId = searchParams.get("pay_id");

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase.from("payment_links" as any) as any)
        .select("id, token, title, description, fixed_amount, is_active, brand_name, brand_logo_url, brand_color, brand_website, brand_footer_note, hide_site_chrome, require_otp, custom_fields, mode")
        .eq("token", token)
        .maybeSingle();

      if (!data || !data.is_active) {
        setPhase("notfound");
        return;
      }
      setLink(data as PaymentLink);
      if (data.fixed_amount) setAmount(String(data.fixed_amount));

      if (payId && paymentID && bkashStatus === "success") {
        setPhase("verifying");
        const res = await supabase.functions.invoke("payment-link-verify", {
          body: { paymentID, pay_id: payId },
        });
        if (res.data?.success) {
          setTrxId(res.data.trxID || "");
          setPhase("success");
        } else {
          setMessage(res.data?.error || "পেমেন্ট সম্পন্ন হয়নি");
          setPhase("failed");
        }
        return;
      }

      if (payId && bkashStatus && bkashStatus !== "success") {
        setMessage("পেমেন্ট বাতিল করা হয়েছে।");
        setPhase("failed");
        return;
      }

      setPhase("form");
    };
    load();
  }, [token, paymentID, bkashStatus, payId]);

  // Apply per-link brand color + page title
  useEffect(() => {
    if (!link) return;
    if (link.brand_name) document.title = `${link.brand_name} — Payment`;
    const hsl = link.brand_color ? hexToHsl(link.brand_color) : null;
    if (hsl) {
      document.documentElement.style.setProperty("--primary", hsl);
      document.documentElement.style.setProperty("--ring", hsl);
    }
    return () => {
      if (hsl) {
        document.documentElement.style.removeProperty("--primary");
        document.documentElement.style.removeProperty("--ring");
      }
    };
  }, [link]);

  const requireOtp = !!link?.require_otp;
  const isFormMode = link?.mode === "form";
  const customFields: CustomField[] = Array.isArray(link?.custom_fields) ? (link!.custom_fields as CustomField[]) : [];

  const sendOtp = async () => {
    if (!/^01[3-9]\d{8}$/.test(phone.trim())) {
      toast.error("সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)");
      return;
    }
    setOtpBusy(true);
    const { data, error } = await supabase.functions.invoke("payment-link-otp", {
      body: { action: "send", token, phone: phone.trim() },
    });
    setOtpBusy(false);
    if (error || !data?.ok) {
      toast.error(data?.error || "কোড পাঠানো যায়নি");
      return;
    }
    setOtpSent(true);
    setOtpDigits(["", "", "", ""]);
    toast.success("আপনার নম্বরে ৪ ডিজিটের কোড পাঠানো হয়েছে");
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const verifyOtp = async (code?: string) => {
    const otp = (code ?? otpDigits.join("")).trim();
    if (otp.length !== 4) { toast.error("৪ ডিজিটের কোড দিন"); return; }
    setOtpBusy(true);
    const { data, error } = await supabase.functions.invoke("payment-link-otp", {
      body: { action: "verify", token, phone: phone.trim(), otp },
    });
    setOtpBusy(false);
    if (error || !data?.ok) {
      toast.error(data?.error || "কোডটি সঠিক নয়");
      return;
    }
    setPhoneVerified(true);
    toast.success("নম্বর যাচাই সফল হয়েছে");
  };

  const onOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < 3) otpRefs.current[idx + 1]?.focus();
    if (next.every((d) => d)) verifyOtp(next.join(""));
  };

  const handleSubmitForm = async () => {
    for (const f of customFields) {
      if (f.required && !String(customValues[f.key] || "").trim()) {
        toast.error(`${f.label} পূরণ করুন`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-link-submit", {
        body: { token, name: name || null, phone: phone || null, data: customValues },
      });
      if (error || !data?.ok) throw new Error(data?.error || "তথ্য জমা দেওয়া যায়নি");
      setPhase("success");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 1) {
      toast.error("সঠিক টাকার অংক লিখুন");
      return;
    }
    setSubmitting(true);
    try {
      const callbackUrl = `${window.location.origin}/pay/${token}`;
      const { data, error } = await supabase.functions.invoke("payment-link-create", {
        body: {
          token,
          amount: amt,
          payer_name: name || null,
          payer_phone: phone || null,
          custom_data: customValues,
          callback_url: callbackUrl,
        },
      });
      if (error || !data?.ok || !data?.bkashURL) {
        throw new Error(data?.error || "bKash পেমেন্ট শুরু করা যায়নি");
      }
      window.location.href = data.bkashURL;
    } catch (err) {
      toast.error((err as Error).message);
      setSubmitting(false);
    }
  };

  const brandHeader = link && (link.brand_logo_url || link.brand_name) ? (
    <div className="flex flex-col items-center gap-3 mb-6 text-center">
      {link.brand_logo_url && (
        <img
          src={link.brand_logo_url}
          alt={`${link.brand_name || link.title} logo`}
          className="h-14 w-auto object-contain"
          loading="lazy"
        />
      )}
      {link.brand_name && <h2 className="text-lg font-bold">{link.brand_name}</h2>}
    </div>
  ) : null;

  const content = (
    <main className="container mx-auto px-4 py-10 min-h-[70vh] flex items-start justify-center">
      <div className="w-full max-w-md">
        {brandHeader}

        {phase === "loading" && (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}

        {phase === "notfound" && (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <XCircle className="h-14 w-14 text-destructive" />
              <h1 className="text-xl font-bold">লিংকটি পাওয়া যায়নি</h1>
              <p className="text-muted-foreground text-sm">এই পেমেন্ট লিংকটি বাতিল বা নিষ্ক্রিয় করা হয়েছে।</p>
            </CardContent>
          </Card>
        )}

        {phase === "verifying" && (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h1 className="text-xl font-bold">পেমেন্ট যাচাই করা হচ্ছে...</h1>
              <p className="text-muted-foreground text-sm">একটু অপেক্ষা করুন, পেজটি বন্ধ করবেন না।</p>
            </CardContent>
          </Card>
        )}

        {phase === "success" && (
          <Card className="rounded-2xl border-primary/30">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-primary" />
              <h1 className="text-xl font-bold">
                {isFormMode ? "তথ্য জমা হয়েছে!" : "পেমেন্ট সফল হয়েছে!"}
              </h1>
              {trxId && (
                <p className="text-sm text-muted-foreground">
                  ট্রানজেকশন আইডি: <span className="font-semibold text-foreground">{trxId}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {isFormMode
                  ? "ধন্যবাদ। আপনার তথ্য আমরা সংরক্ষণ করেছি।"
                  : "ধন্যবাদ। আপনার পেমেন্ট আমরা পেয়েছি।"}
              </p>
            </CardContent>
          </Card>
        )}

        {phase === "failed" && (
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <XCircle className="h-16 w-16 text-destructive" />
              <h1 className="text-xl font-bold">পেমেন্ট ব্যর্থ</h1>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button variant="outline" onClick={() => { setPhase("form"); setMessage(""); }}>
                আবার চেষ্টা করুন
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === "form" && link && (
          <Card className="rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">{link.title}</CardTitle>
              {link.description && (
                <p className="text-sm text-muted-foreground">{link.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!isFormMode && (
                <div className="space-y-2">
                  <Label htmlFor="amount">টাকার অংক (BDT)</Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={amount}
                    disabled={!!link.fixed_amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="যেমন: 500"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">নাম (ঐচ্ছিক)</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" />
              </div>
              {customFields.map((f) => (
                <div className="space-y-2" key={f.key}>
                  <Label htmlFor={`cf-${f.key}`}>
                    {f.label}{f.required ? " *" : " (ঐচ্ছিক)"}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      id={`cf-${f.key}`}
                      value={customValues[f.key] || ""}
                      placeholder={f.placeholder || ""}
                      onChange={(e) => setCustomValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={`cf-${f.key}`}
                      type={f.type === "number" ? "number" : "text"}
                      value={customValues[f.key] || ""}
                      placeholder={f.placeholder || ""}
                      onChange={(e) => setCustomValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="phone">মোবাইল নম্বর {requireOtp ? "*" : "(ঐচ্ছিক)"}</Label>
                <Input
                  id="phone"
                  inputMode="numeric"
                  value={phone}
                  disabled={phoneVerified}
                  onChange={(e) => { setPhone(e.target.value); setOtpSent(false); setPhoneVerified(false); }}
                  placeholder="01XXXXXXXXX"
                />
              </div>

              {requireOtp && !phoneVerified && (
                <div className="space-y-3 rounded-xl border border-border p-4">
                  {!otpSent ? (
                    <Button className="w-full" variant="outline" onClick={sendOtp} disabled={otpBusy}>
                      {otpBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      নম্বর যাচাই করুন
                    </Button>
                  ) : (
                    <>
                      <p className="text-sm text-center text-muted-foreground">
                        {phone} নম্বরে পাঠানো ৪ ডিজিটের কোড দিন
                      </p>
                      <div className="flex justify-center gap-3" dir="ltr">
                        {otpDigits.map((d, i) => (
                          <input
                            key={i}
                            ref={(el) => (otpRefs.current[i] = el)}
                            value={d}
                            inputMode="numeric"
                            maxLength={1}
                            onChange={(e) => onOtpChange(i, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !otpDigits[i] && i > 0) otpRefs.current[i - 1]?.focus();
                            }}
                            className="h-14 w-12 rounded-xl border border-input bg-background text-center text-2xl font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Button variant="ghost" size="sm" onClick={sendOtp} disabled={otpBusy}>
                          আবার কোড পাঠান
                        </Button>
                        <Button size="sm" onClick={() => verifyOtp()} disabled={otpBusy}>
                          {otpBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          যাচাই করুন
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {requireOtp && phoneVerified && (
                <p className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="h-4 w-4" /> নম্বর যাচাই সম্পন্ন
                </p>
              )}

              {(!requireOtp || phoneVerified) && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={isFormMode ? handleSubmitForm : handlePay}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isFormMode ? "তথ্য জমা দিন" : "bKash দিয়ে পেমেন্ট করুন"}
                </Button>
              )}
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                {isFormMode ? "আপনার তথ্য নিরাপদে সংরক্ষিত হবে" : "নিরাপদ bKash পেমেন্ট গেটওয়ে"}
              </p>
            </CardContent>
          </Card>
        )}

        {link && (link.brand_footer_note || link.brand_website) && (
          <div className="mt-8 text-center text-xs text-muted-foreground space-y-1">
            {link.brand_footer_note && <p>{link.brand_footer_note}</p>}
            {link.brand_website && (
              <a
                href={link.brand_website}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {link.brand_website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );

  return content;
};

export default PayLink;
