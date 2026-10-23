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
  { id: "b7acff0c-3a9e-4eef-a143-9e4cdada8d5c", name: "ওষুধ ও প্রেসক্রিপশন", slug: "medicine", icon_url: null, sort_order: 1 },
  { id: "b1192cc2-1f06-417b-842c-7fb96182035a", name: "স্বাস্থ্যসেবা ও ডিভাইস", slug: "healthcare", icon_url: null, sort_order: 2 },
  { id: "dc418a13-816e-49e9-83dd-d786749d32cd", name: "সাপ্লিমেন্ট ও ভিটামিন", slug: "supplement", icon_url: null, sort_order: 3 },
  { id: "bc9b5f4a-e61d-4f5e-9e30-b0bc3e2ee8f5", name: "মা ও শিশুর যত্ন", slug: "baby-and-mom-care", icon_url: null, sort_order: 4 },
  { id: "32e91061-5540-462e-98c3-fa2ece191f44", name: "সৌন্দর্য ও রূপচর্চা", slug: "beauty", icon_url: null, sort_order: 5 },
  { id: "93c2c6e5-59dd-40e5-84c1-104cf8958385", name: "ভেষজ ও হারবাল", slug: "herbal", icon_url: null, sort_order: 6 },
  { id: "fdc2ea55-4951-4da4-be39-418b1feea107", name: "যৌন স্বাস্থ্য ও সুস্থতা", slug: "sexual-wellness", icon_url: null, sort_order: 7 },
  { id: "14cfc830-bfa1-4d15-b2d8-00c761fed5d5", name: "হোম ও হাইজিন", slug: "home-care", icon_url: null, sort_order: 8 },
  { id: "580e6333-5583-4bad-bcba-f8e7a21d5efb", name: "পুষ্টিকর খাদ্য", slug: "food-and-nutrition", icon_url: null, sort_order: 9 },
  { id: "75e62902-662b-4517-b216-d7679a58cfea", name: "পোষা প্রাণীর যত্ন", slug: "pet-care", icon_url: null, sort_order: 10 },
  { id: "0eaf2f9f-4208-4b39-9a13-32d2b72c6987", name: "ভেটেরিনারি", slug: "veterinary", icon_url: null, sort_order: 11 },
  { id: "88a68058-3da9-45b7-9f94-bd1399116d0b", name: "হোমিওপ্যাথি", slug: "homeopathy", icon_url: null, sort_order: 12 },
];

export const DEFAULT_SUBCATEGORIES: DBSubCategory[] = [
  { id: "sub-hom-1", category_id: "88a68058-3da9-45b7-9f94-bd1399116d0b", name: "জার্মান ড্রপস", slug: "german-drops", sort_order: 1 },
  { id: "sub-hom-2", category_id: "88a68058-3da9-45b7-9f94-bd1399116d0b", name: "মাদার টিংচার", slug: "mother-tincture", sort_order: 2 },
  { id: "sub-hom-3", category_id: "88a68058-3da9-45b7-9f94-bd1399116d0b", name: "বায়োকেমিক ট্যাবলেট", slug: "biochemic-tablets", sort_order: 3 },
  { id: "sub-hom-4", category_id: "88a68058-3da9-45b7-9f94-bd1399116d0b", name: "টনিক ও সিরাপ", slug: "tonics-and-syrups", sort_order: 4 },
  { id: "sub-hom-5", category_id: "88a68058-3da9-45b7-9f94-bd1399116d0b", name: "ডাইলিউশন", slug: "dilutions", sort_order: 5 },
  { id: "sub-hom-6", category_id: "88a68058-3da9-45b7-9f94-bd1399116d0b", name: "হোমিও হেয়ার ও স্কিন কেয়ার", slug: "hair-and-skin-care", sort_order: 6 },
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
        if (error || !data || data.length === 0) {
          return categoryId
            ? DEFAULT_SUBCATEGORIES.filter((s) => s.category_id === categoryId)
            : DEFAULT_SUBCATEGORIES;
        }
        const dbIds = new Set(data.map((d: any) => d.id));
        const missing = DEFAULT_SUBCATEGORIES.filter(
          (s) => !dbIds.has(s.id) && (!categoryId || s.category_id === categoryId)
        );
        return ([...data, ...missing] as DBSubCategory[]).sort((a, b) => a.sort_order - b.sort_order);
      } catch {
        return categoryId
          ? DEFAULT_SUBCATEGORIES.filter((s) => s.category_id === categoryId)
          : DEFAULT_SUBCATEGORIES;
      }
    },
    initialData: () =>
      categoryId
        ? DEFAULT_SUBCATEGORIES.filter((s) => s.category_id === categoryId)
        : DEFAULT_SUBCATEGORIES,
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
