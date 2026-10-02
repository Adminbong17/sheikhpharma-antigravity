import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { User, LogIn } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const ProfileDropdown = () => {
  const { user, isAdmin, isVendor } = useAuth();
  const { t } = useLanguage();

  if (!user) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">{t("nav.login", "Login")}</span>
      </Link>
    );
  }

  const dashboardLink = isAdmin ? "/admin" : isVendor ? "/vendor" : "/dashboard";

  return (
    <Link
      to={dashboardLink}
      className="flex items-center gap-2 rounded-full border border-white/25 bg-white/15 hover:bg-white/25 px-2.5 py-1 text-xs sm:text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-primary text-xs font-extrabold shadow-sm">
        {user.email?.charAt(0).toUpperCase() || <User className="h-3.5 w-3.5" />}
      </div>
      <span className="hidden md:inline max-w-[110px] truncate font-medium">
        {user.email?.split("@")[0]}
      </span>
    </Link>
  );
};

export default ProfileDropdown;
