import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

interface LanguageToggleProps {
  className?: string;
  variant?: "pill" | "compact";
}

const LanguageToggle = ({ className = "", variant = "pill" }: LanguageToggleProps) => {
  const { language, setLanguage } = useLanguage();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/25 bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all backdrop-blur-md active:scale-95 shadow-sm ${className}`}
        title={language === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
      >
        <Globe className="h-3.5 w-3.5 text-blue-200" />
        <span>{language === "bn" ? "বাং" : "EN"}</span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-full border border-white/25 bg-white/15 backdrop-blur-md shadow-sm transition-all select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage("bn")}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
          language === "bn"
            ? "bg-white text-primary shadow-sm scale-100 font-extrabold"
            : "text-white/80 hover:text-white hover:bg-white/10"
        }`}
      >
        <span>🇧🇩</span>
        <span>বাংলা</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
          language === "en"
            ? "bg-white text-primary shadow-sm scale-100 font-extrabold"
            : "text-white/80 hover:text-white hover:bg-white/10"
        }`}
      >
        <span>🇬🇧</span>
        <span>ENG</span>
      </button>
    </div>
  );
};

export default LanguageToggle;
