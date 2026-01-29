import { Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "../pages/admin/AdminDashboard";
import UsersManagement from "../pages/admin/UsersManagement";
import AdminCourses from "../pages/admin/AdminCourses";
import AdminLessons from "../pages/admin/AdminLessons";
import AdminQuizzes from "../pages/admin/AdminQuizzes";
// later:
// import AdminCourses from "../pages/admin/AdminCourses";

export default function AdminRoutes() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (role !== "Admin") return <Navigate to="/" replace />;

  return (
    <Routes>
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/users" element={<UsersManagement />} />
      {/* <Route path="/courses" element={<AdminCourses />} /> */}
      <Route path="/courses" element={<AdminCourses />} />
    <Route path="/lessons" element={<AdminLessons />} />
<Route path="/quizzes" element={<AdminQuizzes />} />

    </Routes>

  );
}
