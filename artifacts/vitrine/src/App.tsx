import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';

// User pages
import LoginPage from '@/pages/login';
import RegisterPage from '@/pages/register';
import DashboardPage from '@/pages/dashboard';
import CouponsPage from '@/pages/coupons';
import DepositPage from '@/pages/deposit';
import WithdrawalPage from '@/pages/withdrawal';
import PromotionsPage from '@/pages/promotions';
import ReferralPage from '@/pages/referral';
import TransactionsPage from '@/pages/transactions';
import NotificationsPage from '@/pages/notifications';
import ProfilePage from '@/pages/profile';
import ContestPage from '@/pages/contest';
import VipPurchasePage from '@/pages/vip-purchase';
import ChatPage from '@/pages/chat';
import NotFound from '@/pages/not-found';

// Admin pages
import AdminChatPage from '@/pages/admin/chat';
import AdminDashboardPage from '@/pages/admin/index';
import AdminUsersPage from '@/pages/admin/users';
import AdminDepositsPage from '@/pages/admin/deposits';
import AdminWithdrawalsPage from '@/pages/admin/withdrawals';
import AdminCouponsPage from '@/pages/admin/coupons';
import AdminNotificationsPage from '@/pages/admin/notifications';
import AdminPromotionsPage from '@/pages/admin/promotions';
import AdminContestPage from '@/pages/admin/contest';
import AdminConfigPage from '@/pages/admin/config';
import AdminDepositDetailPage from '@/pages/admin/deposit-detail';

// Configure API client
setBaseUrl(null);
setAuthTokenGetter(() => localStorage.getItem('muzan_auth_token'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Auth */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      {/* Referral deep-link: /inscription/:code pre-fills the referral code */}
      <Route path="/inscription/:code" component={RegisterPage} />

      {/* User routes */}
      <Route path="/">
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      </Route>
      <Route path="/coupons">
        <ProtectedRoute><CouponsPage /></ProtectedRoute>
      </Route>
      <Route path="/deposit">
        <ProtectedRoute><DepositPage /></ProtectedRoute>
      </Route>
      <Route path="/withdrawal">
        <ProtectedRoute><WithdrawalPage /></ProtectedRoute>
      </Route>
      <Route path="/promotions">
        <ProtectedRoute><PromotionsPage /></ProtectedRoute>
      </Route>
      <Route path="/referral">
        <ProtectedRoute><ReferralPage /></ProtectedRoute>
      </Route>
      <Route path="/transactions">
        <ProtectedRoute><TransactionsPage /></ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute><NotificationsPage /></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
      </Route>
      <Route path="/contest">
        <ProtectedRoute><ContestPage /></ProtectedRoute>
      </Route>
      <Route path="/vip-purchase">
        <ProtectedRoute><VipPurchasePage /></ProtectedRoute>
      </Route>
      <Route path="/chat">
        <ProtectedRoute><ChatPage /></ProtectedRoute>
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        <AdminRoute><AdminDashboardPage /></AdminRoute>
      </Route>
      <Route path="/admin/users">
        <AdminRoute><AdminUsersPage /></AdminRoute>
      </Route>
      <Route path="/admin/deposits">
        <AdminRoute><AdminDepositsPage /></AdminRoute>
      </Route>
      <Route path="/admin/withdrawals">
        <AdminRoute><AdminWithdrawalsPage /></AdminRoute>
      </Route>
      <Route path="/admin/coupons">
        <AdminRoute><AdminCouponsPage /></AdminRoute>
      </Route>
      <Route path="/admin/notifications">
        <AdminRoute><AdminNotificationsPage /></AdminRoute>
      </Route>
      <Route path="/admin/promotions">
        <AdminRoute><AdminPromotionsPage /></AdminRoute>
      </Route>
      <Route path="/admin/contest">
        <AdminRoute><AdminContestPage /></AdminRoute>
      </Route>
      <Route path="/admin/config">
        <AdminRoute><AdminConfigPage /></AdminRoute>
      </Route>
      <Route path="/admin/deposits/:id">
        <AdminRoute><AdminDepositDetailPage /></AdminRoute>
      </Route>
      <Route path="/admin/chat">
        <AdminRoute><AdminChatPage /></AdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function FcmSetup() {
  const { isAuthenticated } = useAuth();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FcmSetup />
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
            <PwaInstallBanner />
          </WouterRouter>
          <Toaster position="top-center" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
