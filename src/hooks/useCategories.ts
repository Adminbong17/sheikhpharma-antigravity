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

export const DEFAULT_CATEGORIES: DBCategory[] = [
  { id: "cat-1", name: "ওষুধ ও প্রেসক্রিপশন", slug: "medicine", icon_url: null, sort_order: 1 },
  { id: "cat-2", name: "স্বাস্থ্যসেবা ও ডিভাইস", slug: "healthcare", icon_url: null, sort_order: 2 },
  { id: "cat-3", name: "সাপ্লিমেন্ট ও ভিটামিন", slug: "supplement", icon_url: null, sort_order: 3 },
  { id: "cat-4", name: "মা ও শিশুর যত্ন", slug: "baby-and-mom-care", icon_url: null, sort_order: 4 },
  { id: "cat-5", name: "সৌন্দর্য ও রূপচর্চা", slug: "beauty", icon_url: null, sort_order: 5 },
  { id: "cat-6", name: "ভেষজ ও হারবাল", slug: "herbal", icon_url: null, sort_order: 6 },
  { id: "cat-7", name: "যৌন স্বাস্থ্য ও সুস্থতা", slug: "sexual-wellness", icon_url: null, sort_order: 7 },
  { id: "cat-8", name: "হোম ও হাইজিন", slug: "home-care", icon_url: null, sort_order: 8 },
  { id: "cat-9", name: "পুষ্টিকর খাদ্য", slug: "food-and-nutrition", icon_url: null, sort_order: 9 },
  { id: "cat-10", name: "পোষা প্রাণীর যত্ন", slug: "pet-care", icon_url: null, sort_order: 10 },
  { id: "cat-11", name: "ভেটেরিনারি", slug: "veterinary", icon_url: null, sort_order: 11 },
  { id: "cat-12", name: "হোমিওপ্যাথি", slug: "homeopathy", icon_url: null, sort_order: 12 },
];

const STORAGE_KEY = "sheikhpharma_categories";

const getStoredCategories = (): DBCategory[] => {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Error reading stored categories:", err);
  }
  return DEFAULT_CATEGORIES;
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<DBCategory[]> => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order");

        if (error) {
          console.warn("Could not fetch categories from DB, using fallback:", error.message);
          return getStoredCategories();
        }

        if (data && data.length > 0) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch {}
          return data as DBCategory[];
        }

        return getStoredCategories();
      } catch (err) {
        console.warn("Failed to fetch categories, using fallback:", err);
        return getStoredCategories();
      }
    },
    initialData: getStoredCategories,
    staleTime: 1000 * 60 * 30,
  });
};

export const useSubcategories = (categoryId?: string) => {
  return useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: async () => {
      try {
        let query = supabase.from("subcategories").select("*").order("sort_order");
        if (categoryId) query = query.eq("category_id", categoryId);
        const { data, error } = await query;
        if (error) return [];
        return (data as DBSubCategory[]) || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 30,
  });
};

export const useCategoriesWithSubs = () => {
  const { data: categories = DEFAULT_CATEGORIES, ...catRest } = useCategories();
  const { data: subcategories = [], ...subRest } = useSubcategories();

  const categoriesWithSubs = categories.map((cat) => ({
    ...cat,
    subcategories: subcategories.filter((s) => s.category_id === cat.id),
  }));

  return {
    data: categoriesWithSubs,
    isLoading: false,
  };
};
