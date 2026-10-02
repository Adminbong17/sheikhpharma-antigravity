import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, X, Plus } from "lucide-react";
import BackButton from "@/components/BackButton";

const AdminLeftMenuProducts = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const qc = useQueryClient();
  const [productSearch, setProductSearch] = useState("");
  const [sortOrders, setSortOrders] = useState<Record<string, string>>({});

  const { data: item } = useQuery({
    queryKey: ["admin-left-menu-item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_left_menu_items")
        .select("*")
        .eq("id", itemId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });

  const { data: assigned = [] } = useQuery({
    queryKey: ["admin-left-menu-products", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_left_menu_products")
        .select("*, products(id, name, image_url, price)")
        .eq("menu_item_id", itemId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!itemId,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["admin-all-products-for-leftmenu"],
    queryFn: async () => {
      const all: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, image_url, price")
          .order("name")
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          all.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else hasMore = false;
      }
      return all;
    },
  });

  const searchResults = allProducts.filter((p: any) =>
    productSearch ? p.name?.toLowerCase().includes(productSearch.toLowerCase()) : true
  );

  const addProduct = useMutation({
    mutationFn: async (product_id: string) => {
      const maxSort = assigned.reduce((m: number, sp: any) => Math.max(m, sp.sort_order || 0), 0);
      const { error } = await supabase.from("homepage_left_menu_products").insert({
        menu_item_id: itemId!,
        product_id,
        sort_order: maxSort + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-left-menu-products", itemId] });
      toast.success("Added");
    },
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_left_menu_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-left-menu-products", itemId] });
      toast.success("Removed");
    },
  });

  const updateSort = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase
        .from("homepage_left_menu_products")
        .update({ sort_order })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-left-menu-products", itemId] });
      toast.success("Saved");
    },
  });

  const assignedIds = new Set(assigned.map((sp: any) => sp.product_id));

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {item?.icon && <span>{item.icon}</span>}
          {item?.name || "Item"} — Products
        </h1>
        <p className="text-sm text-muted-foreground">এই menu item এ যেসব product দেখাতে চান assign করুন।</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Assigned ({assigned.length})</h2>
        {assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products assigned.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assigned.map((sp: any) => (
              <div key={sp.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                {sp.products?.image_url && (
                  <img src={sp.products.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{sp.products?.name}</p>
                  <p className="text-xs text-muted-foreground">৳{sp.products?.price}</p>
                </div>
                <Input
                  type="number"
                  className="w-16 h-8 text-xs text-center"
                  placeholder="#"
                  value={sortOrders[sp.id] !== undefined ? sortOrders[sp.id] : (sp.sort_order || "")}
                  onChange={(e) => setSortOrders((p) => ({ ...p, [sp.id]: e.target.value }))}
                  onBlur={() => {
                    const v = sortOrders[sp.id];
                    if (v !== undefined && v !== "") updateSort.mutate({ id: sp.id, sort_order: parseInt(v) || 0 });
                  }}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  onClick={() => removeProduct.mutate(sp.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Search Products</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name..."
            value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto">
          {searchResults.slice(0, 100).map((p: any) => {
            const added = assignedIds.has(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
                {p.image_url && <img src={p.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                  <p className="text-xs text-muted-foreground">৳{p.price}</p>
                </div>
                <Button size="sm" variant={added ? "secondary" : "default"}
                  disabled={added || addProduct.isPending}
                  onClick={() => addProduct.mutate(p.id)}>
                  {added ? "Added" : <><Plus className="h-3 w-3 mr-1" /> Add</>}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminLeftMenuProducts;
