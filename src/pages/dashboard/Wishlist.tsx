import Navbar from "@/components/Navbar";
import { Heart, ArrowLeft, Star, ShoppingCart, Zap, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useWishlistProducts, useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const Wishlist = () => {
  const { data: products = [], isLoading } = useWishlistProducts();
  const { toggle } = useWishlist();
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4 flex items-center gap-2">
          <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        <h1 className="mb-6 text-xl font-bold">My Wishlist ({products.length})</h1>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Heart className="h-14 w-14 opacity-20" />
            <p className="font-medium">Your wishlist is empty</p>
            <p className="text-sm text-center">Save items you love and come back to them later.</p>
            <Link to="/" className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product: any) => (
              <div key={product.id} className="group flex flex-col overflow-hidden rounded-xl border-2 border-primary bg-card shadow-sm transition hover:shadow-md">
                <Link to={`/product/${product.slug || product.id}`}>
                  <div className="relative w-full aspect-square bg-muted overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><span className="text-4xl">📦</span></div>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id); }}
                      className="absolute top-1 right-1 z-10 rounded-full bg-background/80 p-1.5 shadow-sm hover:scale-110 transition text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
                <div className="flex flex-1 flex-col justify-between p-2">
                  <Link to={`/product/${product.slug || product.id}`}>
                    <p className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</p>
                    <p className="mt-1 text-base font-bold text-primary">{formatPrice(product.price)}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span>{product.rating ?? 0}</span>
                    </div>
                  </Link>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full" onClick={() => { addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); toast.success("কার্টে যোগ হয়েছে!"); }}>
                      <ShoppingCart className="h-3 w-3 shrink-0" /> Cart
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-[11px] px-1 min-w-0 rounded-full border-2 border-primary" onClick={() => { addItem({ id: product.id, name: product.name, price: product.price, image_url: product.image_url }); navigate("/checkout"); }}>
                      <Zap className="h-3 w-3 shrink-0" /> Buy
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
