import {
  LayoutDashboard, Package, ShoppingCart, Users, Store, Download, FolderTree,
  Coins, Tag, Activity, Settings, PackageCheck, MapPin, TrendingUp, Headphones,
  BarChart3, Ticket, ClipboardList, Image, Layers, MessageCircle, Wallet,
  RotateCcw, CreditCard, Briefcase, FileText, Key, Banknote, Receipt, Phone,
  Landmark, Pill, Microscope, Building2, Stethoscope, ScanLine, Siren,
} from "lucide-react";
import { BookOpen, Link2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminNavItem = {
  title: string;
  path: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { title: "Overview", path: "/admin", icon: LayoutDashboard },
      { title: "Activity Log", path: "/admin/activity-log", icon: Activity },
    ],
  },
  {
    label: "Catalog",
    icon: Package,
    items: [
      { title: "Products", path: "/admin/products", icon: Package },
      { title: "Categories", path: "/admin/categories", icon: FolderTree },
      { title: "Brands", path: "/admin/brands", icon: Tag },
      { title: "Grab Product", path: "/admin/grab-product", icon: Download },
    ],
  },
  {
    label: "Orders & Sales",
    icon: ShoppingCart,
    items: [
      { title: "POS Register", path: "/admin/pos", icon: ScanLine },
      { title: "POS Sessions", path: "/admin/pos/sessions", icon: Activity },
      { title: "Sales Returns", path: "/admin/pos/returns", icon: RotateCcw },
      { title: "Stock Transfers", path: "/admin/pos/transfers", icon: PackageCheck },
      { title: "POS Reports", path: "/admin/pos/reports", icon: BarChart3 },
      { title: "Staff Commissions", path: "/admin/pos/commissions", icon: Wallet },
      { title: "Orders", path: "/admin/orders", icon: ShoppingCart },
      { title: "Pre-Orders", path: "/admin/pre-orders", icon: PackageCheck },
      { title: "Incomplete Orders", path: "/admin/incomplete-orders", icon: ClipboardList },
      { title: "Refund Requests", path: "/admin/refunds", icon: RotateCcw },
      { title: "Prescriptions", path: "/admin/prescriptions", icon: Pill },
    ],
  },
  {
    label: "Lab Test",
    icon: Microscope,
    items: [
      { title: "Lab Tests", path: "/admin/lab-tests", icon: Microscope },
      { title: "Lab Centers", path: "/admin/lab-centers", icon: Building2 },
      { title: "Lab Bookings", path: "/admin/lab-bookings", icon: Microscope },
      { title: "Blood Bank", path: "/admin/blood-requests", icon: Microscope },
      { title: "Doctors", path: "/admin/doctors", icon: Stethoscope },
      { title: "Doctor Categories", path: "/admin/doctor-categories", icon: FolderTree },
    ],
  },
  {
    label: "Finance",
    icon: Landmark,
    items: [
      { title: "Invoices", path: "/admin/invoices", icon: FileText },
      { title: "Purchase Invoices", path: "/admin/purchase-invoices", icon: Receipt },
      { title: "Cash Book", path: "/admin/cash-book", icon: Landmark },
      { title: "Expenses", path: "/admin/expenses", icon: Receipt },
      { title: "Capital / পুঁজি", path: "/admin/capital", icon: Wallet },
      { title: "Investments", path: "/admin/investments", icon: Banknote },
      { title: "Customer Credits", path: "/admin/customer-credits", icon: CreditCard },
      { title: "Currencies", path: "/admin/currencies", icon: Coins },
      { title: "টাকা ট্র্যাকিং", path: "/admin/money-tracking", icon: Banknote },
      { title: "Payment Links", path: "/admin/payment-links", icon: Link2 },
      { title: "Link Payments", path: "/admin/link-payments", icon: CreditCard },
      { title: "Form Submissions", path: "/admin/form-submissions", icon: Link2 },
    ],
  },
  {
    label: "Vendors",
    icon: Store,
    items: [
      { title: "Vendors", path: "/admin/vendors", icon: Store },
      { title: "Vendor Messages", path: "/admin/messages", icon: MessageCircle },
      { title: "Vendor Payouts", path: "/admin/payouts", icon: Wallet },
    ],
  },
  {
    label: "Users & Staff",
    icon: Users,
    items: [
      { title: "Users", path: "/admin/users", icon: Users },
      { title: "Staff Management", path: "/admin/staff", icon: Users },
      { title: "Careers", path: "/admin/careers", icon: Briefcase },
    ],
  },
  {
    label: "Marketing",
    icon: BarChart3,
    items: [
      { title: "Marketing", path: "/admin/marketing", icon: BarChart3 },
      { title: "Coupons", path: "/admin/coupons", icon: Ticket },
      { title: "Boost Settings", path: "/admin/boost", icon: TrendingUp },
      { title: "Hero Slides", path: "/admin/hero-slides", icon: Image },
      { title: "Homepage Sections", path: "/admin/homepage-sections", icon: Layers },
      { title: "Left Menu", path: "/admin/left-menu", icon: Layers },
      { title: "Section Banners", path: "/admin/section-banners", icon: Image },
      { title: "Flash Deals", path: "/admin/flash-deals", icon: TrendingUp },
      { title: "Emergency Contacts", path: "/admin/emergency-contacts", icon: Siren },
    ],
  },
  {
    label: "Support",
    icon: Headphones,
    items: [
      { title: "Support Tickets", path: "/admin/support-tickets", icon: Headphones },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    items: [
      { title: "Site Settings", path: "/admin/site-settings", icon: Settings },
      { title: "Delivery Zones", path: "/admin/delivery-zones", icon: MapPin },
      { title: "Static Pages", path: "/admin/static-pages", icon: FileText },
      { title: "SMS Settings", path: "/admin/sms-settings", icon: Phone },
      { title: "API Keys", path: "/admin/api-keys", icon: Key },
      { title: "API Docs", path: "/admin/api-docs", icon: BookOpen },
    ],
  },
];

// Flat list for route auditing
export const adminNavItems: AdminNavItem[] = adminNavGroups.flatMap(g => g.items);
export const ADMIN_NAV_COUNT = adminNavItems.length;
