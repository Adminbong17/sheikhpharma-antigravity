import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ChevronDown, Sunrise, Sunset } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

export const BD_CITIES = [
  { name: "Dhaka", bnName: "ঢাকা", lat: 23.8103, lng: 90.4125 },
  { name: "Chittagong", bnName: "চট্টগ্রাম", lat: 22.3569, lng: 91.7832 },
  { name: "Sylhet", bnName: "সিলেট", lat: 24.8949, lng: 91.8687 },
  { name: "Rajshahi", bnName: "রাজশাহী", lat: 24.3636, lng: 88.6241 },
  { name: "Khulna", bnName: "খুলনা", lat: 22.8456, lng: 89.5403 },
  { name: "Barisal", bnName: "বরিশাল", lat: 22.701, lng: 90.3535 },
  { name: "Rangpur", bnName: "রংপুর", lat: 25.7439, lng: 89.2752 },
  { name: "Mymensingh", bnName: "ময়মনসিংহ", lat: 24.7471, lng: 90.4203 },
  { name: "Cumilla", bnName: "কুমিল্লা", lat: 23.4607, lng: 91.1809 },
  { name: "Cox's Bazar", bnName: "কক্সবাজার", lat: 21.4272, lng: 92.0058 },
  { name: "Narayanganj", bnName: "নারায়ণগঞ্জ", lat: 23.6238, lng: 90.5 },
  { name: "Gazipur", bnName: "গাজীপুর", lat: 24.0023, lng: 90.4264 },
];

const STORAGE_KEY = "prayer-city";

type Timings = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

type AlAdhanResponse = {
  data: {
    timings: Timings;
    date: { readable: string; hijri: { date: string; month: { en: string }; year: string } };
  };
};

export const fetchPrayerTimings = async (
  lat: number,
  lng: number,
  date: Date = new Date(),
  method: number = 1,
) => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load prayer times");
  return (await res.json()) as AlAdhanResponse;
};

export const formatTime12h = (t: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const hr = h % 12 || 12;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
};

const PRAYERS: { key: keyof Timings; label: string; bnLabel: string }[] = [
  { key: "Fajr", label: "Fajr", bnLabel: "ফজর" },
  { key: "Dhuhr", label: "Dhuhr", bnLabel: "যোহর" },
  { key: "Asr", label: "Asr", bnLabel: "আসর" },
  { key: "Maghrib", label: "Maghrib", bnLabel: "মাগরিব" },
  { key: "Isha", label: "Isha", bnLabel: "এশা" },
];

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const getCurrentAndNext = (timings: Timings) => {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const list = PRAYERS.map((p) => ({ ...p, mins: toMinutes(timings[p.key]) }));
  let current = list[list.length - 1];
  let next = list[0];
  for (let i = 0; i < list.length; i++) {
    if (cur >= list[i].mins) current = list[i];
    if (cur < list[i].mins) {
      next = list[i];
      break;
    }
  }
  if (cur >= list[list.length - 1].mins) {
    next = { ...list[0], mins: list[0].mins + 24 * 60 };
  }
  return { current, next };
};

const PrayerTimesWidget = () => {
  const { b, isBangla } = useLanguage();
  const [city, setCity] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return BD_CITIES.find((c) => c.name === saved) || BD_CITIES[0];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, city.name);
  }, [city]);

  const { data, isLoading } = useQuery({
    queryKey: ["prayer-times", city.name],
    queryFn: () => fetchPrayerTimings(city.lat, city.lng),
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
      currentKey: current.key,
      currentLabel: isBangla ? current.bnLabel : current.label,
      nextKey: next.key,
      nextLabel: isBangla ? next.bnLabel : next.label,
      remain: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timings, tick, isBangla]);

  return (
    <section className="container mx-auto px-4 py-3">
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
              ☪
            </span>
            {b("নামাজ ও রোজা", "Prayer & Fasting")}
          </h3>
          <Link to="/prayer-times" className="text-xs font-semibold text-rose-600 hover:underline">
            {b("বিস্তারিত", "Details")}
          </Link>
        </div>

        {/* City + date */}
        <div className="px-4 pt-3 flex flex-wrap items-center gap-2 justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 hover:opacity-80">
              <MapPin className="h-4 w-4" />
              {isBangla ? city.bnName : city.name}, {b("বাংলাদেশ", "Bangladesh")}
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto bg-popover z-50">
              {BD_CITIES.map((c) => (
                <DropdownMenuItem key={c.name} onSelect={() => setCity(c)}>
                  {isBangla ? c.bnName : c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {hijri && (
            <p className="text-xs text-muted-foreground">
              {data?.data.date.readable} • {hijri.month.en} {hijri.date}, {hijri.year} AH
            </p>
          )}
        </div>

        {/* Quick row: Sahri / Iftar */}
        {timings && (
          <div className="px-4 pt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{b("পরবর্তী সাহরি", "Next Sahri")}</p>
              <p className="text-sm font-bold">{formatTime12h(timings.Fajr)}</p>
            </div>
            <div className="rounded-xl border border-border px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{b("আজকের ইফতার", "Today's Iftar")}</p>
              <p className="text-sm font-bold">{formatTime12h(timings.Maghrib)}</p>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
          {/* Status card */}
          <div className="rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20 border border-rose-200/60 dark:border-rose-900/40 p-4 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center text-xl mb-1">
              ☀️
            </div>
            <p className="text-xs text-muted-foreground">{b("এখন", "Now")}</p>
            <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
              {isLoading ? "..." : status?.currentLabel}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{b("ওয়াক্ত বাকি", "Time Remaining")}</p>
            <p className="text-sm font-mono font-bold text-rose-600">
              {status?.remain || "--:--:--"} <span className="text-[10px]">{b("মিনিট", "mins")}</span>
            </p>
          </div>

          {/* Prayer list */}
          <div className="grid grid-cols-1 gap-1.5">
            {timings &&
              PRAYERS.map((p, i) => {
                const isActive = status?.currentKey === p.key;
                const next = PRAYERS[i + 1];
                const endTime = next ? timings[next.key] : "23:59";
                return (
                  <div
                    key={p.key}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                      isActive
                        ? "border-rose-500 ring-1 ring-rose-500/40 bg-rose-50/60 dark:bg-rose-950/20"
                        : "border-border"
                    }`}
                  >
                    <span className="font-semibold">{isBangla ? p.bnLabel : p.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatTime12h(timings[p.key])} - {formatTime12h(endTime)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Footer sun info */}
        {timings && (
          <div className="px-4 pb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Sunrise className="h-3.5 w-3.5 text-amber-500" /> {b("সূর্যোদয়", "Sunrise")} {formatTime12h(timings.Sunrise)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Sunset className="h-3.5 w-3.5 text-orange-500" /> {b("সূর্যাস্ত", "Sunset")} {formatTime12h(timings.Maghrib)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default PrayerTimesWidget;
