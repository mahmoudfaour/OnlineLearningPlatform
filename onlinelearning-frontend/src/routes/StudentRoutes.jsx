// src/routes/StudentRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import StudentDashboard from "../pages/student/StudentDashboard";
import CoursesList from "../pages/student/CoursesList";
import CourseDetails from "../pages/student/CourseDetails";
import LessonView from "../pages/student/LessonView";
import Progress from "../pages/student/Progress";
import Certificates from "../pages/student/Certificates";
import QuizTake from "../pages/student/QuizTake";
import QuizResult from "../pages/student/QuizResult";

export default function StudentRoutes() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (role !== "Student") return <Navigate to="/" replace />;

  return (
    <Routes>
      <Route path="/dashboard" element={<StudentDashboard />} />
      <Route path="/courses" element={<CoursesList />} />
      <Route path="/courses/:id" element={<CourseDetails />} />

      {/* keep your existing paths */}
      <Route path="/lesson" element={<LessonView />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/certificates" element={<Certificates />} />
      <Route path="/quiz" element={<QuizTake />} />
      <Route path="/quiz-result" element={<QuizResult />} />

      {/* fallback inside student */}
      <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
    </Routes>
  );
}
