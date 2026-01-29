// src/routes/InstructorRoutes.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import InstructorDashboard from "../pages/instructor/InstructorDashboard";
import InstructorCourses from "../pages/instructor/InstructorCourses";
import InstructorLessons from "../pages/instructor/InstructorLessons";
import InstructorQuizzes from "../pages/instructor/InstructorQuizzes";
import QuizQuestionsManager from "../pages/instructor/QuizQuestionsManager";
import QuestionBanks from "../pages/instructor/QuestionBanks";
import BankQuestions from "../pages/instructor/BankQuestions";
import AiQuizReview from "../pages/instructor/AiQuizReview";

import EditCourse from "../pages/instructor/EditCourse";
import CourseEnrollments from "../pages/instructor/CourseEnrollments";

export default function InstructorRoutes() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (role !== "Instructor" && role !== "Admin") return <Navigate to="/" replace />;

  return (
    <Routes>
      {/* IMPORTANT: these are RELATIVE paths under /instructor/* */}
      <Route path="dashboard" element={<InstructorDashboard />} />

      <Route path="courses" element={<InstructorCourses />} />
      <Route path="courses/:id/edit" element={<EditCourse />} />
      <Route path="courses/:id/enrollments" element={<CourseEnrollments />} />

      {/* TEMP: until you create CourseLessons page */}
      <Route path="courses/:id/lessons" element={<InstructorLessons />} />

      <Route path="lessons" element={<InstructorLessons />} />

      <Route path="quizzes" element={<InstructorQuizzes />} />
      <Route path="quizzes/:quizId/questions" element={<QuizQuestionsManager />} />

      <Route path="question-banks" element={<QuestionBanks />} />
      <Route path="question-banks/:id/questions" element={<BankQuestions />} />

      <Route path="ai-quiz/review" element={<AiQuizReview />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/instructor/dashboard" replace />} />
    </Routes>
  );
}
