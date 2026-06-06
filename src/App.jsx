import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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
import ProviderRequestDetail from './pages/ProviderRequestDetail';
import ProviderOrderProgress from './pages/ProviderOrderProgress';
import ProviderEarnings from './pages/ProviderEarnings';
import ProviderMenu from './pages/ProviderMenu';
import ProviderProfile from './pages/ProviderProfile';
import ProviderPayments from './pages/ProviderPayments';

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
      <Route path="/provider" element={<ProviderHome />} />
      <Route path="/client/welcome" element={<ClientWelcome />} />
      <Route path="/client/onboarding" element={<ClientOnboarding />} />
      <Route path="/provider/welcome" element={<ProviderWelcome />} />
      <Route path="/provider/onboarding" element={<ProviderOnboarding />} />
      <Route path="/client/new-request" element={<NewServiceRequest />} />
      <Route path="/client/request/:requestId" element={<ClientRequestDetail />} />
      <Route path="/client/request/:requestId/proposals" element={<ClientProposals />} />
      <Route path="/client/request/:requestId/confirm/:interestId" element={<ClientConfirmProvider />} />
      <Route path="/client/request/:requestId/progress" element={<ClientOrderProgress />} />
      <Route path="/client/request/:requestId/rate" element={<ClientOrderRating />} />
      <Route path="/client/services" element={<CityServices />} />
      <Route path="/client/orders" element={<ClientOrders />} />
      <Route path="/client/conversations" element={<ClientConversations />} />
      <Route path="/client/support" element={<SupportCenter audience="client" />} />
      <Route path="/client/support/:ticketId" element={<SupportTicketDetail audience="client" />} />
      <Route path="/client/menu" element={<ClientMenu />} />
      <Route path="/client/profile" element={<ClientProfile />} />
      <Route path="/client/address" element={<ClientAddress />} />
      <Route path="/client/edit-address" element={<ClientEditAddress />} />
      <Route path="/client/help" element={<ClientHelp />} />
      <Route path="/client/faq" element={<ClientFAQ />} />
      <Route path="/client/terms" element={<ClientTerms />} />
      <Route path="/client/privacy" element={<ClientPrivacy />} />
      <Route path="/client/provider/:providerId" element={<ClientProviderProfile />} />
      <Route path="/client/about" element={<ClientAbout />} />
      <Route path="/client/payments" element={<ClientPayments />} />
      <Route path="/client/notifications" element={<ClientNotifications />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<AdminRoute />}>
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/support" element={<AdminSupportDesk />} />
        <Route path="/admin/support/:ticketId" element={<AdminTicketDetail />} />
        <Route path="/admin/request/:requestId" element={<ClientRequestDetail viewerMode="admin" />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>
      <Route path="/client/map" element={<ProvidersMap />} />
      <Route path="/provider/map" element={<ProviderRequestsMap />} />
      <Route path="/provider/request/:requestId" element={<ProviderRequestDetail />} />
      <Route path="/provider/request/:requestId/progress" element={<ProviderOrderProgress />} />
      <Route path="/provider/earnings" element={<ProviderEarnings />} />
      <Route path="/provider/conversations" element={<ProviderConversations />} />
      <Route path="/provider/services" element={<ProviderServices />} />
      <Route path="/provider/support" element={<SupportCenter audience="provider" />} />
      <Route path="/provider/support/:ticketId" element={<SupportTicketDetail audience="provider" />} />
      <Route path="/provider/menu" element={<ProviderMenu />} />
      <Route path="/provider/profile" element={<ProviderProfile />} />
      <Route path="/provider/payments" element={<ProviderPayments />} />
      <Route path="/provider/notifications" element={<ClientNotifications />} />
      <Route path="/chat/:conversationId" element={<ChatPage />} />
      <Route path="/setup-password" element={<PasswordSetup />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
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
