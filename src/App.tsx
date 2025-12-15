import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { HelmetProvider } from "react-helmet-async";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Plans from "./pages/Plans";
import ReportNotice from "./pages/ReportNotice";
import CaseQueue from "./pages/CaseQueue";
import MyCaseload from "./pages/MyCaseload";
import MyCases from "./pages/MyCases";
import ClientCaseDetail from "./pages/ClientCaseDetail";
import AgentCaseDetail from "./pages/AgentCaseDetail";
import Analytics from "./pages/Analytics";
import Partners from "./pages/Partners";
import Affiliates from "./pages/Affiliates";
import AffiliatePortal from "./pages/AffiliatePortal";
import AffiliateAdmin from "./pages/AffiliateAdmin";
import PartnerProgram from "./pages/PartnerProgram";
import BulkEnroll from "./pages/BulkEnroll";
import MyClients from "./pages/MyClients";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle referral tracking inside BrowserRouter
const ReferralTracker = ({ children }: { children: React.ReactNode }) => {
  useReferralTracking();
  return <>{children}</>;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ReferralTracker>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/report" element={<ReportNotice />} />
                <Route path="/queue" element={<CaseQueue />} />
                <Route path="/caseload" element={<MyCaseload />} />
                <Route path="/agent/cases/:caseId" element={<AgentCaseDetail />} />
                <Route path="/my-cases" element={<MyCases />} />
                <Route path="/my-cases/:caseId" element={<ClientCaseDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/affiliates" element={<Affiliates />} />
                <Route path="/affiliate-portal" element={<AffiliatePortal />} />
                <Route path="/admin/affiliates" element={<AffiliateAdmin />} />
                <Route path="/partner-program" element={<PartnerProgram />} />
                <Route path="/bulk-enroll" element={<BulkEnroll />} />
                <Route path="/my-clients" element={<MyClients />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ReferralTracker>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
