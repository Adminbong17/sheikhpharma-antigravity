import {
  Smartphone, Shirt, Home, ShoppingBasket,
  Heart, Gamepad2, Dumbbell, Car,
} from "lucide-react";

export interface SubCategory {
  name: string;
  slug: string;
}

export interface Category {
  name: string;
  slug: string;
  icon: typeof Smartphone;
  subcategories: SubCategory[];
}

export const categories: Category[] = [
  {
    name: "Electronics",
    slug: "electronics",
    icon: Smartphone,
    subcategories: [
      { name: "Mobile Phones", slug: "mobile-phones" },
      { name: "Laptops", slug: "laptops" },
      { name: "Tablets", slug: "tablets" },
      { name: "Headphones", slug: "headphones" },
      { name: "Cameras", slug: "cameras" },
      { name: "Smart Watches", slug: "smart-watches" },
    ],
  },
  {
    name: "Fashion",
    slug: "fashion",
    icon: Shirt,
    subcategories: [
      { name: "Men's Clothing", slug: "mens-clothing" },
      { name: "Women's Clothing", slug: "womens-clothing" },
      { name: "Shoes", slug: "shoes" },
      { name: "Bags", slug: "bags" },
      { name: "Watches", slug: "watches" },
      { name: "Jewelry", slug: "jewelry" },
    ],
  },
  {
    name: "Home & Living",
    slug: "home-living",
    icon: Home,
    subcategories: [
      { name: "Furniture", slug: "furniture" },
      { name: "Bedding & Pillows", slug: "bedding" },
      { name: "Kitchen Appliances", slug: "kitchen" },
      { name: "Bathroom", slug: "bathroom" },
      { name: "Decor", slug: "decor" },
    ],
  },
  {
    name: "Groceries",
    slug: "groceries",
    icon: ShoppingBasket,
    subcategories: [
      { name: "Fruits & Vegetables", slug: "fruits-vegetables" },
      { name: "Spices", slug: "spices" },
      { name: "Snacks", slug: "snacks" },
      { name: "Beverages", slug: "beverages" },
      { name: "Dairy", slug: "dairy" },
    ],
  },
  {
    name: "Health & Beauty",
    slug: "health-beauty",
    icon: Heart,
    subcategories: [
      { name: "Skincare", slug: "skincare" },
      { name: "Makeup", slug: "makeup" },
      { name: "Hair Care", slug: "haircare" },
      { name: "Perfume", slug: "perfume" },
      { name: "Health Tools", slug: "health-tools" },
    ],
  },
  {
    name: "Toys & Games",
    slug: "toys-games",
    icon: Gamepad2,
    subcategories: [
      { name: "Kids Toys", slug: "kids-toys" },
      { name: "Board Games", slug: "board-games" },
      { name: "Puzzles", slug: "puzzles" },
      { name: "Outdoor Games", slug: "outdoor-games" },
    ],
  },
  {
    name: "Sports",
    slug: "sports",
    icon: Dumbbell,
    subcategories: [
      { name: "Fitness Equipment", slug: "fitness-equipment" },
      { name: "Sportswear", slug: "sportswear" },
      { name: "Cricket", slug: "cricket" },
      { name: "Football", slug: "football" },
      { name: "Cycling", slug: "cycling" },
    ],
  },
  {
    name: "Automotive",
    slug: "automotive",
    icon: Car,
    subcategories: [
      { name: "Car Parts", slug: "car-parts" },
      { name: "Bike Accessories", slug: "bike-accessories" },
      { name: "Car Decor", slug: "car-decor" },
      { name: "Oils & Lubricants", slug: "oils" },
    ],
  },
];

export const getCategoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
