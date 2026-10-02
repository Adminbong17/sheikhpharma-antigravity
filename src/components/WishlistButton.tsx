import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}

const WishlistButton = ({ productId, className, size = "sm" }: WishlistButtonProps) => {
  const { isInWishlist, toggle, isToggling } = useWishlist();
  const active = isInWishlist(productId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      disabled={isToggling}
      className={cn(
        "rounded-full bg-background/80 backdrop-blur-sm p-1.5 shadow-sm transition hover:scale-110",
        active && "text-red-500",
        className
      )}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        className={cn(
          size === "sm" ? "h-4 w-4" : "h-5 w-5",
          active && "fill-red-500 text-red-500"
        )}
      />
    </button>
  );
};

export default WishlistButton;
