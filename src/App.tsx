import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "@/pages/Auth";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Subjects = lazy(() => import("@/pages/Subjects"));
const Questions = lazy(() => import("@/pages/Questions"));
const Simulados = lazy(() => import("@/pages/Simulados"));
const WeakTopics = lazy(() => import("@/pages/WeakTopics"));
const DriveSetup = lazy(() => import("@/pages/DriveSetup"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/subjects" element={<Subjects />} />
                  <Route path="/questions" element={<Questions />} />
                  <Route path="/simulados" element={<Simulados />} />
                  <Route path="/weak-topics" element={<WeakTopics />} />
                  <Route path="/drive-setup" element={<DriveSetup />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
