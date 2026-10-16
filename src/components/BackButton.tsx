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
  const isEmergency = className.includes("red") || className.includes("emergency");

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`group inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-xl hover:-translate-x-0.5 active:scale-95 transition-all duration-200 select-none ${
        isEmergency
          ? "bg-gradient-to-r from-red-600 to-rose-700 border border-red-400/40 ring-2 ring-red-400/20 hover:from-red-700 hover:to-rose-800"
          : "bg-gradient-to-r from-[#0F3577] via-[#1E6FD9] to-[#0D2E68] border border-blue-400/40 ring-2 ring-blue-500/25 hover:from-[#164796] hover:via-[#2563EB] hover:to-[#164796]"
      } ${className}`}
    >
      <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white/20 text-white group-hover:bg-white group-hover:text-[#0F3577] transition-all duration-200 shrink-0 shadow-inner">
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      <span className="tracking-wide drop-shadow-sm">{text}</span>
    </button>
  );
};

export default BackButton;

