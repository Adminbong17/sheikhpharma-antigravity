import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, ChevronRight } from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  sort_order: number | null;
  link_url: string | null;
  use_link: boolean | null;
  bg_color: string | null;
};

// Colorful gradient palette cycled per item (used as fallback when no bg_color)
const gradientPalette = [
  "from-rose-500 via-pink-500 to-fuchsia-500",
  "from-amber-400 via-orange-500 to-red-500",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-sky-400 via-blue-500 to-indigo-600",
  "from-violet-500 via-purple-500 to-fuchsia-600",
  "from-lime-400 via-green-500 to-emerald-600",
  "from-yellow-400 via-amber-500 to-orange-600",
  "from-cyan-400 via-sky-500 to-blue-600",
];

const desktopItemBase =
  "group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden";

const mobileItemBase =
  "relative flex items-center justify-center gap-2 py-3 px-2 rounded-2xl text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300 overflow-hidden";

const DesktopInner = ({ it }: { it: MenuItem }) => (
  <>
    {/* shine overlay */}
    <span className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    <div className="relative h-9 w-9 rounded-xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40 flex items-center justify-center overflow-hidden shrink-0">
      {it.image_url ? (
        <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
      ) : it.icon ? (
        <span className="text-lg leading-none">{it.icon}</span>
      ) : (
        <Package className="h-4 w-4 text-white" />
      )}
    </div>
    <span className="relative line-clamp-2 leading-tight flex-1 drop-shadow-sm">
      {it.name}
    </span>
    <ChevronRight className="relative h-4 w-4 text-white/90 group-hover:translate-x-0.5 transition-transform" />
  </>
);

const MobileInner = ({ it }: { it: MenuItem }) => (
  <>
    {it.image_url ? (
      <img src={it.image_url} alt={it.name} className="h-5 w-5 rounded object-cover shrink-0" />
    ) : it.icon ? (
      <span className="text-base leading-none shrink-0">{it.icon}</span>
    ) : (
      <Package className="h-4 w-4 shrink-0" />
    )}
    <span className="line-clamp-1 leading-tight">{it.name}</span>
  </>
);

type Variant = "desktop" | "mobile" | "desktop-left" | "desktop-right";

const HomepageLeftMenu = ({ variant = "desktop" }: { variant?: Variant }) => {
  const { data: items = [] } = useQuery({
    queryKey: ["homepage-left-menu"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_left_menu_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as MenuItem[];
    },
  });

  const isMobile = variant === "mobile";
  const baseClass = isMobile ? mobileItemBase : desktopItemBase;
  const Inner = isMobile ? MobileInner : DesktopInner;

  // Split items in half for left/right desktop variants
  let displayItems = items;
  if (variant === "desktop-left") {
    const half = Math.ceil(items.length / 2);
    displayItems = items.slice(0, half);
  } else if (variant === "desktop-right") {
    const half = Math.ceil(items.length / 2);
    displayItems = items.slice(half);
  }

  const wrapperClass = isMobile
    ? "md:hidden container mx-auto px-4 py-3 grid grid-cols-2 gap-3"
    : "hidden md:flex flex-col gap-2.5 w-56 shrink-0";

  const Wrapper: any = isMobile ? "div" : "aside";

  // For mobile, use ALL items (not split)
  const renderItems = isMobile ? items : displayItems;

  // If desktop-right has nothing (only 1 item total), don't render anything
  if (variant === "desktop-right" && renderItems.length === 0) {
    return <Wrapper className={wrapperClass} />;
  }

  return (
    <Wrapper className={wrapperClass}>
      {renderItems.map((it, idx) => {
        // Compute global index for stable gradient palette
        const globalIdx =
          variant === "desktop-right"
            ? Math.ceil(items.length / 2) + idx
            : idx;

        const useExternal = !!(it.use_link && it.link_url);
        const isAbsolute = useExternal && /^https?:\/\//i.test(it.link_url!);

        const hasCustomColor = !!(it.bg_color && it.bg_color.trim());
        const gradientClass = hasCustomColor
          ? ""
          : `bg-gradient-to-br ${gradientPalette[globalIdx % gradientPalette.length]}`;
        const itemClass = `${baseClass} ${gradientClass}`;
        const inlineStyle = hasCustomColor ? { backgroundColor: it.bg_color! } : undefined;

        if (useExternal && isAbsolute) {
          return (
            <a
              key={it.id}
              href={it.link_url!}
              target="_blank"
              rel="noopener noreferrer"
              className={itemClass}
              style={inlineStyle}
            >
              <Inner it={it} />
            </a>
          );
        }

        const to = useExternal ? it.link_url! : `/menu/${it.id}`;
        return (
          <Link key={it.id} to={to} className={itemClass} style={inlineStyle}>
            <Inner it={it} />
          </Link>
        );
      })}
    </Wrapper>
  );
};

export default HomepageLeftMenu;
