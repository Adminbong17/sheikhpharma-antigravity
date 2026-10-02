import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DBCategory {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  sort_order: number;
}

export interface DBSubCategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data as DBCategory[]) || [];
    },
  });
};

export const useSubcategories = (categoryId?: string) => {
  return useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: async () => {
      let query = supabase.from("subcategories").select("*").order("sort_order");
      if (categoryId) query = query.eq("category_id", categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as DBSubCategory[]) || [];
    },
  });
};

export const useCategoriesWithSubs = () => {
  const { data: categories = [], ...catRest } = useCategories();
  const { data: subcategories = [], ...subRest } = useSubcategories();

  const categoriesWithSubs = categories.map((cat) => ({
    ...cat,
    subcategories: subcategories.filter((s) => s.category_id === cat.id),
  }));

  return {
    data: categoriesWithSubs,
    isLoading: catRest.isLoading || subRest.isLoading,
  };
};
