import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { Package } from "lucide-react";

const LeftMenuItemPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const { data: item } = useQuery({
    queryKey: ["left-menu-item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_left_menu_items")
        .select("*")
        .eq("id", itemId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });

  useEffect(() => {
    if (item?.use_link && item?.link_url) {
      if (/^https?:\/\//i.test(item.link_url)) {
        window.location.replace(item.link_url);
      } else {
        navigate(item.link_url, { replace: true });
      }
    }
  }, [item, navigate]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["left-menu-item-products", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_left_menu_products")
        .select("id, sort_order, products(id, name, slug, image_url, price, original_price)")
        .eq("menu_item_id", itemId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!itemId,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <BackButton className="mb-3" />
        <div className="mb-5 flex items-center gap-3">
          <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
            {item?.image_url ? (
              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
            ) : item?.icon ? (
              <span className="text-2xl">{item.icon}</span>
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-bold">{item?.name || "Products"}</h1>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {products.map((sp: any) => {
              const p = sp.products;
              if (!p) return null;
              const to = `/product/${p.slug || p.id}`;
              const hasDiscount = p.original_price && p.price && p.original_price > p.price;
              return (
                <Link
                  key={sp.id}
                  to={to}
                  className="group rounded-lg border bg-card hover:shadow-md hover:border-primary transition-all overflow-hidden"
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium line-clamp-2 leading-tight min-h-[2rem]">{p.name}</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-sm font-bold text-primary">৳{p.price}</span>
                      {hasDiscount && (
                        <span className="text-xs text-muted-foreground line-through">৳{p.original_price}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default LeftMenuItemPage;
