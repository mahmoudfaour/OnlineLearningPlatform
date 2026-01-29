// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Routes groups
import AdminRoutes from "./routes/AdminRoutes"; // ✅ keep your tested admin routes file
import InstructorRoutes from "./routes/InstructorRoutes";
import StudentRoutes from "./routes/StudentRoutes";

function redirectByRole(role) {
  if (role === "Admin") return "/admin/dashboard";
  if (role === "Instructor") return "/instructor/dashboard";
  return "/student/dashboard";
}

function RootRedirect() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // not logged in => login
  if (!token) return <Navigate to="/login" replace />;

  // logged in => go to correct dashboard
  return <Navigate to={redirectByRole(role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default entry */}
        <Route path="/" element={<RootRedirect />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Role-based route groups */}
        <Route path="/student/*" element={<StudentRoutes />} />
        <Route path="/instructor/*" element={<InstructorRoutes />} />
        <Route path="/admin/*" element={<AdminRoutes />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
