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

const DEFAULT_CATEGORIES: DBCategory[] = [
  { id: "cat-medicine", name: "Medicine", slug: "medicine", icon_url: null, sort_order: 1 },
  { id: "cat-healthcare", name: "Healthcare", slug: "healthcare", icon_url: null, sort_order: 2 },
  { id: "cat-baby-care", name: "Baby & Mom care", slug: "baby-and-mom-care", icon_url: null, sort_order: 3 },
  { id: "cat-sexual-wellness", name: "Sexual Wellness", slug: "sexual-wellness", icon_url: null, sort_order: 4 },
  { id: "cat-beauty", name: "Beauty & Skin", slug: "beauty", icon_url: null, sort_order: 5 },
  { id: "cat-herbal", name: "Herbal & Ayur", slug: "herbal", icon_url: null, sort_order: 6 },
  { id: "cat-home-care", name: "Home care", slug: "home-care", icon_url: null, sort_order: 7 },
  { id: "cat-devices", name: "Medical Devices", slug: "medical-devices", icon_url: null, sort_order: 8 },
  { id: "cat-nutrition", name: "Food & Nutrition", slug: "food-and-nutrition", icon_url: null, sort_order: 9 },
  { id: "cat-supplements", name: "Supplements", slug: "supplements", icon_url: null, sort_order: 10 },
  { id: "cat-personal-care", name: "Personal Care", slug: "personal-care", icon_url: null, sort_order: 11 },
  { id: "cat-dental", name: "Dental & Oral Care", slug: "dental-care", icon_url: null, sort_order: 12 },
];

const CAT_STORAGE_KEY = "sheikhpharma_categories";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      if (data && data.length > 0) {
        try {
          localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
      return (data as DBCategory[]) || [];
    },
    initialData: () => {
      try {
        const cached = localStorage.getItem(CAT_STORAGE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
      return DEFAULT_CATEGORIES;
    },
    staleTime: 1000 * 60 * 30,
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
    staleTime: 1000 * 60 * 30,
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
