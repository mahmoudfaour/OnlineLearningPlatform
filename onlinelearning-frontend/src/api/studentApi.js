// src/api/studentApi.js
import { api } from "./apiClient";

// Courses (public / student browsing)
export const getPublishedCourses = () => api.get("/api/Courses/published");
export const getCourseById = (id) => api.get(`/api/Courses/${id}`);

// Student enrollments
export const getMyEnrollments = () => api.get("/api/student/courseenrollments/my");
export const enrollInCourse = (courseId) =>
  api.post("/api/student/courseenrollments", { courseId });

// Lessons (Instructor controller, but GET is protected by Instructor/Admin in your code)
// ⚠️ Your current LessonsController is [Authorize(Roles="Instructor,Admin")] so Student can't call it.
// If you want students to view lessons, create a Student Lessons endpoint or allow Student GET.
export const getLessonsByCourse = (courseId) =>
  api.get(`/api/courses/${courseId}/lessons`);

// Lesson completions (Student)
export const getUserCourseCompletions = (userId, courseId) =>
  api.get(`/api/LessonCompletions/user/${userId}/course/${courseId}`);

export const completeLesson = (lessonId, userId) =>
  api.post(`/api/LessonCompletions`, { lessonId, userId });

// Certificates (Student)
export const getCertificatesByUser = (userId) =>
  api.get(`/api/student/certificates/user/${userId}`);

export const generateCertificate = (courseId, userId) =>
  api.post(`/api/student/certificates/generate`, { courseId, userId });

// Progress (Student)
export const getCourseProgress = (courseId) =>
  api.get(`/api/student/progress/course/${courseId}`);

// Quizzes (Student attempts)
export const startQuizAttempt = (quizId, userId) =>
  api.post(`/api/student/quizzes/${quizId}/attempts/start`, { userId });

export const submitQuizAttempt = (attemptId, payload) =>
  api.post(`/api/student/quizzes/attempts/${attemptId}/submit`, payload);
