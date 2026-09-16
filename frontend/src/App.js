import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { AppShell } from "@/components/layout/AppShell";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Loading } from "@/components/common/primitives";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import MyWork from "@/pages/MyWork";
import GroupWork from "@/pages/GroupWork";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Services from "@/pages/Services";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Tasks from "@/pages/Tasks";
import TaskDetail from "@/pages/TaskDetail";
import Teams from "@/pages/Teams";
import Reports from "@/pages/Reports";
import WorkflowOverview from "@/pages/WorkflowOverview";
import AuditLog from "@/pages/AuditLog";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import ClientPortal from "@/pages/ClientPortal";

function Role({ allow, children }) {
  const { user } = useAuth();
  return allow.includes(user.role) ? children : <Navigate to="/" replace />;
}

function InternalApp() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="my-work" element={<MyWork />} />
          <Route path="group-work" element={<Role allow={["super_admin"]}><GroupWork /></Role>} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="services" element={<Services />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="teams" element={<Teams />} />
          <Route path="workflow" element={<Role allow={["super_admin", "business_admin"]}><WorkflowOverview /></Role>} />
          <Route path="reports" element={<Role allow={["super_admin", "business_admin"]}><Reports /></Role>} />
          <Route path="users" element={<Role allow={["super_admin"]}><Users /></Role>} />
          <Route path="audit" element={<Role allow={["super_admin", "business_admin"]}><AuditLog /></Role>} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

function ClientApp() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<ClientLayout />}>
          <Route index element={<ClientPortal />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

function Root() {
  const { user } = useAuth();
  if (user === null) return <div className="h-screen flex items-center justify-center"><Loading label="Starting OZOO" /></div>;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return user.role === "client" ? <ClientApp /> : <InternalApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
    </AuthProvider>
  );
}
