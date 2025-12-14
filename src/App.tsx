import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/report" element={<ReportNotice />} />
            <Route path="/queue" element={<CaseQueue />} />
            <Route path="/caseload" element={<MyCaseload />} />
            <Route path="/caseload/:caseId" element={<AgentCaseDetail />} />
            <Route path="/my-cases" element={<MyCases />} />
            <Route path="/my-cases/:caseId" element={<ClientCaseDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
