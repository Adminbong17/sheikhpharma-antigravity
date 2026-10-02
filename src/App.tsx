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
import AdminLayout from "@/components/AdminLayout";
import AdminVendorLayout from "@/components/AdminVendorLayout";
import AdminCustomerLayout from "@/components/AdminCustomerLayout";
import VendorLayout from "@/components/VendorLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CategoryPage from "./pages/CategoryPage";
import AllCategories from "./pages/AllCategories";
import SearchResults from "./pages/SearchResults";
import GenericPage from "./pages/GenericPage";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminVendors from "./pages/admin/AdminVendors";

import Dashboard from "./pages/Dashboard";
import Wishlist from "./pages/dashboard/Wishlist";
import MyOrders from "./pages/dashboard/MyOrders";
import Inbox from "./pages/dashboard/Inbox";
import Followed from "./pages/dashboard/Followed";
import Vouchers from "./pages/dashboard/Vouchers";
import ProfileSettings from "./pages/dashboard/ProfileSettings";
import VendorApply from "./pages/VendorApply";
import VendorOverview from "./pages/vendor/VendorOverview";
import VendorProducts from "./pages/vendor/VendorProducts";
import VendorOrders from "./pages/vendor/VendorOrders";
import VendorSettings from "./pages/vendor/VendorSettings";
import VendorProductGrabber from "./pages/vendor/VendorProductGrabber";
import VendorInvoices from "./pages/vendor/VendorInvoices";
import ProductGrabber from "./pages/admin/ProductGrabber";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCurrencies from "./pages/admin/AdminCurrencies";
import AdminBrands from "./pages/admin/AdminBrands";
import ProductPage from "./pages/ProductPage";
import BrandPage from "./pages/BrandPage";
import AllBrands from "./pages/AllBrands";
import VendorBrands from "./pages/vendor/VendorBrands";
import VendorActivityLog from "./pages/vendor/VendorActivityLog";
import VendorPaymentMethods from "./pages/vendor/VendorPaymentMethods";
import VendorPayouts from "./pages/vendor/VendorPayouts";
import AdminActivityLog from "./pages/admin/AdminActivityLog";
import AdminSiteSettings from "./pages/admin/AdminSiteSettings";
import AdminPreOrders from "./pages/admin/AdminPreOrders";
import AdminDeliveryZones from "./pages/admin/AdminDeliveryZones";
import VendorPreOrders from "./pages/vendor/VendorPreOrders";
import NotFound from "./pages/NotFound";
import AdminBoostSettings from "./pages/admin/AdminBoostSettings";
import AdminHeroSlides from "./pages/admin/AdminHeroSlides";
import VendorReviews from "./pages/vendor/VendorReviews";
import VendorMessages from "./pages/vendor/VendorMessages";
import VendorStorePage from "./pages/VendorStorePage";
import AllVendors from "./pages/AllVendors";
import Checkout from "./pages/Checkout";
import PaymentCallback from "./pages/PaymentCallback";
import BkashCallback from "./pages/BkashCallback";
import OrderConfirmation from "./pages/OrderConfirmation";
import AdminCustomerOverview from "./pages/admin/customer/AdminCustomerOverview";
import AdminCustomerOrders from "./pages/admin/customer/AdminCustomerOrders";
import AdminCustomerWishlist from "./pages/admin/customer/AdminCustomerWishlist";
import AdminCustomerFollowed from "./pages/admin/customer/AdminCustomerFollowed";
import AdminCustomerSettings from "./pages/admin/customer/AdminCustomerSettings";
import SupportTickets from "./pages/dashboard/SupportTickets";
import AdminSupportTickets from "./pages/admin/AdminSupportTickets";
import AdminMarketingSettings from "./pages/admin/AdminMarketingSettings";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminIncompleteOrders from "./pages/admin/AdminIncompleteOrders";
import AdminHomepageSections from "./pages/admin/AdminHomepageSections";
import AdminSectionProducts from "./pages/admin/AdminSectionProducts";
import AdminLeftMenuItems from "./pages/admin/AdminLeftMenuItems";
import AdminLeftMenuProducts from "./pages/admin/AdminLeftMenuProducts";
import SectionPage from "./pages/SectionPage";
import LeftMenuItemPage from "./pages/LeftMenuItemPage";
import QmallProducts from "./pages/QmallProducts";
import PreOrderProducts from "./pages/PreOrderProducts";
import StaticPage from "./pages/StaticPage";
import AdminStaticPages from "./pages/admin/AdminStaticPages";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminRefunds from "./pages/admin/AdminRefunds";
import AdminCustomerCredits from "./pages/admin/AdminCustomerCredits";
import MyCredits from "./pages/dashboard/MyCredits";
import MyLabTests from "./pages/dashboard/MyLabTests";
import CareersApply from "./pages/CareersApply";
import AdminCareers from "./pages/admin/AdminCareers";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminPosRegister from "./pages/admin/AdminPosRegister";
import VendorPosRegister from "./pages/vendor/VendorPosRegister";
import AdminPosSessions from "./pages/admin/AdminPosSessions";
import AdminSalesReturns from "./pages/admin/AdminSalesReturns";
import AdminStockTransfers from "./pages/admin/AdminStockTransfers";
import AdminPosReports from "./pages/admin/AdminPosReports";
import AdminStaffCommissions from "./pages/admin/AdminStaffCommissions";
import {
  VendorPosSessions, VendorSalesReturns, VendorStockTransfers,
  VendorPosReports, VendorStaffCommissions,
} from "./pages/vendor/VendorPosWrappers";
import AdminApiKeys from "./pages/admin/AdminApiKeys";
import AdminApiDocs from "./pages/admin/AdminApiDocs";
import AdminInvestments from "./pages/admin/AdminInvestments";
import AdminExpenses from "./pages/admin/AdminExpenses";
import AdminCashBook from "./pages/admin/AdminCashBook";
import AdminSmsSettings from "./pages/admin/AdminSmsSettings";
import AdminPurchaseInvoices from "./pages/admin/AdminPurchaseInvoices";
import AdminCapital from "./pages/admin/AdminCapital";
import AdminMoneyTracking from "./pages/admin/AdminMoneyTracking";
import AdminSectionBanners from "./pages/admin/AdminSectionBanners";
import AdminFlashDeals from "./pages/admin/AdminFlashDeals";
import FlashDealsPage from "./pages/FlashDealsPage";
import FacebookPixel from "@/components/FacebookPixel";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { useApplySiteColors } from "@/hooks/useApplySiteColors";
import ScrollToTop from "@/components/ScrollToTop";
import MobileBottomNav from "@/components/MobileBottomNav";
import InstallApp from "./pages/InstallApp";
import ExternalCart from "./pages/ExternalCart";
import PrescriptionUpload from "./pages/PrescriptionUpload";
import AdminPrescriptions from "./pages/admin/AdminPrescriptions";
import AdminLabTests from "./pages/admin/AdminLabTests";
import AdminLabCenters from "./pages/admin/AdminLabCenters";
import AdminLabTestBookings from "./pages/admin/AdminLabTestBookings";
import LabTest from "./pages/LabTest";
import LabCenterPage from "./pages/LabCenterPage";
import LabTestCentersPage from "./pages/LabTestCentersPage";
import SpecialistDoctors from "./pages/SpecialistDoctors";
import BloodBank from "./pages/BloodBank";
import AdminBloodRequests from "./pages/admin/AdminBloodRequests";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminDoctorCategories from "./pages/admin/AdminDoctorCategories";
import AdminEmergencyContacts from "./pages/admin/AdminEmergencyContacts";
import Emergency from "./pages/Emergency";
import PayLink from "./pages/PayLink";
import AdminPaymentLinks from "./pages/admin/AdminPaymentLinks";
import AdminPaymentLinkPayments from "./pages/admin/AdminPaymentLinkPayments";
import AdminFormSubmissions from "./pages/admin/AdminFormSubmissions";
import PrayerTimes from "./pages/PrayerTimes";

const SiteColorApplier = () => { useApplySiteColors(); return null; };

const queryClient = new QueryClient();

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
              {/* Admin impersonating vendor — full vendor access */}
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
              {/* Admin impersonating customer — full customer dashboard access */}
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
            </LanguageProvider>
            </CurrencyProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
