import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "bn" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  b: (bnText: string, enText: string) => string;
  formatNumber: (n: number | string) => string;
  isBangla: boolean;
}

// Convert English digits to Bengali digits
export const toBanglaNumber = (num: number | string): string => {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, (digit) => bnDigits[parseInt(digit, 10)]);
};

const translations: Record<string, { bn: string; en: string }> = {
  // Navigation & Header
  "nav.home": { bn: "হোম", en: "Home" },
  "nav.categories": { bn: "ক্যাটাগরি", en: "Categories" },
  "nav.brands": { bn: "ব্র্যান্ডসমূহ", en: "Brands" },
  "nav.vendors": { bn: "ভেন্ডরসমূহ", en: "Vendors" },
  "nav.upload_prescription": { bn: "প্রেসক্রিপশন আপলোড", en: "Upload Prescription" },
  "nav.emergency": { bn: "জরুরি সেবা", en: "Emergency" },
  "nav.lab_test": { bn: "ল্যাব টেস্ট", en: "Lab Test" },
  "nav.doctors": { bn: "বিশেষজ্ঞ ডাক্তার", en: "Specialist Doctors" },
  "nav.blood_bank": { bn: "ব্লাড ব্যাংক", en: "Blood Bank" },
  "nav.track_order": { bn: "অর্ডার ট্র্যাক", en: "Track Order" },
  "nav.login": { bn: "লগইন", en: "Login" },
  "nav.signup": { bn: "রেজিস্ট্রেশন", en: "Sign Up" },
  "nav.logout": { bn: "লগআউট", en: "Logout" },
  "nav.dashboard": { bn: "ড্যাশবোর্ড", en: "Dashboard" },
  "nav.admin": { bn: "অ্যাডমিন প্যানেল", en: "Admin Panel" },
  "nav.vendor": { bn: "ভেন্ডর প্যানেল", en: "Vendor Panel" },
  "nav.wishlist": { bn: "উইশলিস্ট", en: "Wishlist" },
  "nav.my_orders": { bn: "আমার অর্ডারসমূহ", en: "My Orders" },
  "nav.profile": { bn: "প্রোফাইল", en: "Profile" },
  "nav.help_center": { bn: "হেল্প সেন্টার", en: "Help Center" },

  // Search
  "search.placeholder": { bn: "ওষুধ, ব্র্যান্ড বা স্বাস্থ্যসেবা পণ্য খুঁজুন...", en: "Search medicines, brands or health products..." },
  "search.button": { bn: "খুঁজুন", en: "Search" },
  "search.found": { bn: "টি পণ্য পাওয়া গেছে", en: "products found" },
  "search.in_stock": { bn: "স্টকে আছে", en: "In Stock" },
  "search.see_all": { bn: "সম্পর্কিত সব পণ্য দেখুন", en: "See all results for" },
  "search.recent": { bn: "সম্প্রতি অনুসন্ধান করা হয়েছে", en: "Recently Searched" },
  "search.clear": { bn: "মুছে ফেলুন", en: "Clear All" },

  // Cart & Checkout
  "cart.title": { bn: "শপিং কার্ট", en: "Shopping Cart" },
  "cart.empty": { bn: "আপনার কার্ট বর্তমানে খালি", en: "Your cart is currently empty" },
  "cart.total": { bn: "সর্বমোট:", en: "Total:" },
  "cart.subtotal": { bn: "সাবটোটাল", en: "Subtotal" },
  "cart.delivery_fee": { bn: "ডেলিভারি ফি", en: "Delivery Fee" },
  "cart.discount": { bn: "ছাড়", en: "Discount" },
  "cart.checkout": { bn: "অর্ডার সম্পন্ন করুন", en: "Proceed to Checkout" },
  "cart.clear": { bn: "কার্ট খালি করুন", en: "Clear Cart" },
  "cart.add": { bn: "কার্টে যোগ করুন", en: "Add to Cart" },
  "cart.buy_now": { bn: "এখনই কিনুন", en: "Buy Now" },
  "cart.view": { bn: "কার্ট দেখুন", en: "View Cart" },
  "cart.remove": { bn: "মুছে ফেলুন", en: "Remove" },
  "cart.place_order": { bn: "অর্ডার কনফার্ম করুন", en: "Confirm Order" },
  "cart.shipping_address": { bn: "ডেলিভারি ঠিকানা", en: "Shipping Address" },
  "cart.order_summary": { bn: "অর্ডার সামারি", en: "Order Summary" },
  "cart.full_name": { bn: "আপনার নাম", en: "Full Name" },
  "cart.phone_number": { bn: "মোবাইল নম্বর", en: "Phone Number" },
  "cart.delivery_zone": { bn: "ডেলিভারি এলাকা", en: "Delivery Zone" },
  "cart.full_address": { bn: "সম্পূর্ণ ঠিকানা (বাসা/রোড/এলাকা)", en: "Detailed Address (House/Road/Area)" },
  "cart.notes": { bn: "বিশেষ কোনো নির্দেশনা (ঐচ্ছিক)", en: "Order Notes (Optional)" },
  "cart.payment_method": { bn: "পেমেন্ট মাধ্যম বেছে নিন", en: "Select Payment Method" },
  "cart.cod": { bn: "ক্যাশ অন ডেলিভারি (পণ্য পেয়ে টাকা দিন)", en: "Cash on Delivery (Pay upon delivery)" },
  "cart.bkash": { bn: "বিকাশ পেমেন্ট", en: "bKash Online Payment" },
  "cart.uddoktapay": { bn: "অনলাইন পেমেন্ট (কার্ড/মোবাইল ব্যাংকিং)", en: "Online Payment (Card/MFS)" },
  "cart.coupon_label": { bn: "কুপন কোড দিন", en: "Enter Coupon Code" },
  "cart.apply_coupon": { bn: "প্রয়োগ করুন", en: "Apply" },

  // Product details
  "product.price": { bn: "মূল্য:", en: "Price:" },
  "product.mrp": { bn: "এমআরপি:", en: "MRP:" },
  "product.discount": { bn: "ছাড়", en: "OFF" },
  "product.generic": { bn: "জেনেরিক নাম:", en: "Generic:" },
  "product.brand": { bn: "কোম্পানি / ব্র্যান্ড:", en: "Brand:" },
  "product.category": { bn: "ক্যাটাগরি:", en: "Category:" },
  "product.dosage": { bn: "ডোজ / ফরম:", en: "Dosage Form:" },
  "product.out_of_stock": { bn: "স্টক শেষ", en: "Out of Stock" },
  "product.in_stock": { bn: "স্টকে আছে", en: "In Stock" },
  "product.unit": { bn: "ইউনিট", en: "Unit" },
  "product.prescription_required": { bn: "প্রেসক্রিপশন আবশ্যক", en: "Prescription Required" },
  "product.genuine_guarantee": { bn: "১০০% খাঁটি ওষুধের নিশ্চয়তা", en: "100% Genuine Medicine" },
  "product.description": { bn: "পণ্যের বিবরণ", en: "Product Description" },
  "product.side_effects": { bn: "পার্শ্বপ্রতিক্রিয়া ও সতর্কতা", en: "Side Effects & Precautions" },
  "product.how_to_use": { bn: "ব্যবহার বিধি ও মাত্রা", en: "Dosage & How to Use" },
  "product.preorder": { bn: "অগ্রিম অর্ডার", en: "Pre-Order" },
  "product.verified": { bn: "এসকেপি ভেরিফাইড", en: "Verified by SKP" },
  "product.sold": { bn: "টি বিক্রি হয়েছে", en: "sold" },
  "product.just_for_you": { bn: "আপনার জন্য সেরা পণ্য", en: "Just For You" },
  "product.top_vendors": { bn: "শীর্ষ ভেন্ডর ও ফার্মেসি", en: "Shop by Top Vendor" },
  "product.shop_by_brand": { bn: "জনপ্রিয় ব্র্যান্ডসমূহ", en: "Shop by Brand" },

  // Auth / Login
  "auth.login_title": { bn: "লগইন", en: "Login" },
  "auth.login_sub": { bn: "মোবাইল নম্বর দিয়ে OTP কোড গ্রহণ করুন", en: "Enter your phone number to receive an OTP code" },
  "auth.otp_sub": { bn: "আপনার মোবাইলে পাঠানো ৬ ডিজিটের OTP কোডটি লিখুন", en: "Enter the 6-digit OTP code sent to your phone" },
  "auth.phone_label": { bn: "মোবাইল নম্বর", en: "Phone Number" },
  "auth.send_otp": { bn: "OTP পাঠান", en: "Send OTP" },
  "auth.sending": { bn: "পাঠানো হচ্ছে...", en: "Sending..." },
  "auth.otp_label": { bn: "OTP কোড (৬ ডিজিট)", en: "OTP Code (6 Digits)" },
  "auth.resend_otp": { bn: "আবার কোড পাঠান", en: "Resend OTP" },
  "auth.resend_in": { bn: "পুনরায় পাঠানো যাবে", en: "Resend in" },
  "auth.verify_login": { bn: "লগইন সম্পন্ন করুন", en: "Complete Login" },
  "auth.verifying": { bn: "যাচাই করা হচ্ছে...", en: "Verifying..." },
  "auth.auto_account_note": { bn: "নতুন মোবাইল নম্বর হলে স্বয়ংক্রিয়ভাবে একাউন্ট তৈরি হয়ে যাবে।", en: "New number will automatically create an account." },
  "auth.secure_badge": { bn: "নিরাপদ ও এনক্রিপ্টেড সংযোগ", en: "Secure & Encrypted Connection" },

  // General / UI
  "common.view_details": { bn: "বিস্তারিত দেখুন", en: "View Details" },
  "common.view_all": { bn: "সব দেখুন", en: "See All" },
  "common.order_now": { bn: "অর্ডার করুন", en: "Order Now" },
  "common.quick_order": { bn: "দ্রুত অর্ডার", en: "Quick Order" },
  "common.whatsapp_order": { bn: "হোয়াটসঅ্যাপে অর্ডার", en: "WhatsApp Order" },
  "common.call_us": { bn: "কল করুন", en: "Call Us" },
  "common.delivery_charge": { bn: "ডেলিভারি চার্জ", en: "Delivery Charge" },
  "common.cash_on_delivery": { bn: "ক্যাশ অন ডেলিভারি", en: "Cash on Delivery" },
  "common.secure_payment": { bn: "নিরাপদ পেমেন্ট", en: "Secure Payment" },
  "common.model_pharmacy": { bn: "মডেল ফার্মেসি ও হেলথকেয়ার", en: "Model Pharmacy & Health" },
  "common.emergency_help": { bn: "জরুরি সেবা", en: "Emergency" },
  "common.emergency_tap": { bn: "জরুরি সেবা পেতে ও কল করতে ট্যাপ করুন", en: "Tap to view emergency contacts & call instantly" },
  "common.prayer_title": { bn: "নামাজ ও রোজা", en: "Prayer & Fasting" },
  "common.see_details": { bn: "বিস্তারিত", en: "Details" },
  "common.sehri": { bn: "পরবর্তী সাহরি", en: "Next Sahri" },
  "common.iftar": { bn: "আজকের ইফতার", en: "Today's Iftar" },
  "common.now": { bn: "এখন", en: "Now" },
  "common.time_remain": { bn: "ওয়াক্ত বাকি", en: "Time Remaining" },
  "common.minutes": { bn: "মিনিট", en: "mins" },
  "common.sunrise": { bn: "সূর্যোদয়", en: "Sunrise" },
  "common.sunset": { bn: "সূর্যাস্ত", en: "Sunset" },

  // Footer
  "footer.tagline": {
    bn: "আপনার বিশ্বস্ত অনলাইন মডেল ফার্মেসি — ১০০% খাঁটি ওষুধ ও স্বাস্থ্যসেবা পণ্য দ্রুত হোম ডেলিভারি।",
    en: "Your trusted online model pharmacy — 100% authentic medicines & health products with fast home delivery.",
  },
  "footer.customer_service": { bn: "গ্রাহক সেবা", en: "Customer Service" },
  "footer.help_center": { bn: "সহায়তা কেন্দ্র", en: "Help Center" },
  "footer.how_to_buy": { bn: "কীভাবে কিনবেন", en: "How to Buy" },
  "footer.returns": { bn: "রিটার্ন ও রিফান্ড পলিসি", en: "Returns & Refunds" },
  "footer.contact_us": { bn: "যোগাযোগ করুন", en: "Contact Us" },
  "footer.about_us": { bn: "আমাদের সম্পর্কে", en: "About Us" },
  "footer.about_company": { bn: "সম্পর্কে", en: "About" },
  "footer.careers": { bn: "ক্যারিয়ার", en: "Careers" },
  "footer.privacy_policy": { bn: "গোপনীয়তা নীতি", en: "Privacy Policy" },
  "footer.terms": { bn: "ব্যবহারের শর্তাবলী", en: "Terms & Conditions" },
  "footer.payment_methods": { bn: "পেমেন্ট মাধ্যমসমূহ", en: "Payment Methods" },
  "footer.become_seller": { bn: "ভেন্ডর / সেলার হোন", en: "Become a Seller" },
  "footer.download_app": { bn: "অ্যাপ ডাউনলোড করুন", en: "Download App" },
  "footer.rights": { bn: "সর্বস্বত্ব সংরক্ষিত।", en: "All rights reserved." },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "bn",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  b: (bnText: string, enText: string) => bnText,
  formatNumber: (n: number | string) => String(n),
  isBangla: true,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("preferred_language") as Language) || "bn";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("preferred_language", lang);
    document.documentElement.lang = lang;
  };

  const toggleLanguage = () => {
    const next = language === "bn" ? "en" : "bn";
    setLanguage(next);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const entry = translations[key];
    if (entry) {
      return entry[language] || fallback || entry.en || entry.bn;
    }
    return fallback !== undefined ? fallback : key;
  };

  const b = (bnText: string, enText: string): string => {
    return language === "bn" ? bnText : enText;
  };

  const formatNumber = (n: number | string): string => {
    if (language === "bn") {
      return toBanglaNumber(n);
    }
    return String(n);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        b,
        formatNumber,
        isBangla: language === "bn",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
