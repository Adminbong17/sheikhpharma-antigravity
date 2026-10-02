import { useState, useRef, useEffect } from "react";
import { Search, Clock, X, Sparkles, ArrowRight, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import ProfileDropdown from "@/components/ProfileDropdown";
import CartSheet from "@/components/CartSheet";
import LanguageToggle from "@/components/LanguageToggle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce, searchProductsSmart } from "@/lib/smartSearch";

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;

const getSearchHistory = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveSearchTerm = (term: string) => {
  const history = getSearchHistory().filter((t) => t.toLowerCase() !== term.toLowerCase());
  history.unshift(term);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
};

const removeSearchTerm = (term: string) => {
  const history = getSearchHistory().filter((t) => t !== term);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
};

const clearSearchHistory = () => {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
};

const SearchInputBox = ({
  siteSettings,
  query,
  setQuery,
  setShowDropdown,
  showDropdown,
  suggestions,
  isFetching,
  handleSubmit,
  wrapperRef,
  navigate,
  formatPrice,
  showHistory,
  setShowHistory,
  history,
  setHistory,
}: any) => {
  const { t, language } = useLanguage();

  const handleFocus = () => {
    if (query.trim().length >= 1) {
      setShowDropdown(true);
      setShowHistory(false);
    } else {
      setShowHistory(true);
      setShowDropdown(false);
    }
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    setShowHistory(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleRemoveHistory = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    removeSearchTerm(term);
    setHistory(getSearchHistory());
  };

  const handleClearAll = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const showPanel = showHistory && !showDropdown && history.length > 0;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="relative flex items-center w-full h-11 bg-white dark:bg-slate-900 rounded-full pl-3.5 pr-1.5 shadow-sm border border-slate-200/90 dark:border-slate-700/80 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200">
          <Search className="h-4 w-4 text-slate-400 shrink-0 select-none" />

          <input
            type="text"
            placeholder={
              language === "bn"
                ? `${siteSettings?.site_name || "শেখ ফার্মা"}-এ ওষুধ বা পণ্য খুঁজুন...`
                : `Search medicines, health products in ${siteSettings?.site_name || "Sheikh Pharma"}...`
            }
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:outline-none px-2.5 h-full"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length >= 1) {
                setShowDropdown(true);
                setShowHistory(false);
              } else {
                setShowDropdown(false);
                setShowHistory(true);
              }
            }}
            onFocus={handleFocus}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setShowDropdown(false);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <Button
            type="submit"
            size="sm"
            className="h-8 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all duration-150 flex items-center gap-1.5 shrink-0"
          >
            <Search className="h-3.5 w-3.5" />
            <span>{t("search.button", "Search")}</span>
          </Button>
        </div>
      </form>

      {/* Loading indicator when typing */}
      {showDropdown && isFetching && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl z-[100] p-4 text-center">
          <p className="text-xs text-slate-500 animate-pulse font-semibold">
            {language === "bn" ? "ওষুধ খোঁজা হচ্ছে..." : "Searching medicines..."}
          </p>
        </div>
      )}

      {/* No results notice */}
      {showDropdown && !isFetching && suggestions.length === 0 && query.trim().length >= 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl z-[100] p-4 text-center">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            "{query}" এর সাথে কোনো ওষুধ মেলেনি
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            বানান সঠিক কিনা দেখুন বা জেনেরিক নাম (যেমন Paracetamol) লিখে খুঁজুন
          </p>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl z-[100] overflow-hidden max-h-[72vh] overflow-y-auto animate-in fade-in-50 duration-150">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {suggestions.length} {t("search.found", "items found")}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
              {t("search.in_stock", "Verified Stock")}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {suggestions.map((item: any) => {
              const discount =
                item.original_price && item.original_price > item.price
                  ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
                  : 0;

              return (
                <Link
                  key={item.id}
                  to={`/product/${item.slug || item.id}`}
                  className="flex items-center gap-3.5 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
                  onClick={() => {
                    setShowDropdown(false);
                    saveSearchTerm(query.trim());
                    setQuery("");
                  }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-12 w-12 rounded-xl object-cover bg-white shrink-0 border border-slate-200/80 dark:border-slate-700 p-0.5 group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0 text-primary dark:text-blue-400 group-hover:scale-105 transition-transform">
                      <Pill className="h-6 w-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-primary transition-colors">
                      {item.name}
                    </p>
                    {item.generic_name && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic font-medium">
                        {item.generic_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(item.price)}
                      </span>
                      {discount > 0 && (
                        <>
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(item.original_price)}
                          </span>
                          <span className="text-[10px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded-full">
                            {discount}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            className="w-full px-4 py-3 text-center text-xs sm:text-sm font-bold text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900"
            onClick={() => {
              setShowDropdown(false);
              saveSearchTerm(query.trim());
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <span>"{query}" সম্পর্কিত সব পণ্য দেখুন</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Recent Searches Dropdown */}
      {showPanel && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl z-[100] overflow-hidden max-h-[70vh] overflow-y-auto animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              সম্প্রতি অনুসন্ধান করা হয়েছে
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-primary hover:underline"
            >
              মুছে ফেলুন
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((term: string) => (
              <div
                key={term}
                onClick={() => handleHistoryClick(term)}
                className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left group"
              >
                <Clock className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                <span className="text-sm text-slate-800 dark:text-slate-200 line-clamp-1 flex-1 font-medium">
                  {term}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveHistory(e, term)}
                  className="p-1 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Navbar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 160);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>(getSearchHistory());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { formatPrice } = useCurrency();
  const { data: siteSettings } = useSiteSettings();
  const { t } = useLanguage();

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ["search-suggestions", debouncedQuery],
    queryFn: () =>
      searchProductsSmart(
        debouncedQuery,
        "id, name, generic_name, image_url, price, original_price, slug, sold_count, stock",
        8
      ),
    enabled: debouncedQuery.trim().length >= 1,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveSearchTerm(query.trim());
      setHistory(getSearchHistory());
      setShowDropdown(false);
      setShowHistory(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const searchProps = {
    siteSettings,
    query,
    setQuery,
    setShowDropdown,
    showDropdown,
    suggestions,
    isFetching,
    handleSubmit,
    wrapperRef,
    navigate,
    formatPrice,
    showHistory,
    setShowHistory,
    history,
    setHistory,
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#0F3577] via-[#164796] to-[#0D2E68] text-white shadow-md border-b border-white/10 backdrop-blur-md">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Desktop Single-Row Unified Luxury Header */}
        <div className="hidden md:flex items-center justify-between gap-4 lg:gap-8 h-16">
          {/* Brand Logo & Name */}
          <Link to="/" className="shrink-0 flex items-center gap-3 group">
            {siteSettings?.logo_url ? (
              <div className="relative">
                <div className="absolute -inset-1 bg-white/20 rounded-full blur-sm group-hover:bg-white/30 transition-all duration-300" />
                <img
                  src={siteSettings.logo_url}
                  alt={siteSettings.site_name || "Sheikh Pharma"}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-white/80 shadow-md relative z-10 group-hover:scale-105 transition-transform"
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-lg lg:text-xl font-bold tracking-tight text-white leading-tight drop-shadow-sm group-hover:text-blue-100 transition-colors">
                {siteSettings?.site_name || "Sheikh Pharma"}
              </span>
              <span className="text-[10px] text-blue-200/90 font-semibold tracking-wide">
                {t("common.model_pharmacy", "Model Pharmacy & Health")}
              </span>
            </div>
          </Link>

          {/* Center Integrated Search Bar */}
          <div className="flex-1 max-w-2xl">
            <SearchInputBox {...searchProps} />
          </div>

          {/* Right Action Icons (Language Toggle, Profile & Cart) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <LanguageToggle />
            <ProfileDropdown />
            <CartSheet />
          </div>
        </div>

        {/* Mobile Header (2 compact sleek rows) */}
        <div className="md:hidden py-2.5 space-y-2.5">
          {/* Mobile Top Row: Logo on left, Actions on right */}
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2 group min-w-0">
              {siteSettings?.logo_url && (
                <img
                  src={siteSettings.logo_url}
                  alt={siteSettings.site_name || "Sheikh Pharma"}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-white/70 shadow-sm shrink-0"
                />
              )}
              <span className="text-base font-bold tracking-tight text-white truncate drop-shadow-sm">
                {siteSettings?.site_name || "Sheikh Pharma"}
              </span>
            </Link>

            <div className="flex items-center gap-1.5 shrink-0">
              <LanguageToggle variant="compact" />
              <ProfileDropdown />
              <CartSheet />
            </div>
          </div>

          {/* Mobile Search Row: Integrated cleanly without extra cards */}
          <div>
            <SearchInputBox {...searchProps} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
