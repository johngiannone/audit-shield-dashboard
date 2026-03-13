import { lazy, Suspense } from "react";
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
import { RouteLoadingFallback } from "@/components/layout/RouteLoadingFallback";

// ── Critical-path pages (kept eagerly loaded for instant first paint) ──
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// ── Lazy-loaded pages (code-split into separate chunks) ──
const FreeScan = lazy(() => import("./pages/FreeScan"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Plans = lazy(() => import("./pages/Plans"));
const ReportNotice = lazy(() => import("./pages/ReportNotice"));
const CaseQueue = lazy(() => import("./pages/CaseQueue"));
const MyCaseload = lazy(() => import("./pages/MyCaseload"));
const MyCases = lazy(() => import("./pages/MyCases"));
const ClientCaseDetail = lazy(() => import("./pages/ClientCaseDetail"));
const AgentCaseDetail = lazy(() => import("./pages/AgentCaseDetail"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Partners = lazy(() => import("./pages/Partners"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const AffiliatePortal = lazy(() => import("./pages/AffiliatePortal"));
const AffiliateAdmin = lazy(() => import("./pages/AffiliateAdmin"));
const PartnerProgram = lazy(() => import("./pages/PartnerProgram"));
const BulkEnroll = lazy(() => import("./pages/BulkEnroll"));
const MyClients = lazy(() => import("./pages/MyClients"));
const ReferralNetwork = lazy(() => import("./pages/ReferralNetwork"));
const Activate = lazy(() => import("./pages/Activate"));
const Notifications = lazy(() => import("./pages/Notifications"));
const BrandingSettings = lazy(() => import("./pages/BrandingSettings"));
const Compliance = lazy(() => import("./pages/Compliance"));
const AuditRiskCheck = lazy(() => import("./pages/AuditRiskCheck"));
const RiskAssessments = lazy(() => import("./pages/RiskAssessments"));
const BatchRiskScan = lazy(() => import("./pages/BatchRiskScan"));
const ModelConfig = lazy(() => import("./pages/ModelConfig"));
const CorporateComplianceReview = lazy(() => import("./pages/CorporateComplianceReview"));
const PenaltyEraser = lazy(() => import("./pages/PenaltyEraser"));
const TranscriptDecoder = lazy(() => import("./pages/TranscriptDecoder"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const AgentSettings = lazy(() => import("./pages/AgentSettings"));
const AuditVault = lazy(() => import("./pages/AuditVault"));

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
                <Suspense fallback={<RouteLoadingFallback />}>
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

                    {/* Agent/Preparer routes */}
                    <Route path="/queue" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><CaseQueue /></ProtectedRoute>} />
                    <Route path="/caseload" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><MyCaseload /></ProtectedRoute>} />
                    <Route path="/agent/cases/:caseId" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><AgentCaseDetail /></ProtectedRoute>} />
                    <Route path="/my-clients" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><MyClients /></ProtectedRoute>} />
                    <Route path="/bulk-enroll" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><BulkEnroll /></ProtectedRoute>} />
                    <Route path="/batch-risk-scan" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><BatchRiskScan /></ProtectedRoute>} />
                    <Route path="/branding" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><BrandingSettings /></ProtectedRoute>} />
                    <Route path="/agent-settings" element={<ProtectedRoute requiredRoles={["enrolled_agent", "tax_preparer"]}><AgentSettings /></ProtectedRoute>} />

                    {/* Admin routes */}
                    <Route path="/admin/affiliates" element={<ProtectedRoute requiredRoles={["enrolled_agent"]}><AffiliateAdmin /></ProtectedRoute>} />
                    <Route path="/admin/model-config" element={<ProtectedRoute requiredRoles={["enrolled_agent"]}><ModelConfig /></ProtectedRoute>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ReferralTracker>
            </BrowserRouter>
          </BrandingProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
