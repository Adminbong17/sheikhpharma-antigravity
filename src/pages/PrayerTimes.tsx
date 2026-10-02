import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MapPin, Settings, Sunrise, Sunset, Bell, BellOff, Compass } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BD_CITIES, fetchPrayerTimings, formatTime12h, getCurrentAndNext } from "@/components/PrayerTimesWidget";

const STORAGE_KEY = "prayer-city";

const PRAYERS = [
  { key: "Fajr" as const, label: "Fajr", icon: "🌄" },
  { key: "Dhuhr" as const, label: "Dhuhr", icon: "☀️" },
  { key: "Asr" as const, label: "Asr", icon: "🌤️" },
  { key: "Maghrib" as const, label: "Maghrib", icon: "🌅" },
  { key: "Isha" as const, label: "Isha", icon: "🌙" },
];

// Kaaba coordinates
const KAABA = { lat: 21.4225, lng: 39.8262 };

const calcQiblaBearing = (lat: number, lng: number) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA.lat);
  const Δλ = toRad(KAABA.lng - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const QiblaCompass = ({ lat, lng }: { lat: number; lng: number }) => {
  const [heading, setHeading] = useState<number | null>(null);
  const [permission, setPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const qiblaBearing = useMemo(() => calcQiblaBearing(lat, lng), [lat, lng]);

  useEffect(() => {
    const handler = (e: any) => {
      const a = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null);
      if (a != null) setHeading(a);
    };
    if (permission === "granted") {
      window.addEventListener("deviceorientationabsolute", handler as any);
      window.addEventListener("deviceorientation", handler as any);
      return () => {
        window.removeEventListener("deviceorientationabsolute", handler as any);
        window.removeEventListener("deviceorientation", handler as any);
      };
    }
  }, [permission]);

  const requestAccess = async () => {
    const DOE: any = (window as any).DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === "function") {
      try {
        const res = await DOE.requestPermission();
        setPermission(res === "granted" ? "granted" : "denied");
      } catch {
        setPermission("denied");
      }
    } else {
      setPermission("granted");
    }
  };

  const rotation = heading != null ? qiblaBearing - heading : qiblaBearing;
  const aligned = heading != null && Math.abs(((rotation + 540) % 360) - 180) < 5;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-bold mb-1 flex items-center gap-2">
        <Compass className="h-4 w-4 text-rose-600" /> কিবলা খুঁজুন
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Qibla bearing: <span className="font-semibold">{qiblaBearing.toFixed(1)}°</span> from North
      </p>

      <div className="relative mx-auto h-56 w-56 rounded-full border-4 border-border bg-gradient-to-br from-muted/40 to-background flex items-center justify-center">
        {/* Cardinal marks */}
        {["N", "E", "S", "W"].map((dir, i) => (
          <span
            key={dir}
            className="absolute text-xs font-bold text-muted-foreground"
            style={{
              transform: `rotate(${i * 90}deg) translateY(-100px) rotate(-${i * 90}deg)`,
            }}
          >
            {dir}
          </span>
        ))}
        {/* Needle pointing to Qibla */}
        <div
          className="absolute inset-0 flex items-start justify-center transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="mt-3 flex flex-col items-center">
            <div className={`h-0 w-0 border-l-[10px] border-r-[10px] border-b-[24px] border-l-transparent border-r-transparent ${aligned ? "border-b-emerald-500" : "border-b-rose-600"}`} />
            <div className="text-[10px] font-bold mt-1">🕋</div>
          </div>
        </div>
        {/* Center dot */}
        <div className="h-3 w-3 rounded-full bg-foreground" />
      </div>

      {permission !== "granted" ? (
        <Button onClick={requestAccess} className="w-full mt-4" size="sm">
          Enable compass
        </Button>
      ) : (
        <p className={`text-center text-xs mt-3 font-semibold ${aligned ? "text-emerald-600" : "text-muted-foreground"}`}>
          {heading == null
            ? "Move your device to calibrate..."
            : aligned
            ? "✓ You are facing Qibla"
            : "Rotate your device until the arrow points up"}
        </p>
      )}
    </div>
  );
};

const METHODS = [
  { id: 1, label: "University of Islamic Sciences, Karachi" },
  { id: 2, label: "Islamic Society of North America (ISNA)" },
  { id: 3, label: "Muslim World League" },
  { id: 4, label: "Umm Al-Qura, Makkah" },
  { id: 5, label: "Egyptian General Authority" },
];

const PrayerTimes = () => {
  const [city, setCity] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return BD_CITIES.find((c) => c.name === saved) || BD_CITIES[0];
  });
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const [dayOffset, setDayOffset] = useState(0);
  const [method, setMethod] = useState<number>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("prayer-method") : null;
    return saved ? Number(saved) : 1;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, city.name);
  }, [city]);

  useEffect(() => {
    localStorage.setItem("prayer-method", String(method));
  }, [method]);

  useEffect(() => {
    document.title = "Prayer Times — নামাজের সময়সূচি";
  }, []);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const { data, isLoading } = useQuery({
    queryKey: ["prayer-times-detail", city.name, dayOffset, method],
    queryFn: () => fetchPrayerTimings(city.lat, city.lng, targetDate, method),
    staleTime: 1000 * 60 * 30,
  });

  const timings = data?.data.timings;
  const hijri = data?.data.date.hijri;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const status = useMemo(() => {
    if (!timings) return null;
    const { current, next } = getCurrentAndNext(timings);
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    const remain = next.mins - curMin;
    const hh = Math.floor(remain / 60);
    const mm = remain % 60;
    const ss = 59 - now.getSeconds();
    return {
      current: current.label,
      next: next.label,
      nextStart: timings[next.key as keyof typeof timings],
      remain: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timings, tick]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-5 max-w-3xl">
        <div className="mb-3 flex items-center justify-between">
          <BackButton />
          <h1 className="text-lg font-bold">বিস্তারিত</h1>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDayOffset((d) => d - 1)} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setDayOffset((d) => d + 1)} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Date */}
        <div className="mb-4">
          <p className="text-lg font-bold">
            {dayOffset === 0 ? "আজ, " : dayOffset === 1 ? "আগামীকাল, " : dayOffset === -1 ? "গতকাল, " : ""}
            {data?.data.date.readable || "..."}
          </p>
          {hijri && (
            <p className="text-sm text-muted-foreground">
              {hijri.month.en} {hijri.date}, {hijri.year} AH
            </p>
          )}
        </div>

        {/* City selector */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 text-base font-semibold text-rose-600">
              <MapPin className="h-4 w-4" />
              {city.name}, Bangladesh
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto bg-popover z-50">
              {BD_CITIES.map((c) => (
                <DropdownMenuItem key={c.name} onSelect={() => setCity(c)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <button className="inline-flex items-center gap-1 text-sm text-rose-600 font-semibold">
                <Settings className="h-4 w-4" /> সেটিংস
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Prayer Settings</SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-6">
                <div>
                  <Label className="text-sm font-semibold">Calculation method</Label>
                  <RadioGroup
                    value={String(method)}
                    onValueChange={(v) => setMethod(Number(v))}
                    className="mt-3 space-y-2"
                  >
                    {METHODS.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40"
                      >
                        <RadioGroupItem value={String(m.id)} className="mt-0.5" />
                        <span className="text-sm">{m.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Location</Label>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Currently: <span className="text-foreground font-medium">{city.name}, Bangladesh</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the city dropdown on the page to change location.
                  </p>
                </div>
                <Button className="w-full" onClick={() => setSettingsOpen(false)}>Done</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Sahri / Iftar */}
        {timings && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-border px-3 py-3">
              <p className="text-xs text-muted-foreground">পরবর্তী সাহরি</p>
              <p className="text-base font-bold">{formatTime12h(timings.Fajr)}</p>
            </div>
            <div className="rounded-xl border border-border px-3 py-3">
              <p className="text-xs text-muted-foreground">আজ ইফতার</p>
              <p className="text-base font-bold">{formatTime12h(timings.Maghrib)}</p>
            </div>
          </div>
        )}

        {/* Now / Next */}
        {status && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 px-3 py-3 text-center">
              <p className="text-xs text-muted-foreground">এখন : <span className="font-bold text-foreground">{status.current}</span></p>
              <p className="text-[11px] text-muted-foreground mt-1">ওয়াক্ত বাকি</p>
              <p className="font-mono font-bold text-rose-600 mt-0.5">{status.remain} মিনিট</p>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border px-3 py-3 text-center">
              <p className="text-xs text-muted-foreground">পরবর্তী : <span className="font-bold text-foreground">{status.next}</span></p>
              <p className="text-[11px] text-muted-foreground mt-1">ওয়াক্ত শুরু</p>
              <p className="font-mono font-bold mt-0.5">{formatTime12h(status.nextStart)}</p>
            </div>
          </div>
        )}

        {/* Sunrise / Sunset */}
        {timings && (
          <div className="flex items-center gap-6 text-sm mb-6">
            <span className="inline-flex items-center gap-2">
              <Sunrise className="h-4 w-4 text-amber-500" />
              সূর্যোদয় <strong>{formatTime12h(timings.Sunrise)}</strong>
            </span>
            <span className="inline-flex items-center gap-2">
              <Sunset className="h-4 w-4 text-orange-500" />
              সূর্যাস্ত <strong>{formatTime12h(timings.Maghrib)}</strong>
            </span>
          </div>
        )}

        {/* Qibla */}
        <div className="mb-6">
          <QiblaCompass lat={city.lat} lng={city.lng} />
        </div>

        {/* Schedule */}
        <h2 className="text-base font-bold mb-3">নামাজের সময়সূচি</h2>
        <div className="rounded-xl border border-border bg-card mb-3 px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium">সকল নামাজের রিমাইন্ডার</p>
          <Switch
            checked={Object.values(reminders).some(Boolean)}
            onCheckedChange={(on) => {
              const next: Record<string, boolean> = {};
              PRAYERS.forEach((p) => (next[p.key] = on));
              setReminders(next);
            }}
          />
        </div>

        <div className="space-y-2">
          {timings &&
            PRAYERS.map((p, i) => {
              const next = PRAYERS[i + 1];
              const endTime = next ? timings[next.key] : "23:59";
              const on = !!reminders[p.key];
              return (
                <div
                  key={p.key}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    status?.current === p.label
                      ? "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/60 dark:bg-rose-950/20"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center text-base">
                    {p.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{p.label}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatTime12h(timings[p.key])} - {formatTime12h(endTime)}
                    </p>
                  </div>
                  <button
                    onClick={() => setReminders((r) => ({ ...r, [p.key]: !on }))}
                    className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
                  >
                    {on ? <Bell className="h-4 w-4 text-rose-600" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
              );
            })}
          {isLoading && <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrayerTimes;
