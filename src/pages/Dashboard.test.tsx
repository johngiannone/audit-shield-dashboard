import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock all heavy dependencies before importing the component
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/dashboard" }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }: any) => <a href={to}>{typeof children === 'function' ? children({ isActive: false }) : children}</a>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
    role: "client",
    loading: false,
    resendVerificationEmail: vi.fn(),
  }),
}));

// Create a chainable mock that supports arbitrary .method() chaining
const createChainable = (terminal = { data: [], error: null }) => {
  const handler: ProxyHandler<any> = {
    get: (_target, prop) => {
      if (prop === 'then') return undefined; // not a promise
      if (['data', 'error'].includes(prop as string)) return terminal[prop as keyof typeof terminal];
      return (..._args: any[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => createChainable(),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }),
    }),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useBranding", () => ({
  useBranding: () => ({ firmName: null, logoUrl: null, primaryColor: null }),
}));

// Import after mocks
import Dashboard from "./Dashboard";

describe("Dashboard", () => {
  it("renders without crashing", () => {
    render(<Dashboard />);
    // The dashboard title comes from t() which returns the key
    expect(screen.getByText("dashboardTitles.client")).toBeInTheDocument();
  });

  it("displays the user email", () => {
    render(<Dashboard />);
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });
});
