import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrintPageButtonProps {
  /** floating = fixed bottom-right FAB, inline = normal button */
  variant?: "floating" | "inline";
  label?: string;
  className?: string;
}

/**
 * Universal print trigger. Uses the global print stylesheet in index.css,
 * which strips app chrome and expands scroll containers so nothing overlaps.
 */
const PrintPageButton = ({ variant = "floating", label = "প্রিন্ট", className }: PrintPageButtonProps) => {
  const handlePrint = () => {
    // let any open menu/popover close before the print dialog paints
    setTimeout(() => window.print(), 60);
  };

  if (variant === "inline") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className={cn("no-print gap-2", className)}
      >
        <Printer className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      aria-label={label}
      title={label}
      className={cn(
        "no-print fixed bottom-20 right-4 z-40 flex h-11 items-center gap-2 rounded-full px-4",
        "bg-gradient-primary text-primary-foreground shadow-[var(--shadow-elegant)]",
        "transition-transform duration-300 hover:scale-105 active:scale-95 md:bottom-6",
        className
      )}
    >
      <Printer className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};

export default PrintPageButton;
