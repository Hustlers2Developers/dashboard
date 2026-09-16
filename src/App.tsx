import { ApolloProvider } from "@apollo/client/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apolloClient } from "@/lib/graphql-client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthEventBridge } from "@/components/AuthEventBridge";
import { AuthProvider } from "@/components/AuthProvider";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/stores/auth-store";
import Index from "./pages/Index";
import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Teams from "./pages/Teams";
import Departments from "./pages/Departments";
import Positions from "./pages/Positions";
import Invite from "./pages/Invite";
import Attendance from "./pages/Attendance";
import Streak from "./pages/Streak";
import Organizations from "./pages/Organizations";
import Memberships from "./pages/Memberships";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import Journey from "./pages/Journey";
import Services from "./pages/Services";
import Analytics from "./pages/Analytics";
import Apply from "./pages/Apply";
import AcceptInvite from "./pages/AcceptInvite";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GuestApplications from "./pages/GuestApplications";
import SystemStatus from "./pages/SystemStatus";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const OnboardingGate = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <OnboardingModal /> : null;
};

const App = () => (
  <ApolloProvider client={apolloClient}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <AuthEventBridge />
          <OnboardingGate />
          <ErrorBoundary section="App">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments"
              element={
                <ProtectedRoute adminOnly>
                  <Departments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/positions"
              element={
                <ProtectedRoute adminOnly>
                  <Positions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute adminOnly>
                  <Attendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/streak"
              element={
                <ProtectedRoute>
                  <Streak />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invites"
              element={
                <ProtectedRoute adminOnly>
                  <Invite />
                </ProtectedRoute>
              }
            />
            <Route
              path="/memberships"
              element={
                <ProtectedRoute>
                  <Memberships />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                // Not adminOnly here — this page allows org "Admin" role
                // holders too, not just SUPER_ADMIN, and enforces that
                // nuance itself (see Users.tsx's canManageUsers check).
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizations"
              element={
                <ProtectedRoute adminOnly>
                  <Organizations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <Community />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journey"
              element={
                <ProtectedRoute>
                  <Journey />
                </ProtectedRoute>
              }
            />
            <Route
              path="/services"
              element={
                <ProtectedRoute adminOnly>
                  <Services />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute adminOnly>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route path="/apply" element={<Apply />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/applications"
              element={
                <ProtectedRoute adminOnly>
                  <GuestApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-status"
              element={
                <ProtectedRoute adminOnly>
                  <SystemStatus />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ApolloProvider>
);

export default App;
