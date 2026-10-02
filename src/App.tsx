import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import FacebookPixel from "@/components/FacebookPixel";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { useApplySiteColors } from "@/hooks/useApplySiteColors";
import ScrollToTop from "@/components/ScrollToTop";
import MobileBottomNav from "@/components/MobileBottomNav";
import PageLoading from "@/components/PageLoading";

// Core homepage imported directly for instantaneous first paint
import Index from "./pages/Index";

// Lazy-loaded layouts
const AdminLayout = lazy(() => import("@/components/AdminLayout"));
const AdminVendorLayout = lazy(() => import("@/components/AdminVendorLayout"));
const AdminCustomerLayout = lazy(() => import("@/components/AdminCustomerLayout"));
const VendorLayout = lazy(() => import("@/components/VendorLayout"));

// Public Storefront Pages
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const AllCategories = lazy(() => import("./pages/AllCategories"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const GenericPage = lazy(() => import("./pages/GenericPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const BrandPage = lazy(() => import("./pages/BrandPage"));
const AllBrands = lazy(() => import("./pages/AllBrands"));
const AllVendors = lazy(() => import("./pages/AllVendors"));
const VendorStorePage = lazy(() => import("./pages/VendorStorePage"));
const SectionPage = lazy(() => import("./pages/SectionPage"));
const LeftMenuItemPage = lazy(() => import("./pages/LeftMenuItemPage"));
const QmallProducts = lazy(() => import("./pages/QmallProducts"));
const PreOrderProducts = lazy(() => import("./pages/PreOrderProducts"));
const FlashDealsPage = lazy(() => import("./pages/FlashDealsPage"));
const StaticPage = lazy(() => import("./pages/StaticPage"));
const CareersApply = lazy(() => import("./pages/CareersApply"));
const Checkout = lazy(() => import("./pages/Checkout"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const PrescriptionUpload = lazy(() => import("./pages/PrescriptionUpload"));
const LabTest = lazy(() => import("./pages/LabTest"));
const LabTestCentersPage = lazy(() => import("./pages/LabTestCentersPage"));
const LabCenterPage = lazy(() => import("./pages/LabCenterPage"));
const ExternalCart = lazy(() => import("./pages/ExternalCart"));
const SpecialistDoctors = lazy(() => import("./pages/SpecialistDoctors"));
const BloodBank = lazy(() => import("./pages/BloodBank"));
const Emergency = lazy(() => import("./pages/Emergency"));
const PayLink = lazy(() => import("./pages/PayLink"));
const PrayerTimes = lazy(() => import("./pages/PrayerTimes"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const BkashCallback = lazy(() => import("./pages/BkashCallback"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Customer Dashboard Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Wishlist = lazy(() => import("./pages/dashboard/Wishlist"));
const MyOrders = lazy(() => import("./pages/dashboard/MyOrders"));
const Inbox = lazy(() => import("./pages/dashboard/Inbox"));
const Followed = lazy(() => import("./pages/dashboard/Followed"));
const Vouchers = lazy(() => import("./pages/dashboard/Vouchers"));
const ProfileSettings = lazy(() => import("./pages/dashboard/ProfileSettings"));
const SupportTickets = lazy(() => import("./pages/dashboard/SupportTickets"));
const MyCredits = lazy(() => import("./pages/dashboard/MyCredits"));
const MyLabTests = lazy(() => import("./pages/dashboard/MyLabTests"));

// Vendor Pages
const VendorApply = lazy(() => import("./pages/VendorApply"));
const VendorOverview = lazy(() => import("./pages/vendor/VendorOverview"));
const VendorProducts = lazy(() => import("./pages/vendor/VendorProducts"));
const VendorOrders = lazy(() => import("./pages/vendor/VendorOrders"));
const VendorSettings = lazy(() => import("./pages/vendor/VendorSettings"));
const VendorProductGrabber = lazy(() => import("./pages/vendor/VendorProductGrabber"));
const VendorBrands = lazy(() => import("./pages/vendor/VendorBrands"));
const VendorActivityLog = lazy(() => import("./pages/vendor/VendorActivityLog"));
const VendorPreOrders = lazy(() => import("./pages/vendor/VendorPreOrders"));
const VendorReviews = lazy(() => import("./pages/vendor/VendorReviews"));
const VendorMessages = lazy(() => import("./pages/vendor/VendorMessages"));
const VendorPaymentMethods = lazy(() => import("./pages/vendor/VendorPaymentMethods"));
const VendorPayouts = lazy(() => import("./pages/vendor/VendorPayouts"));
const VendorInvoices = lazy(() => import("./pages/vendor/VendorInvoices"));
const VendorPosRegister = lazy(() => import("./pages/vendor/VendorPosRegister"));

// Vendor POS Wrappers
const VendorPosSessions = lazy(() =>
  import("./pages/vendor/VendorPosWrappers").then((m) => ({ default: m.VendorPosSessions }))
);
const VendorSalesReturns = lazy(() =>
  import("./pages/vendor/VendorPosWrappers").then((m) => ({ default: m.VendorSalesReturns }))
);
const VendorStockTransfers = lazy(() =>
  import("./pages/vendor/VendorPosWrappers").then((m) => ({ default: m.VendorStockTransfers }))
);
const VendorPosReports = lazy(() =>
  import("./pages/vendor/VendorPosWrappers").then((m) => ({ default: m.VendorPosReports }))
);
const VendorStaffCommissions = lazy(() =>
  import("./pages/vendor/VendorPosWrappers").then((m) => ({ default: m.VendorStaffCommissions }))
);

// Admin Pages
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminVendors = lazy(() => import("./pages/admin/AdminVendors"));
const ProductGrabber = lazy(() => import("./pages/admin/ProductGrabber"));
const AdminCurrencies = lazy(() => import("./pages/admin/AdminCurrencies"));
const AdminBrands = lazy(() => import("./pages/admin/AdminBrands"));
const AdminActivityLog = lazy(() => import("./pages/admin/AdminActivityLog"));
const AdminSiteSettings = lazy(() => import("./pages/admin/AdminSiteSettings"));
const AdminDeliveryZones = lazy(() => import("./pages/admin/AdminDeliveryZones"));
const AdminPreOrders = lazy(() => import("./pages/admin/AdminPreOrders"));
const AdminBoostSettings = lazy(() => import("./pages/admin/AdminBoostSettings"));
const AdminHeroSlides = lazy(() => import("./pages/admin/AdminHeroSlides"));
const AdminSupportTickets = lazy(() => import("./pages/admin/AdminSupportTickets"));
const AdminMarketingSettings = lazy(() => import("./pages/admin/AdminMarketingSettings"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminIncompleteOrders = lazy(() => import("./pages/admin/AdminIncompleteOrders"));
const AdminHomepageSections = lazy(() => import("./pages/admin/AdminHomepageSections"));
const AdminSectionProducts = lazy(() => import("./pages/admin/AdminSectionProducts"));
const AdminLeftMenuItems = lazy(() => import("./pages/admin/AdminLeftMenuItems"));
const AdminLeftMenuProducts = lazy(() => import("./pages/admin/AdminLeftMenuProducts"));
const AdminSectionBanners = lazy(() => import("./pages/admin/AdminSectionBanners"));
const AdminFlashDeals = lazy(() => import("./pages/admin/AdminFlashDeals"));
const AdminStaticPages = lazy(() => import("./pages/admin/AdminStaticPages"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminRefunds = lazy(() => import("./pages/admin/AdminRefunds"));
const AdminCustomerCredits = lazy(() => import("./pages/admin/AdminCustomerCredits"));
const AdminCareers = lazy(() => import("./pages/admin/AdminCareers"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff"));
const AdminInvoices = lazy(() => import("./pages/admin/AdminInvoices"));
const AdminPosRegister = lazy(() => import("./pages/admin/AdminPosRegister"));
const AdminPosSessions = lazy(() => import("./pages/admin/AdminPosSessions"));
const AdminSalesReturns = lazy(() => import("./pages/admin/AdminSalesReturns"));
const AdminStockTransfers = lazy(() => import("./pages/admin/AdminStockTransfers"));
const AdminPosReports = lazy(() => import("./pages/admin/AdminPosReports"));
const AdminStaffCommissions = lazy(() => import("./pages/admin/AdminStaffCommissions"));
const AdminApiKeys = lazy(() => import("./pages/admin/AdminApiKeys"));
const AdminApiDocs = lazy(() => import("./pages/admin/AdminApiDocs"));
const AdminInvestments = lazy(() => import("./pages/admin/AdminInvestments"));
const AdminExpenses = lazy(() => import("./pages/admin/AdminExpenses"));
const AdminCashBook = lazy(() => import("./pages/admin/AdminCashBook"));
const AdminSmsSettings = lazy(() => import("./pages/admin/AdminSmsSettings"));
const AdminPurchaseInvoices = lazy(() => import("./pages/admin/AdminPurchaseInvoices"));
const AdminCapital = lazy(() => import("./pages/admin/AdminCapital"));
const AdminMoneyTracking = lazy(() => import("./pages/admin/AdminMoneyTracking"));
const AdminPrescriptions = lazy(() => import("./pages/admin/AdminPrescriptions"));
const AdminLabTests = lazy(() => import("./pages/admin/AdminLabTests"));
const AdminLabCenters = lazy(() => import("./pages/admin/AdminLabCenters"));
const AdminLabTestBookings = lazy(() => import("./pages/admin/AdminLabTestBookings"));
const AdminBloodRequests = lazy(() => import("./pages/admin/AdminBloodRequests"));
const AdminDoctors = lazy(() => import("./pages/admin/AdminDoctors"));
const AdminDoctorCategories = lazy(() => import("./pages/admin/AdminDoctorCategories"));
const AdminEmergencyContacts = lazy(() => import("./pages/admin/AdminEmergencyContacts"));
const AdminPaymentLinks = lazy(() => import("./pages/admin/AdminPaymentLinks"));
const AdminPaymentLinkPayments = lazy(() => import("./pages/admin/AdminPaymentLinkPayments"));
const AdminFormSubmissions = lazy(() => import("./pages/admin/AdminFormSubmissions"));

// Admin Impersonation Pages
const AdminCustomerOverview = lazy(() => import("./pages/admin/customer/AdminCustomerOverview"));
const AdminCustomerOrders = lazy(() => import("./pages/admin/customer/AdminCustomerOrders"));
const AdminCustomerWishlist = lazy(() => import("./pages/admin/customer/AdminCustomerWishlist"));
const AdminCustomerFollowed = lazy(() => import("./pages/admin/customer/AdminCustomerFollowed"));
const AdminCustomerSettings = lazy(() => import("./pages/admin/customer/AdminCustomerSettings"));

const SiteColorApplier = () => {
  useApplySiteColors();
  return null;
};

// Optimized QueryClient with sensible caching to avoid constant refetches
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutes data freshness
      gcTime: 1000 * 60 * 15,   // 15 minutes cache memory
      refetchOnWindowFocus: false, // Prevents sudden network spikes on tab focus
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <CurrencyProvider>
              <LanguageProvider>
                <SiteColorApplier />
                <ScrollToTop />
                <MobileBottomNav />
                <FacebookPixel />
                <GoogleAnalytics />
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/product/:slug" element={<ProductPage />} />
                    <Route path="/brand/:id" element={<BrandPage />} />
                    <Route path="/brands" element={<AllBrands />} />
                    <Route path="/category/:slug" element={<CategoryPage />} />
                    <Route path="/categories" element={<AllCategories />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/generic/:name" element={<GenericPage />} />
                    <Route path="/vendors" element={<AllVendors />} />
                    <Route path="/store/:vendorId" element={<VendorStorePage />} />
                    <Route path="/section/:sectionId" element={<SectionPage />} />
                    <Route path="/menu/:itemId" element={<LeftMenuItemPage />} />
                    <Route path="/qmall" element={<QmallProducts />} />
                    <Route path="/pre-orders" element={<PreOrderProducts />} />
                    <Route path="/flash-deals" element={<FlashDealsPage />} />
                    <Route path="/page/:slug" element={<StaticPage />} />
                    <Route path="/careers" element={<CareersApply />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/install" element={<InstallApp />} />
                    <Route path="/prescription" element={<PrescriptionUpload />} />
                    <Route path="/lab-test" element={<LabTest />} />
                    <Route path="/lab-test/centers" element={<LabTestCentersPage />} />
                    <Route path="/lab-test/:testId/centers" element={<LabTestCentersPage />} />
                    <Route path="/lab-center/:id" element={<LabCenterPage />} />
                    <Route path="/cart/:token" element={<ExternalCart />} />
                    <Route path="/specialist-doctors" element={<SpecialistDoctors />} />
                    <Route path="/blood-bank" element={<BloodBank />} />
                    <Route path="/emergency" element={<Emergency />} />
                    <Route path="/pay/:token" element={<PayLink />} />
                    <Route path="/prayer-times" element={<PrayerTimes />} />
                    <Route path="/payment/callback" element={<ProtectedRoute><PaymentCallback /></ProtectedRoute>} />
                    <Route path="/bkash/callback" element={<ProtectedRoute><BkashCallback /></ProtectedRoute>} />
                    <Route path="/order-confirmation" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/dashboard/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                    <Route path="/dashboard/followed" element={<ProtectedRoute><Followed /></ProtectedRoute>} />
                    <Route path="/dashboard/vouchers" element={<ProtectedRoute><Vouchers /></ProtectedRoute>} />
                    <Route path="/dashboard/settings" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                    <Route path="/dashboard/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                    <Route path="/dashboard/orders/:status" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                    <Route path="/dashboard/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
                    <Route path="/dashboard/support" element={<ProtectedRoute><SupportTickets /></ProtectedRoute>} />
                    <Route path="/dashboard/credits" element={<ProtectedRoute><MyCredits /></ProtectedRoute>} />
                    <Route path="/dashboard/lab-tests" element={<ProtectedRoute><MyLabTests /></ProtectedRoute>} />
                    <Route path="/vendor/apply" element={<ProtectedRoute><VendorApply /></ProtectedRoute>} />
                    <Route path="/vendor" element={<ProtectedRoute vendorOnly><VendorLayout /></ProtectedRoute>}>
                      <Route index element={<VendorOverview />} />
                      <Route path="products" element={<VendorProducts />} />
                      <Route path="orders" element={<VendorOrders />} />
                      <Route path="settings" element={<VendorSettings />} />
                      <Route path="grab-product" element={<VendorProductGrabber />} />
                      <Route path="brands" element={<VendorBrands />} />
                      <Route path="activity-log" element={<VendorActivityLog />} />
                      <Route path="pre-orders" element={<VendorPreOrders />} />
                      <Route path="reviews" element={<VendorReviews />} />
                      <Route path="messages" element={<VendorMessages />} />
                      <Route path="payment-methods" element={<VendorPaymentMethods />} />
                      <Route path="payouts" element={<VendorPayouts />} />
                      <Route path="invoices" element={<VendorInvoices />} />
                      <Route path="pos" element={<VendorPosRegister />} />
                      <Route path="pos/sessions" element={<VendorPosSessions />} />
                      <Route path="pos/returns" element={<VendorSalesReturns />} />
                      <Route path="pos/transfers" element={<VendorStockTransfers />} />
                      <Route path="pos/reports" element={<VendorPosReports />} />
                      <Route path="pos/commissions" element={<VendorStaffCommissions />} />
                    </Route>
                    <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
                      <Route index element={<AdminOverview />} />
                      <Route path="categories" element={<AdminCategories />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="vendors" element={<AdminVendors />} />
                      <Route path="grab-product" element={<ProductGrabber />} />
                      <Route path="currencies" element={<AdminCurrencies />} />
                      <Route path="brands" element={<AdminBrands />} />
                      <Route path="activity-log" element={<AdminActivityLog />} />
                      <Route path="site-settings" element={<AdminSiteSettings />} />
                      <Route path="delivery-zones" element={<AdminDeliveryZones />} />
                      <Route path="pre-orders" element={<AdminPreOrders />} />
                      <Route path="boost" element={<AdminBoostSettings />} />
                      <Route path="hero-slides" element={<AdminHeroSlides />} />
                      <Route path="support-tickets" element={<AdminSupportTickets />} />
                      <Route path="marketing" element={<AdminMarketingSettings />} />
                      <Route path="coupons" element={<AdminCoupons />} />
                      <Route path="incomplete-orders" element={<AdminIncompleteOrders />} />
                      <Route path="homepage-sections" element={<AdminHomepageSections />} />
                      <Route path="homepage-sections/:sectionId/products" element={<AdminSectionProducts />} />
                      <Route path="left-menu" element={<AdminLeftMenuItems />} />
                      <Route path="left-menu/:itemId/products" element={<AdminLeftMenuProducts />} />
                      <Route path="section-banners" element={<AdminSectionBanners />} />
                      <Route path="flash-deals" element={<AdminFlashDeals />} />
                      <Route path="static-pages" element={<AdminStaticPages />} />
                      <Route path="messages" element={<AdminMessages />} />
                      <Route path="payouts" element={<AdminPayouts />} />
                      <Route path="refunds" element={<AdminRefunds />} />
                      <Route path="customer-credits" element={<AdminCustomerCredits />} />
                      <Route path="careers" element={<AdminCareers />} />
                      <Route path="staff" element={<AdminStaff />} />
                      <Route path="invoices" element={<AdminInvoices />} />
                      <Route path="pos" element={<AdminPosRegister />} />
                      <Route path="pos/sessions" element={<AdminPosSessions />} />
                      <Route path="pos/returns" element={<AdminSalesReturns />} />
                      <Route path="pos/transfers" element={<AdminStockTransfers />} />
                      <Route path="pos/reports" element={<AdminPosReports />} />
                      <Route path="pos/commissions" element={<AdminStaffCommissions />} />
                      <Route path="api-keys" element={<AdminApiKeys />} />
                      <Route path="api-docs" element={<AdminApiDocs />} />
                      <Route path="investments" element={<AdminInvestments />} />
                      <Route path="expenses" element={<AdminExpenses />} />
                      <Route path="cash-book" element={<AdminCashBook />} />
                      <Route path="sms-settings" element={<AdminSmsSettings />} />
                      <Route path="purchase-invoices" element={<AdminPurchaseInvoices />} />
                      <Route path="capital" element={<AdminCapital />} />
                      <Route path="money-tracking" element={<AdminMoneyTracking />} />
                      <Route path="prescriptions" element={<AdminPrescriptions />} />
                      <Route path="lab-tests" element={<AdminLabTests />} />
                      <Route path="lab-centers" element={<AdminLabCenters />} />
                      <Route path="lab-bookings" element={<AdminLabTestBookings />} />
                      <Route path="blood-requests" element={<AdminBloodRequests />} />
                      <Route path="doctors" element={<AdminDoctors />} />
                      <Route path="doctor-categories" element={<AdminDoctorCategories />} />
                      <Route path="emergency-contacts" element={<AdminEmergencyContacts />} />
                      <Route path="payment-links" element={<AdminPaymentLinks />} />
                      <Route path="link-payments" element={<AdminPaymentLinkPayments />} />
                      <Route path="form-submissions" element={<AdminFormSubmissions />} />
                    </Route>
                    {/* Admin impersonating vendor */}
                    <Route path="/admin/vendor-dashboard/:vendorId" element={<ProtectedRoute adminOnly><AdminVendorLayout /></ProtectedRoute>}>
                      <Route index element={<VendorOverview />} />
                      <Route path="products" element={<VendorProducts />} />
                      <Route path="orders" element={<VendorOrders />} />
                      <Route path="settings" element={<VendorSettings />} />
                      <Route path="grab-product" element={<VendorProductGrabber />} />
                      <Route path="brands" element={<VendorBrands />} />
                      <Route path="activity-log" element={<VendorActivityLog />} />
                      <Route path="pre-orders" element={<VendorPreOrders />} />
                      <Route path="reviews" element={<VendorReviews />} />
                      <Route path="messages" element={<VendorMessages />} />
                      <Route path="payment-methods" element={<VendorPaymentMethods />} />
                      <Route path="payouts" element={<VendorPayouts />} />
                    </Route>
                    {/* Admin impersonating customer */}
                    <Route path="/admin/customer-dashboard/:userId" element={<ProtectedRoute adminOnly><AdminCustomerLayout /></ProtectedRoute>}>
                      <Route index element={<AdminCustomerOverview />} />
                      <Route path="orders" element={<AdminCustomerOrders />} />
                      <Route path="orders/:status" element={<AdminCustomerOrders />} />
                      <Route path="wishlist" element={<AdminCustomerWishlist />} />
                      <Route path="followed" element={<AdminCustomerFollowed />} />
                      <Route path="settings" element={<AdminCustomerSettings />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </LanguageProvider>
            </CurrencyProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
