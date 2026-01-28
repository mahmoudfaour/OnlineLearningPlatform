import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import CoursesList from "./pages/student/CoursesList";
import CourseDetails from "./pages/student/CourseDetails";
import LessonView from "./pages/student/LessonView";
import Progress from "./pages/student/Progress";
import Certificates from "./pages/student/Certificates";
import QuizTake from "./pages/student/QuizTake";
import QuizResult from "./pages/student/QuizResult";

import InstructorDashboard from "./pages/instructor/InstructorDashboard";
// instructor
import InstructorCourses from "./pages/instructor/InstructorCourses";
import CreateCourse from "./pages/instructor/CreateCourse";
import EditCourse from "./pages/instructor/EditCourse";
import CourseEnrollments from "./pages/instructor/CourseEnrollments";
import InstructorLessons from "./pages/instructor/InstructorLessons";
import InstructorQuizzes from "./pages/instructor/InstructorQuizzes";
import QuizQuestionsManager from "./pages/instructor/QuizQuestionsManager";
import QuestionBanks from "./pages/instructor/QuestionBanks";
import BankQuestions from "./pages/instructor/BankQuestions";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersManagement from "./pages/admin/UsersManagement";

function RequireAuth({ children, role }) {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  if (!token) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Prototype Home */}
        <Route path="/" element={<HomePage />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student */}
        <Route
          path="/student/dashboard"
          element={
            <RequireAuth role="Student">
              <StudentDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/student/courses"
          element={
            <RequireAuth role="Student">
              <CoursesList />
            </RequireAuth>
          }
        />
        <Route
          path="/student/courses/:id"
          element={
            <RequireAuth role="Student">
              <CourseDetails />
            </RequireAuth>
          }
        />
        <Route
          path="/student/lesson"
          element={
            <RequireAuth role="Student">
              <LessonView />
            </RequireAuth>
          }
        />
        <Route
          path="/student/progress"
          element={
            <RequireAuth role="Student">
              <Progress />
            </RequireAuth>
          }
        />
        <Route
          path="/student/certificates"
          element={
            <RequireAuth role="Student">
              <Certificates />
            </RequireAuth>
          }
        />
        <Route
          path="/student/quiz"
          element={
            <RequireAuth role="Student">
              <QuizTake />
            </RequireAuth>
          }
        />
        <Route
          path="/student/quiz-result"
          element={
            <RequireAuth role="Student">
              <QuizResult />
            </RequireAuth>
          }
        />

        {/* INSTRUCTOR */}
        <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
        <Route path="/instructor/courses" element={<InstructorCourses />} />
        <Route path="/instructor/courses/create" element={<CreateCourse />} />
        <Route path="/instructor/courses/:id/edit" element={<EditCourse />} />
        <Route
          path="/instructor/courses/:id/enrollments"
          element={<CourseEnrollments />}
        />
        <Route path="/instructor/lessons" element={<InstructorLessons />} />
        <Route path="/instructor/quizzes" element={<InstructorQuizzes />} />
        <Route
          path="/instructor/quizzes/:quizId/questions"
          element={<QuizQuestionsManager />}
        />
        <Route path="/instructor/question-banks" element={<QuestionBanks />} />
        <Route
          path="/instructor/question-banks/:id/questions"
          element={<BankQuestions />}
        />
        <Route
          path="/instructor/courses/:id/lessons"
          element={
            <RequireAuth role="Instructor">
              <InstructorLessons />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth role="Admin">
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth role="Admin">
              <UsersManagement />
            </RequireAuth>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
