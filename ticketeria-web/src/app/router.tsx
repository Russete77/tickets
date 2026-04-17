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
const AdminAffiliates = lazy(() => import('@features/admin/AdminAffiliates'));

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

  // ── Protected user routes ──
  { path: '/checkout', element: wrap(<ProtectedRoute><CheckoutFlow /></ProtectedRoute>) },
  { path: '/tickets',  element: wrap(<ProtectedRoute><MyTicketsPage /></ProtectedRoute>) },
  { path: '/profile',  element: wrap(<ProtectedRoute><ProfilePage /></ProtectedRoute>) },

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
  { path: '/admin/affiliates', element: adminWrap(<AdminAffiliates />) },

  // ── Catch-all ──
  { path: '*', element: <Navigate to="/" replace /> },
]);

export const AppRouter: React.FC = () => (
  <RouterProvider
    router={router}
    future={{ v7_startTransition: true }}
  />
);
