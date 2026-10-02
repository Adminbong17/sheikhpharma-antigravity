import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Siren, MapPin, ShieldAlert } from "lucide-react";
import BackButton from "@/components/BackButton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Contact = {
  id: string;
  name: string;
  phone: string;
  location: string | null;
  icon: string | null;
};

const palette = [
  "from-red-500 to-rose-600",
  "from-orange-500 to-amber-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-fuchsia-600",
  "from-pink-500 to-rose-500",
  "from-cyan-500 to-sky-600",
  "from-yellow-500 to-orange-500",
];

const Emergency = () => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["emergency-contacts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("emergency_contacts")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Contact[];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-rose-600 to-orange-500 text-white">
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 60px 60px",
          }}
        />
        <div className="container mx-auto px-4 py-8 max-w-4xl relative">
          <BackButton className="mb-4 !text-white hover:!text-white/80" />
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/40 flex items-center justify-center shadow-xl animate-pulse">
              <Siren className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold drop-shadow">Emergency</h1>
              <p className="text-sm sm:text-base text-white/90 mt-1 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                Tap any card to call instantly
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl w-full">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <Siren className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-base font-medium">No emergency contacts available yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Admin can add contacts from the dashboard.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {items.map((it, idx) => (
                <a
                  key={it.id}
                  href={`tel:${it.phone}`}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${palette[idx % palette.length]} text-white p-4 shadow-lg active:scale-95 hover:shadow-2xl hover:-translate-y-0.5 transition-all`}
                >
                  <span className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
                  <span className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex flex-col gap-2">
                    <div className="h-11 w-11 rounded-xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40 flex items-center justify-center shadow-inner">
                      {it.icon ? <span className="text-2xl">{it.icon}</span> : <Phone className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-base leading-tight line-clamp-2">{it.name}</p>
                      <p className="text-lg font-extrabold mt-1 tracking-wide drop-shadow">{it.phone}</p>
                      {it.location && (
                        <p className="text-[11px] opacity-90 mt-0.5 flex items-center gap-1 line-clamp-1">
                          <MapPin className="h-3 w-3" /> {it.location}
                        </p>
                      )}
                    </div>
                    <span className="absolute bottom-2 right-2 text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      Call
                    </span>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 p-4 text-sm text-amber-900 dark:text-amber-100 flex gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <p>
                Emergency numbers are toll-free across Bangladesh. Stay calm, share your
                location clearly, and follow the operator's instructions.
              </p>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Emergency;
