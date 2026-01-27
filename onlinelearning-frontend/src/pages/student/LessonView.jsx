import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import { authHeaders, getUserIdFromToken } from "../../utils/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://localhost:5001").replace(
  /\/$/,
  ""
);

export default function LessonView() {
  const sidebar = [
    { to: "/student/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
    { to: "/student/courses", icon: "fas fa-book", label: "Browse Courses" },
    { to: "/student/progress", icon: "fas fa-chart-line", label: "Progress" },
    { to: "/student/certificates", icon: "fas fa-certificate", label: "Certificates" },
  ];

  const userId = getUserIdFromToken();

  // ✅ Fix ESLint warning: memoize headers so it's stable across renders
  const headers = useMemo(() => authHeaders(), []);

  const [activeTab, setActiveTab] = useState("content");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Read query params: /student/lesson?courseId=1&lessonId=2
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const courseId = Number(params.get("courseId"));
  const lessonId = Number(params.get("lessonId"));

  const [lessons, setLessons] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [completions, setCompletions] = useState([]);

  const currentLesson = useMemo(
    () => lessons.find((l) => l.id === lessonId),
    [lessons, lessonId]
  );

  const currentIndex = useMemo(
    () => lessons.findIndex((l) => l.id === lessonId),
    [lessons, lessonId]
  );

  const isCompleted = useMemo(
    () => completions.some((c) => c.lessonId === lessonId),
    [completions, lessonId]
  );

  useEffect(() => {
    if (!userId) {
      setError("Missing userId in token. Please login again.");
      setLoading(false);
      return;
    }

    if (!courseId || !lessonId) {
      setError("Missing courseId or lessonId in URL. Example: /student/lesson?courseId=1&lessonId=2");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [lessonsRes, attachmentsRes, completionsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/courses/${courseId}/lessons`, { headers }),
          axios.get(`${API_BASE}/api/lessons/${lessonId}/attachments`, { headers }),
          axios.get(`${API_BASE}/api/LessonCompletions/user/${userId}/course/${courseId}`, { headers }),
        ]);

        setLessons(lessonsRes.data || []);
        setAttachments(attachmentsRes.data || []);
        setCompletions(completionsRes.data || []);
      } catch (e) {
        setError(e?.response?.data || "Failed to load lesson data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId, courseId, lessonId, headers]);

  async function markCompleted() {
    try {
      setError("");

      await axios.post(
        `${API_BASE}/api/LessonCompletions`,
        { lessonId, userId },
        { headers }
      );

      // refresh completions
      const completionsRes = await axios.get(
        `${API_BASE}/api/LessonCompletions/user/${userId}/course/${courseId}`,
        { headers }
      );

      setCompletions(completionsRes.data || []);
    } catch (e) {
      setError(e?.response?.data || "Failed to mark lesson completed.");
    }
  }

  function goToLessonByIndex(idx) {
    const next = lessons[idx];
    if (!next) return;
    window.location.href = `/student/lesson?courseId=${courseId}&lessonId=${next.id}`;
  }

  return (
    <DashboardLayout
      brandIconClass="fas fa-graduation-cap"
      brandText="OnlineLearning"
      navbarRoleLabel="Student"
      sidebarItems={sidebar}
      title="Lesson View"
      breadcrumb={[
        { label: "Student", to: "/student/dashboard" },
        { label: "Courses", to: "/student/courses" },
        { label: "Lesson", active: true },
      ]}
    >
      {error ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {String(error)}
        </div>
      ) : null}

      <div className="card course-card">
        <div className="card-body">
          {loading ? (
            <div>Loading...</div>
          ) : !currentLesson ? (
            <div className="text-muted">Lesson not found.</div>
          ) : (
            <>
              <div className="d-flex justify-content-between flex-wrap" style={{ gap: 10 }}>
                <div>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    <i className="fas fa-book mr-1"></i> Course #{courseId}
                  </div>
                  <h3 className="mb-1">{currentLesson.title}</h3>

                  <span className="badge badge-info">{String(currentLesson.lessonType)}</span>
                  {isCompleted ? <span className="badge badge-success ml-2">Completed</span> : null}
                </div>

                <div className="d-flex" style={{ gap: 10 }}>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => goToLessonByIndex(currentIndex - 1)}
                    disabled={currentIndex <= 0}
                    type="button"
                  >
                    <i className="fas fa-chevron-left mr-1"></i> Prev
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => goToLessonByIndex(currentIndex + 1)}
                    disabled={currentIndex >= lessons.length - 1}
                    type="button"
                  >
                    Next <i className="fas fa-chevron-right ml-1"></i>
                  </button>

                  <button
                    className="btn btn-success"
                    onClick={markCompleted}
                    disabled={isCompleted}
                    type="button"
                  >
                    <i className="fas fa-check mr-1"></i>
                    {isCompleted ? "Completed" : "Mark as Completed"}
                  </button>
                </div>
              </div>

              <hr />

              <ul className="nav nav-tabs">
                <li className="nav-item">
                  <a
                    className={`nav-link ${activeTab === "content" ? "active" : ""}`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab("content");
                    }}
                  >
                    Content
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link ${activeTab === "resources" ? "active" : ""}`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab("resources");
                    }}
                  >
                    Resources
                  </a>
                </li>
              </ul>

              <div className="mt-3">
                {activeTab === "content" ? (
                  <div className="card course-card mb-0">
                    <div className="card-body">
                      {String(currentLesson.lessonType).toLowerCase() === "video" &&
                      currentLesson.videoUrl ? (
                        <div>
                          <div className="text-muted mb-2">Video URL:</div>
                          <a href={currentLesson.videoUrl} target="_blank" rel="noreferrer">
                            {currentLesson.videoUrl}
                          </a>
                        </div>
                      ) : (
                        <p className="mb-0">{currentLesson.contentText || "No content."}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="card course-card mb-0">
                    <div className="card-body">
                      {attachments.length === 0 ? (
                        <div className="text-muted">No resources.</div>
                      ) : (
                        <ul className="mb-0">
                          {attachments.map((a) => (
                            <li key={a.id}>
                              <a href={a.fileUrl} target="_blank" rel="noreferrer">
                                {a.fileType} — {a.fileUrl}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
