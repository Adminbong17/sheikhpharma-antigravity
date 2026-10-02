import { createContext, useContext, useState, ReactNode } from "react";
import { trackAddToCart } from "@/lib/fbPixelEvents";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  variantKey?: string; // unique key for variant combo e.g. "Size:XL|Color:Red"
  variantLabel?: string; // display label e.g. "Size: XL, Color: Red"
}

// Unique key for cart item: id + variantKey
const cartItemKey = (item: { id: string; variantKey?: string }) =>
  item.variantKey ? `${item.id}__${item.variantKey}` : item.id;

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (id: string, variantKey?: string) => void;
  updateQuantity: (id: string, quantity: number, variantKey?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("cart_items");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const updateItems = (updater: (prev: CartItem[]) => CartItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      localStorage.setItem("cart_items", JSON.stringify(next));
      return next;
    });
  };

  const addItem = (item: Omit<CartItem, "quantity">, qty: number = 1) => {
    const addQty = Math.max(1, Math.floor(qty));
    try {
      trackAddToCart({
        content_name: item.name,
        content_ids: [item.id],
        value: item.price,
        currency: "BDT",
      });
    } catch {}

    updateItems((prev) => {
      const key = cartItemKey(item);
      const existing = prev.find((i) => cartItemKey(i) === key);
      if (existing) {
        return prev.map((i) => cartItemKey(i) === key ? { ...i, quantity: i.quantity + addQty, price: item.price } : i);
      }
      return [...prev, { ...item, quantity: addQty }];
    });
  };

  const removeItem = (id: string, variantKey?: string) => {
    const key = cartItemKey({ id, variantKey });
    updateItems((prev) => prev.filter((i) => cartItemKey(i) !== key));
  };

  const updateQuantity = (id: string, quantity: number, variantKey?: string) => {
    if (quantity <= 0) return removeItem(id, variantKey);
    const key = cartItemKey({ id, variantKey });
    updateItems((prev) => prev.map((i) => cartItemKey(i) === key ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem("cart_items");
  };

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};
