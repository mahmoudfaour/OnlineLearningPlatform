// src/routes/InstructorRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import InstructorDashboard from "../pages/instructor/InstructorDashboard";
import InstructorCourses from "../pages/instructor/InstructorCourses";
import InstructorLessons from "../pages/instructor/InstructorLessons";
import InstructorQuizzes from "../pages/instructor/InstructorQuizzes";
import QuizQuestionsManager from "../pages/instructor/QuizQuestionsManager";
import QuestionBanks from "../pages/instructor/QuestionBanks";
import BankQuestions from "../pages/instructor/BankQuestions";

export default function InstructorRoutes() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (role !== "Instructor" && role !== "Admin")
    return <Navigate to="/" replace />;

  return (
    <Routes>
      <Route path="/dashboard" element={<InstructorDashboard />} />
      <Route path="/courses" element={<InstructorCourses />} />
      <Route path="/lessons" element={<InstructorLessons />} />
      <Route path="/quizzes" element={<InstructorQuizzes />} />
      <Route path="/quizzes/:quizId/questions" element={<QuizQuestionsManager />} />
      <Route path="/question-banks" element={<QuestionBanks />} />
      <Route path="/question-banks/:id/questions" element={<BankQuestions />} />
    </Routes>
  );
}
