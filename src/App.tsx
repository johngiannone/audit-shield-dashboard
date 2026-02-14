import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BrandingProvider } from "@/hooks/useBranding";
import { HelmetProvider } from "react-helmet-async";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import FreeScan from "./pages/FreeScan";
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
import AuditVault from "./pages/AuditVault";
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
                  {/* Public routes - no auth required */}
                  <Route path="/" element={<Index />} />
                  <Route path="/free-scan" element={<FreeScan />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/partner-program" element={<PartnerProgram />} />
                  <Route path="/activate" element={<Activate />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />

                  {/* Authenticated routes - any logged-in user */}
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/report" element={<ProtectedRoute><ReportNotice /></ProtectedRoute>} />
                  <Route path="/my-cases" element={<ProtectedRoute><MyCases /></ProtectedRoute>} />
                  <Route path="/my-cases/:caseId" element={<ProtectedRoute><ClientCaseDetail /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/audit-risk" element={<ProtectedRoute><AuditRiskCheck /></ProtectedRoute>} />
                  <Route path="/risk-assessments" element={<ProtectedRoute><RiskAssessments /></ProtectedRoute>} />
                  <Route path="/penalty-eraser" element={<ProtectedRoute><PenaltyEraser /></ProtectedRoute>} />
                  <Route path="/transcript-decoder" element={<ProtectedRoute><TranscriptDecoder /></ProtectedRoute>} />
                  <Route path="/audit-vault" element={<ProtectedRoute><AuditVault /></ProtectedRoute>} />
                  <Route path="/compliance" element={<ProtectedRoute><Compliance /></ProtectedRoute>} />
                  <Route path="/corporate-compliance-review" element={<ProtectedRoute><CorporateComplianceReview /></ProtectedRoute>} />
                  <Route path="/affiliates" element={<ProtectedRoute><Affiliates /></ProtectedRoute>} />
                  <Route path="/affiliate-portal" element={<ProtectedRoute><AffiliatePortal /></ProtectedRoute>} />
                  <Route path="/referral-network" element={<ProtectedRoute><ReferralNetwork /></ProtectedRoute>} />
                  <Route path="/partners" element={<ProtectedRoute><Partners /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

                  {/* Agent/Preparer routes - require enrolled_agent or tax_preparer role */}
                  <Route path="/queue" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><CaseQueue /></ProtectedRoute>} />
                  <Route path="/caseload" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><MyCaseload /></ProtectedRoute>} />
                  <Route path="/agent/cases/:caseId" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><AgentCaseDetail /></ProtectedRoute>} />
                  <Route path="/my-clients" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><MyClients /></ProtectedRoute>} />
                  <Route path="/bulk-enroll" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><BulkEnroll /></ProtectedRoute>} />
                  <Route path="/batch-risk-scan" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><BatchRiskScan /></ProtectedRoute>} />
                  <Route path="/branding" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><BrandingSettings /></ProtectedRoute>} />
                  <Route path="/agent-settings" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><AgentSettings /></ProtectedRoute>} />

                  {/* Admin routes - require enrolled_agent role (admin) */}
                  <Route path="/admin/affiliates" element={<ProtectedRoute requiredRoles={["enrolled_agent"]}><AffiliateAdmin /></ProtectedRoute>} />
                  <Route path="/admin/model-config" element={<ProtectedRoute requiredRoles={["enrolled_agent"]}><ModelConfig /></ProtectedRoute>} />

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
