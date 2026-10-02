import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_default: boolean;
}

interface CurrencyContextType {
  currencies: Currency[];
  current: Currency;
  setCurrency: (code: string) => void;
  formatPrice: (price: number) => string;
  convertPrice: (price: number) => number;
}

const defaultCurrency: Currency = {
  id: "",
  code: "BDT",
  name: "Bangladeshi Taka",
  symbol: "৳",
  exchange_rate: 1,
  is_default: true,
};

const CurrencyContext = createContext<CurrencyContextType>({
  currencies: [defaultCurrency],
  current: defaultCurrency,
  setCurrency: () => {},
  formatPrice: (p) => `৳${p}`,
  convertPrice: (p) => p,
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currentCode, setCurrentCode] = useState<string>(() => {
    return localStorage.getItem("preferred_currency") || "BDT";
  });

  const { data: currencies = [defaultCurrency] } = useQuery({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("currencies")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false });
      return (data as Currency[]) || [defaultCurrency];
    },
  });

  const current = currencies.find((c) => c.code === currentCode) ||
    currencies.find((c) => c.is_default) ||
    defaultCurrency;

  const defaultRate = currencies.find((c) => c.is_default)?.exchange_rate || 1;

  const setCurrency = (code: string) => {
    setCurrentCode(code);
    localStorage.setItem("preferred_currency", code);
  };

  const convertPrice = (price: number) => {
    if (current.is_default) return price;
    return Number((price * (current.exchange_rate / defaultRate)).toFixed(2));
  };

  const formatPrice = (price: number) => {
    const converted = convertPrice(price);
    return `${current.symbol}${converted.toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider value={{ currencies, current, setCurrency, formatPrice, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};
