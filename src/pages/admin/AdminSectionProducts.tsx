import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, X, Plus, Save } from "lucide-react";
import BackButton from "@/components/BackButton";

const AdminSectionProducts = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const qc = useQueryClient();
  const [productSearch, setProductSearch] = useState("");
  const [sortOrders, setSortOrders] = useState<Record<string, string>>({});

  const { data: section } = useQuery({
    queryKey: ["admin-section-detail", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .eq("id", sectionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sectionId,
  });

  const { data: assignedProducts = [] } = useQuery({
    queryKey: ["admin-section-products", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_section_products")
        .select("*, products(id, name, image_url, price, original_price)")
        .eq("section_id", sectionId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!sectionId,
  });

  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["admin-all-products-for-section"],
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
        } else {
          hasMore = false;
        }
      }
      return all;
    },
  });

  const searchResults = allProducts.filter((p: any) => {
    if (productSearch) {
      return p.name?.toLowerCase().includes(productSearch.toLowerCase());
    }
    return true;
  });

  const addProduct = useMutation({
    mutationFn: async (product_id: string) => {
      const maxSort = assignedProducts.reduce((max: number, sp: any) => Math.max(max, sp.sort_order || 0), 0);
      const { error } = await supabase.from("homepage_section_products").insert({
        section_id: sectionId!,
        product_id,
        sort_order: maxSort + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-products", sectionId] });
      toast.success("Product added");
    },
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_section_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-products", sectionId] });
      toast.success("Product removed");
    },
  });

  const updateSortOrder = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase
        .from("homepage_section_products")
        .update({ sort_order })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-section-products", sectionId] });
      qc.invalidateQueries({ queryKey: ["homepage-section-products"] });
      toast.success("Serial updated");
    },
  });

  const handleSortChange = (spId: string, value: string) => {
    setSortOrders((prev) => ({ ...prev, [spId]: value }));
  };

  const handleSortSave = (spId: string) => {
    const val = sortOrders[spId];
    if (val === undefined || val === "") return;
    updateSortOrder.mutate({ id: spId, sort_order: parseInt(val) || 0 });
  };

  const assignedIds = new Set(assignedProducts.map((sp: any) => sp.product_id));

  // Sort: products with sort_order > 0 first (ascending), then sort_order = 0 at end
  const sortedAssigned = [...assignedProducts].sort((a: any, b: any) => {
    const aOrder = a.sort_order || 0;
    const bOrder = b.sort_order || 0;
    if (aOrder > 0 && bOrder > 0) return aOrder - bOrder;
    if (aOrder > 0) return -1;
    if (bOrder > 0) return 1;
    return 0;
  });

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {section?.icon && <span className="text-2xl">{section.icon}</span>}
            {section?.title || "Section"} — Products
          </h1>
          <p className="text-sm text-muted-foreground">Add or remove products. Set serial number to control display order (serial আছে = আগে, নেই = পরে)</p>
        </div>
      </div>

      {/* Assigned products */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-foreground">Assigned Products ({assignedProducts.length})</h2>
        {sortedAssigned.length === 0 ? (
          <p className="text-muted-foreground text-sm">No products assigned yet. Search below to add.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedAssigned.map((sp: any) => (
              <div key={sp.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                {sp.products?.image_url && (
                  <img src={sp.products.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{sp.products?.name}</p>
                  <p className="text-xs text-muted-foreground">৳{sp.products?.price}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    className="w-16 h-8 text-xs text-center"
                    placeholder="Serial"
                    value={sortOrders[sp.id] !== undefined ? sortOrders[sp.id] : (sp.sort_order || "")}
                    onChange={(e) => handleSortChange(sp.id, e.target.value)}
                    onBlur={() => handleSortSave(sp.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSortSave(sp.id); }}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeProduct.mutate(sp.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search & add */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-foreground">Search Products</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products by name..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto">
          {searchResults.map((p: any) => {
            const alreadyAdded = assignedIds.has(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
                {p.image_url && <img src={p.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                  <p className="text-xs text-muted-foreground">৳{p.price}</p>
                </div>
                <Button size="sm" variant={alreadyAdded ? "secondary" : "default"} disabled={alreadyAdded || addProduct.isPending}
                  onClick={() => addProduct.mutate(p.id)}>
                  {alreadyAdded ? "Added" : <><Plus className="h-3 w-3 mr-1" /> Add</>}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminSectionProducts;
