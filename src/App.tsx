import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BrandingProvider } from "@/hooks/useBranding";
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
import ReferralNetwork from "./pages/ReferralNetwork";
import Activate from "./pages/Activate";
import Notifications from "./pages/Notifications";
import BrandingSettings from "./pages/BrandingSettings";
import Compliance from "./pages/Compliance";
import AuditRiskCheck from "./pages/AuditRiskCheck";
import RiskAssessments from "./pages/RiskAssessments";
import BatchRiskScan from "./pages/BatchRiskScan";
import ModelConfig from "./pages/ModelConfig";
import CorporateComplianceReview from "./pages/CorporateComplianceReview";
import PenaltyEraser from "./pages/PenaltyEraser";
import TranscriptDecoder from "./pages/TranscriptDecoder";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import AgentSettings from "./pages/AgentSettings";
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
          <BrandingProvider>
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
                  <Route path="/referral-network" element={<ReferralNetwork />} />
                  <Route path="/activate" element={<Activate />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/branding" element={<BrandingSettings />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/audit-risk" element={<AuditRiskCheck />} />
                  <Route path="/risk-assessments" element={<RiskAssessments />} />
                  <Route path="/batch-risk-scan" element={<BatchRiskScan />} />
                  <Route path="/admin/model-config" element={<ModelConfig />} />
                  <Route path="/corporate-compliance-review" element={<CorporateComplianceReview />} />
                  <Route path="/penalty-eraser" element={<PenaltyEraser />} />
                  <Route path="/transcript-decoder" element={<TranscriptDecoder />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/agent-settings" element={<AgentSettings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ReferralTracker>
            </BrowserRouter>
          </BrandingProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
