import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';

import ClientHome from './pages/ClientHome';
import ProviderHome from './pages/ProviderHome';
import NewServiceRequest from './pages/NewServiceRequest';
import ClientRequestDetail from './pages/ClientRequestDetail';
import ClientOnboarding from './pages/ClientOnboarding';
import ClientWelcome from './pages/ClientWelcome';
import ProviderWelcome from './pages/ProviderWelcome';
import CityServices from './pages/CityServices';
import ProviderOnboarding from './pages/ProviderOnboarding';
import ClientOrders from './pages/ClientOrders';
import ClientConversations from './pages/ClientConversations';
import DiagnosticsPage from './pages/DiagnosticsPage';
import AdminUsers from './pages/AdminUsers';
import AdminLogin from './pages/AdminLogin';
import AdminSupportDesk from './pages/AdminSupportDesk';
import AdminTicketDetail from './pages/AdminTicketDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminAtRisk from './pages/AdminAtRisk';
import AdminRoute from './components/AdminRoute';
import ProvidersMap from './pages/ProvidersMap';
import ProviderRequestsMap from './pages/ProviderRequestsMap';
import ProviderConversations from './pages/ProviderConversations';
import ProviderServices from './pages/ProviderServices';
import ChatPage from './pages/ChatPage';
import PasswordSetup from './pages/PasswordSetup';
import Login from './pages/Login';
import SupportCenter from './pages/SupportCenter';
import SupportTicketDetail from './pages/SupportTicketDetail';
import ClientMenu from './pages/ClientMenu';
import ClientProfile from './pages/ClientProfile';
import ClientAddress from './pages/ClientAddress';
import ClientEditAddress from './pages/ClientEditAddress';
import ClientHelp from './pages/ClientHelp';
import ClientFAQ from './pages/ClientFAQ';
import ClientTerms from './pages/ClientTerms';
import ClientPrivacy from './pages/ClientPrivacy';
import ClientProviderProfile from './pages/ClientProviderProfile';
import ClientAbout from './pages/ClientAbout';
import ClientPayments from './pages/ClientPayments';
import ClientNotifications from './pages/ClientNotifications';
import ClientProposals from './pages/ClientProposals';
import ClientConfirmProvider from './pages/ClientConfirmProvider';
import ClientOrderProgress from './pages/ClientOrderProgress';
import ClientOrderRating from './pages/ClientOrderRating';
import ClientEditRequest from './pages/ClientEditRequest';
import ProviderRequestDetail from './pages/ProviderRequestDetail';
import ProviderOrderProgress from './pages/ProviderOrderProgress';
import ProviderEarnings from './pages/ProviderEarnings';
import ProviderMenu from './pages/ProviderMenu';
import ProviderProfile from './pages/ProviderProfile';
import ProviderPayments from './pages/ProviderPayments';
import ProviderOrders from './pages/ProviderOrders';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors (app is public: do not force login on guests)
  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/client" element={<ClientHome />} />
      <Route path="/provider" element={<RequireAuth role="provider"><ProviderHome /></RequireAuth>} />
      <Route path="/client/welcome" element={<ClientWelcome />} />
      <Route path="/client/onboarding" element={<ClientOnboarding />} />
      <Route path="/provider/welcome" element={<ProviderWelcome />} />
      <Route path="/provider/onboarding" element={<ProviderOnboarding />} />
      <Route path="/client/new-request" element={<NewServiceRequest />} />
      <Route path="/client/request/:requestId" element={<RequireClientAuth><ClientRequestDetail /></RequireClientAuth>} />
      <Route path="/client/request/:requestId/proposals" element={<RequireClientAuth><ClientProposals /></RequireClientAuth>} />
      <Route path="/client/request/:requestId/confirm/:interestId" element={<RequireClientAuth><ClientConfirmProvider /></RequireClientAuth>} />
      <Route path="/client/request/:requestId/progress" element={<RequireClientAuth><ClientOrderProgress /></RequireClientAuth>} />
      <Route path="/client/request/:requestId/rate" element={<RequireClientAuth><ClientOrderRating /></RequireClientAuth>} />
      <Route path="/client/request/:requestId/edit" element={<RequireClientAuth><ClientEditRequest /></RequireClientAuth>} />
      <Route path="/client/services" element={<CityServices />} />
      <Route path="/client/orders" element={<RequireClientAuth><ClientOrders /></RequireClientAuth>} />
      <Route path="/client/conversations" element={<RequireClientAuth><ClientConversations /></RequireClientAuth>} />
      <Route path="/client/support" element={<RequireClientAuth><SupportCenter audience="client" /></RequireClientAuth>} />
      <Route path="/client/support/:ticketId" element={<RequireClientAuth><SupportTicketDetail audience="client" /></RequireClientAuth>} />
      <Route path="/client/menu" element={<RequireClientAuth><ClientMenu /></RequireClientAuth>} />
      <Route path="/client/profile" element={<RequireClientAuth><ClientProfile /></RequireClientAuth>} />
      <Route path="/client/address" element={<RequireClientAuth><ClientAddress /></RequireClientAuth>} />
      <Route path="/client/edit-address" element={<RequireClientAuth><ClientEditAddress /></RequireClientAuth>} />
      <Route path="/client/help" element={<RequireClientAuth><ClientHelp /></RequireClientAuth>} />
      <Route path="/client/faq" element={<RequireClientAuth><ClientFAQ /></RequireClientAuth>} />
      <Route path="/client/terms" element={<RequireClientAuth><ClientTerms /></RequireClientAuth>} />
      <Route path="/client/privacy" element={<RequireClientAuth><ClientPrivacy /></RequireClientAuth>} />
      <Route path="/client/provider/:providerId" element={<RequireClientAuth><ClientProviderProfile /></RequireClientAuth>} />
      <Route path="/client/about" element={<RequireClientAuth><ClientAbout /></RequireClientAuth>} />
      <Route path="/client/payments" element={<RequireClientAuth><ClientPayments /></RequireClientAuth>} />
      <Route path="/client/notifications" element={<RequireClientAuth><ClientNotifications /></RequireClientAuth>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<AdminRoute />}>
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/support" element={<AdminSupportDesk />} />
        <Route path="/admin/support/:ticketId" element={<AdminTicketDetail />} />
        <Route path="/admin/request/:requestId" element={<ClientRequestDetail viewerMode="admin" />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/at-risk" element={<AdminAtRisk />} />
      </Route>
      <Route path="/client/map" element={<RequireClientAuth><ProvidersMap /></RequireClientAuth>} />
      <Route path="/provider/map" element={<RequireAuth role="provider"><ProviderRequestsMap /></RequireAuth>} />
      <Route path="/provider/request/:requestId" element={<RequireAuth role="provider"><ProviderRequestDetail /></RequireAuth>} />
      <Route path="/provider/request/:requestId/progress" element={<RequireAuth role="provider"><ProviderOrderProgress /></RequireAuth>} />
      <Route path="/provider/earnings" element={<RequireAuth role="provider"><ProviderEarnings /></RequireAuth>} />
      <Route path="/provider/conversations" element={<RequireAuth role="provider"><ProviderConversations /></RequireAuth>} />
      <Route path="/provider/services" element={<RequireAuth role="provider"><ProviderServices /></RequireAuth>} />
      <Route path="/provider/support" element={<RequireAuth role="provider"><SupportCenter audience="provider" /></RequireAuth>} />
      <Route path="/provider/support/:ticketId" element={<RequireAuth role="provider"><SupportTicketDetail audience="provider" /></RequireAuth>} />
      <Route path="/provider/menu" element={<RequireAuth role="provider"><ProviderMenu /></RequireAuth>} />
      <Route path="/provider/profile" element={<RequireAuth role="provider"><ProviderProfile /></RequireAuth>} />
      <Route path="/provider/payments" element={<RequireAuth role="provider"><ProviderPayments /></RequireAuth>} />
      <Route path="/provider/orders" element={<RequireAuth role="provider"><ProviderOrders /></RequireAuth>} />
      <Route path="/provider/notifications" element={<RequireAuth role="provider"><ClientNotifications /></RequireAuth>} />
      <Route path="/chat/:conversationId" element={<RequireAuth><ChatPage /></RequireAuth>} />
      <Route path="/setup-password" element={<PasswordSetup />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

const RequireClientAuth = ({ children }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?role=client" state={{ from: location }} replace />;
  }

  return children;
};

const RequireAuth = ({ children, role = 'client' }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?role=${role}`} state={{ from: location }} replace />;
  }

  return children;
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
