import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useAuthStore } from '@shared/stores/authStore';

const HomePage        = lazy(() => import('@features/home/HomePage'));
const EventPage       = lazy(() => import('@features/event/EventPage'));
const SearchPage      = lazy(() => import('@features/search/SearchPage'));
const LoginPage            = lazy(() => import('@features/auth/LoginPage'));
const RegisterPage         = lazy(() => import('@features/auth/RegisterPage'));
const ForgotPasswordPage   = lazy(() => import('@features/auth/ForgotPasswordPage'));
const ResetPasswordPage    = lazy(() => import('@features/auth/ResetPasswordPage'));
const CheckoutFlow    = lazy(() => import('@features/checkout/CheckoutFlow'));
const MyTicketsPage   = lazy(() => import('@features/tickets/MyTicketsPage'));
const ProfilePage     = lazy(() => import('@features/profile/ProfilePage'));
const CheckinPage     = lazy(() => import('@features/checkin/CheckinPage'));

// Admin pages
const AdminDashboard = lazy(() => import('@features/admin/AdminDashboard'));
const AdminEvents    = lazy(() => import('@features/admin/AdminEvents'));
const AdminEventCreate = lazy(() => import('@features/admin/AdminEventCreate'));
const AdminOrders    = lazy(() => import('@features/admin/AdminOrders'));
const AdminUsers     = lazy(() => import('@features/admin/AdminUsers'));
const AdminFinance   = lazy(() => import('@features/admin/AdminFinance'));
const AdminReports   = lazy(() => import('@features/admin/AdminReports'));
const AdminAffiliates  = lazy(() => import('@features/admin/AdminAffiliates'));
const AdminGuestLists  = lazy(() => import('@features/admin/AdminGuestLists'));
const AdminPromoters   = lazy(() => import('@features/admin/AdminPromoters'));
const AdminCheckinDashboard = lazy(() => import('@features/admin/AdminCheckinDashboard'));
const AdminStaff      = lazy(() => import('@features/admin/AdminStaff'));
const AdminAreas      = lazy(() => import('@features/admin/AdminAreas'));
const AdminCourtesies = lazy(() => import('@features/admin/AdminCourtesies'));
const AdminWaitlist   = lazy(() => import('@features/admin/AdminWaitlist'));
const AdminBoxOffice  = lazy(() => import('@features/admin/AdminBoxOffice'));
const AdminPriceRules = lazy(() => import('@features/admin/AdminPriceRules'));

// Auditoria CTO 2026-05 — telas novas
const AdminOrganizationPage = lazy(() => import('@features/admin/organization/AdminOrganizationPage'));
const AdminBrandingPage = lazy(() => import('@features/admin/branding/AdminBrandingPage'));
const AdminApiKeysPage = lazy(() => import('@features/admin/api-keys/AdminApiKeysPage'));
const AdminWebhooksPage = lazy(() => import('@features/admin/webhooks/AdminWebhooksPage'));
const AdminLedgerPage = lazy(() => import('@features/admin/ledger/AdminLedgerPage'));

// Sub-projeto 1 — Cashless admin CRUDs (2026-05)
const AdminCashlessHubPage = lazy(() => import('@features/admin/cashless/AdminCashlessHubPage'));
const AdminCashlessPosPage = lazy(() => import('@features/admin/cashless/AdminPosPage'));
const AdminCashlessCategoriesPage = lazy(() => import('@features/admin/cashless/AdminCategoriesPage'));
const AdminCashlessProductsPage = lazy(() => import('@features/admin/cashless/AdminProductsPage'));
const AdminCashlessOperatorsPage = lazy(() => import('@features/admin/cashless/AdminOperatorsPage'));
const AdminCashlessStockPage = lazy(() => import('@features/admin/cashless/AdminStockOverviewPage'));
const AdminCashlessOrdersQueuePage = lazy(() => import('@features/admin/cashless/AdminOrdersQueuePage'));
const AdminVenueMapPage = lazy(() => import('@features/admin/venue-map/AdminVenueMapPage'));

// User pages
const WalletPage = lazy(() => import('@features/wallet/WalletPage'));
const OrderDetailsPage = lazy(() => import('@features/orders/OrderDetailsPage'));

// Promoter pages
const PromoterDashboardPage = lazy(() => import('@features/promoter/PromoterDashboardPage'));

// Public pages (no auth required)
const GuestRegistrationPage = lazy(() => import('@features/guest-registration/GuestRegistrationPage'));

const PageLoader: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <Spinner size="lg" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const wrap = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const adminWrap = (element: React.ReactNode) =>
  wrap(<ProtectedRoute>{element}</ProtectedRoute>);

const router = createBrowserRouter([
  // ── Public routes ──
  { path: '/',             element: wrap(<HomePage />) },
  { path: '/event/:slug',  element: wrap(<EventPage />) },
  { path: '/search',       element: wrap(<SearchPage />) },

  // ── Auth routes ──
  { path: '/login',    element: wrap(<GuestRoute><LoginPage /></GuestRoute>) },
  { path: '/register', element: wrap(<GuestRoute><RegisterPage /></GuestRoute>) },
  { path: '/forgot-password', element: wrap(<GuestRoute><ForgotPasswordPage /></GuestRoute>) },
  { path: '/reset-password/:userId/:token', element: wrap(<GuestRoute><ResetPasswordPage /></GuestRoute>) },

  // ── Public guest registration (no auth) ──
  { path: '/guest/:slug', element: wrap(<GuestRegistrationPage />) },

  // ── Protected user routes ──
  { path: '/checkout',          element: wrap(<ProtectedRoute><CheckoutFlow /></ProtectedRoute>) },
  { path: '/tickets',           element: wrap(<ProtectedRoute><MyTicketsPage /></ProtectedRoute>) },
  { path: '/orders/:orderId',   element: wrap(<ProtectedRoute><OrderDetailsPage /></ProtectedRoute>) },
  { path: '/profile',           element: wrap(<ProtectedRoute><ProfilePage /></ProtectedRoute>) },
  { path: '/wallet',            element: wrap(<ProtectedRoute><WalletPage /></ProtectedRoute>) },
  { path: '/promoter',          element: wrap(<ProtectedRoute><PromoterDashboardPage /></ProtectedRoute>) },

  // ── Check-in route (standalone, no layout) ──
  { path: '/checkin', element: wrap(<CheckinPage />) },

  // ── Admin routes ──
  { path: '/admin',           element: adminWrap(<AdminDashboard />) },
  { path: '/admin/events',    element: adminWrap(<AdminEvents />) },
  { path: '/admin/events/create', element: adminWrap(<AdminEventCreate />) },
  { path: '/admin/tickets',   element: adminWrap(<AdminOrders />) },
  { path: '/admin/users',     element: adminWrap(<AdminUsers />) },
  { path: '/admin/finance',   element: adminWrap(<AdminFinance />) },
  { path: '/admin/reports',   element: adminWrap(<AdminReports />) },
  { path: '/admin/affiliates',   element: adminWrap(<AdminAffiliates />) },
  { path: '/admin/guest-lists', element: adminWrap(<AdminGuestLists />) },
  { path: '/admin/promoters',   element: adminWrap(<AdminPromoters />) },
  { path: '/admin/checkin',     element: adminWrap(<AdminCheckinDashboard />) },
  { path: '/admin/staff',       element: adminWrap(<AdminStaff />) },
  { path: '/admin/areas',       element: adminWrap(<AdminAreas />) },
  { path: '/admin/courtesies',  element: adminWrap(<AdminCourtesies />) },
  { path: '/admin/waitlist',    element: adminWrap(<AdminWaitlist />) },
  { path: '/admin/box-office',  element: adminWrap(<AdminBoxOffice />) },
  { path: '/admin/price-rules', element: adminWrap(<AdminPriceRules />) },

  // Auditoria CTO 2026-05 — multi-tenant + branding + API + ledger
  { path: '/admin/orgs/:organizationId', element: adminWrap(<AdminOrganizationPage />) },
  { path: '/admin/orgs/:organizationId/branding', element: adminWrap(<AdminBrandingPage />) },
  { path: '/admin/orgs/:organizationId/api-keys', element: adminWrap(<AdminApiKeysPage />) },
  { path: '/admin/orgs/:organizationId/webhooks', element: adminWrap(<AdminWebhooksPage />) },
  { path: '/admin/orgs/:organizationId/ledger', element: adminWrap(<AdminLedgerPage />) },

  // Cashless admin (sub-projeto 1)
  { path: '/admin/orgs/:organizationId/events/:eventId/cashless', element: adminWrap(<AdminCashlessHubPage />) },
  { path: '/admin/orgs/:organizationId/events/:eventId/cashless/pos', element: adminWrap(<AdminCashlessPosPage />) },
  { path: '/admin/orgs/:organizationId/events/:eventId/cashless/categories', element: adminWrap(<AdminCashlessCategoriesPage />) },
  { path: '/admin/orgs/:organizationId/events/:eventId/cashless/products', element: adminWrap(<AdminCashlessProductsPage />) },
  { path: '/admin/orgs/:organizationId/events/:eventId/cashless/operators', element: adminWrap(<AdminCashlessOperatorsPage />) },
  { path: '/admin/orgs/:organizationId/events/:eventId/cashless/stock', element: adminWrap(<AdminCashlessStockPage />) },
  { path: '/admin/orgs/:organizationId/events/:eventId/cashless/orders', element: adminWrap(<AdminCashlessOrdersQueuePage />) },
  { path: '/admin/orgs/:organizationId/events/:eventId/venue-map', element: adminWrap(<AdminVenueMapPage />) },

  // ── Catch-all ──
  { path: '*', element: <Navigate to="/" replace /> },
]);

export const AppRouter: React.FC = () => (
  <RouterProvider
    router={router}
    future={{ v7_startTransition: true }}
  />
);
