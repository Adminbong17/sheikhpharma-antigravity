import * as LucideIcons from "lucide-react";
import { FolderOpen } from "lucide-react";

interface CategoryIconProps {
  iconUrl: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Renders a category icon. Supports:
 * - "lucide:IconName" → renders the Lucide icon
 * - URL string → renders an <img>
 * - null → renders fallback FolderOpen icon
 */
const CategoryIcon = ({ iconUrl, name, className = "h-8 w-8", iconClassName = "h-6 w-6" }: CategoryIconProps) => {
  if (iconUrl?.startsWith("lucide:")) {
    const iconName = iconUrl.replace("lucide:", "");
    const Icon = (LucideIcons as Record<string, any>)[iconName];
    if (Icon && (typeof Icon === "function" || (typeof Icon === "object" && Icon.$$typeof))) {
      return <Icon className={className} />;
    }
  }

  if (iconUrl) {
    return <img src={iconUrl} alt={name} className={`${className} object-contain`} />;
  }

  return <FolderOpen className={iconClassName} />;
};

export default CategoryIcon;
