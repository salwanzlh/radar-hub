import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { LayoutShell } from "@/components/layout/LayoutShell";
import DashboardPage from "@/pages/DashboardPage";
import ArticlesPage from "@/pages/ArticlesPage";
import AnalysisPage from "@/pages/AnalysisPage";
import SentimentPage from "@/pages/sentiment";
import HealthPage from "@/pages/HealthPage";
import SettingsPage from "@/pages/settings";
import NotFoundPage from "@/pages/NotFoundPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "articles", element: <ArticlesPage /> },
      { path: "analysis", element: <AnalysisPage /> },
      { path: "sentiment", element: <SentimentPage /> },
      { path: "health", element: <HealthPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
