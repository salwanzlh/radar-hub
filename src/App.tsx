import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { useAuth } from "@/lib/auth-context";
import ArticlesPage from "@/pages/ArticlesPage";
import AnalysisPage from "@/pages/AnalysisPage";
import MarketingPlanV2Page from "@/pages/MarketingPlanV2Page";
import SentimentPage from "@/pages/sentiment";
import HealthPage from "@/pages/HealthPage";
import SettingsPage from "@/pages/settings";
import DataPipelinePage from "@/pages/pipeline";
import PriceComparisonPage from "@/pages/pipeline/PriceComparisonPage";
import { AtoaPage } from "@/pages/atoa";
import { RadarPage } from "@/pages/radar";
import MarketingPlanPage from "@/pages/MarketingPlanPage";
import LoginPage from "@/pages/LoginPage";
import NotFoundPage from "@/pages/NotFoundPage";

function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-text-tertiary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-text-tertiary">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

const router = createBrowserRouter(
  [
    {
      element: <PublicOnlyRoute />,
      children: [
        { path: "login", element: <LoginPage /> },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: "/",
          element: <LayoutShell />,
          children: [
            { index: true, element: <Navigate to="/sentiment" replace /> },
            { path: "articles", element: <ArticlesPage /> },
            { path: "analysis", element: <AnalysisPage /> },
            { path: "marketing-plan-v2", element: <MarketingPlanV2Page /> },
            { path: "sentiment", element: <SentimentPage /> },
            { path: "atoa", element: <AtoaPage /> },
            { path: "radar", element: <RadarPage /> },
            { path: "positioning-radar", element: <Navigate to="/radar" replace /> },
            { path: "marketing-plan", element: <MarketingPlanPage /> },
            { path: "health", element: <HealthPage /> },
            { path: "pipeline", element: <DataPipelinePage /> },
            { path: "pricing", element: <PriceComparisonPage /> },
            { path: "settings", element: <SettingsPage /> },
            { path: "*", element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ],
  { basename: "/mitra" }
);

export default function App() {
  return <RouterProvider router={router} />;
}
