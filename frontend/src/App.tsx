import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import OAuthCallback from "./pages/oauth_callback";
import MainLayout from "./components/layout/MainLayout";
import Archive from "./pages/archive";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />

      {/* The Layout Route - Everything inside here shares the Sidebar! */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/archive" element={<Archive />} />
      </Route>
    </Routes>
  );
}

export default App;
