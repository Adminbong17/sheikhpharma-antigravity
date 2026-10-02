import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Build a clean map of icon name -> component
const iconMap: Record<string, React.ComponentType<any>> = {};
const SKIP = new Set(["createLucideIcon", "default", "Icon", "icons", "dynamicIconImports"]);
for (const [key, val] of Object.entries(LucideIcons)) {
  if (
    !SKIP.has(key) &&
    key[0] === key[0].toUpperCase() &&
    val != null &&
    (typeof val === "function" || (typeof val === "object" && "$$typeof" in (val as any)))
  ) {
    iconMap[key] = val as React.ComponentType<any>;
  }
}
const ALL_ICON_NAMES = Object.keys(iconMap).sort();

// Curated popular icons shown by default
const POPULAR_ICONS = [
  "Smartphone", "Laptop", "Tablet", "Headphones", "Camera", "Watch", "Tv", "Speaker",
  "Shirt", "ShoppingBag", "Gem", "Glasses",
  "Home", "Sofa", "Lamp", "CookingPot", "Bath", "Bed",
  "Apple", "Beef", "Coffee", "IceCream", "Milk", "Salad", "Pizza", "Cake",
  "Heart", "Sparkles", "Droplets", "Scissors", "Palette",
  "Gamepad2", "Puzzle", "Dice5", "ToyBrick",
  "Dumbbell", "Bike", "Trophy", "Medal",
  "Car", "Fuel", "Wrench", "CircleGauge",
  "Baby", "Dog", "Cat", "Bird", "Fish",
  "Book", "BookOpen", "GraduationCap", "Pen", "Newspaper",
  "Plane", "MapPin", "Tent", "Mountain",
  "Gift", "PartyPopper", "Music", "Clapperboard",
  "Stethoscope", "Pill", "Syringe", "Activity",
  "Flower2", "TreePine", "Leaf", "Sun", "CloudRain",
  "ShieldCheck", "Lock", "Key", "Zap", "Flame",
  "Package", "Box", "Truck", "Store", "ShoppingCart",
  "FolderOpen", "Grid3X3", "LayoutGrid", "Layers", "Tag",
].filter((n) => iconMap[n]);

interface IconPickerProps {
  value: string | null;
  onChange: (iconName: string | null) => void;
}

const IconPicker = ({ value, onChange }: IconPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredIcons = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return POPULAR_ICONS;
    return ALL_ICON_NAMES.filter((name) => name.toLowerCase().includes(q)).slice(0, 100);
  }, [search]);

  const SelectedIcon = value ? iconMap[value] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 h-10">
          {SelectedIcon ? (
            <>
              <SelectedIcon className="h-5 w-5 text-primary" />
              <span className="text-sm">{value}</span>
            </>
          ) : (
            <>
              <LucideIcons.Smile className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pick an icon...</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <LucideIcons.Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="h-72 p-2">
          <div className="grid grid-cols-5 gap-1.5">
            {filteredIcons.map((name) => {
              const Icon = iconMap[name];
              if (!Icon) return null;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => { onChange(name); setOpen(false); setSearch(""); }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg p-2.5 hover:bg-accent transition-colors gap-1",
                    value === name && "bg-primary/10 ring-1 ring-primary"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">{name}</span>
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">No icons found</p>
          )}
        </ScrollArea>
        {value && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => { onChange(null); setOpen(false); }}>
              Remove icon
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;
