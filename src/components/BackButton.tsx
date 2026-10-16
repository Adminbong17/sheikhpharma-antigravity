import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface BackButtonProps {
  className?: string;
  label?: string;
  to?: string;
}

const BackButton = ({ className = "", label, to }: BackButtonProps) => {
  const navigate = useNavigate();
  const { b } = useLanguage();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const text = label || b("ফিরে যান", "Back");
  const isWhite = className.includes("!text-white") || className.includes("text-white");

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 select-none ${
        isWhite
          ? "bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-md"
          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800 hover:border-primary/50 hover:text-primary hover:bg-primary/[0.04]"
      } ${className}`}
    >
      <span
        className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full transition-all duration-200 shrink-0 ${
          isWhite
            ? "bg-white/20 text-white group-hover:bg-white group-hover:text-red-600"
            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-white"
        }`}
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      <span className="font-medium tracking-wide">{text}</span>
    </button>
  );
};

export default BackButton;

