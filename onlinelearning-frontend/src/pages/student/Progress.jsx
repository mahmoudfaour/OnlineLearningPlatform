import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import { authHeaders, getUserIdFromToken } from "../../utils/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://localhost:5001").replace(/\/$/, "");

export default function Progress() {
  const sidebar = [
    { to: "/student/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
    { to: "/student/courses", icon: "fas fa-book", label: "Browse Courses" },
    { to: "/student/progress", icon: "fas fa-chart-line", label: "Progress", active: true },
    { to: "/student/certificates", icon: "fas fa-certificate", label: "Certificates" },
  ];

  const userId = getUserIdFromToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rows, setRows] = useState([]); // normalized progress rows
  const [pendingQuizzes, setPendingQuizzes] = useState(0);

  useEffect(() => {
    const headers = authHeaders();

    async function load() {
      try {
        setLoading(true);
        setError("");

        // 1) Get published courses (for titles)
        const coursesRes = await axios.get(`${API_BASE}/api/Courses/published`);
        const publishedCourses = coursesRes.data || [];

        // Build titleMap locally (IMPORTANT: avoid using state here)
        const titleMap = new Map();
        for (const c of publishedCourses) titleMap.set(Number(c.id), c.title);

        // 2) Enrollments
        const enrRes = await axios.get(`${API_BASE}/api/student/courseenrollments/my`, { headers });
        const activeCourseIds = (enrRes.data || [])
          .filter((e) => String(e.status).toLowerCase() === "active")
          .map((e) => Number(e.courseId));

        // 3) Progress per course
        const progressResults = await Promise.all(
          activeCourseIds.map(async (courseId) => {
            try {
              const p = await axios.get(`${API_BASE}/api/student/progress/course/${courseId}`, { headers });
              return { ok: true, courseId, data: p.data };
            } catch (e) {
              return { ok: false, courseId, error: e?.response?.data || "Progress endpoint failed." };
            }
          })
        );

        const mapped = progressResults.map((r) => {
          const title = titleMap.get(Number(r.courseId)) || `Course #${r.courseId}`;

          if (!r.ok) {
            return {
              courseId: r.courseId,
              course: title,
              completed: 0,
              total: 0,
              percent: 0,
              note: String(r.error),
            };
          }

          const d = r.data || {};
          const completed = Number(d.completedLessons ?? 0);
          const total = Number(d.totalLessons ?? 0);
          const percent = Number(d.lessonsProgressPercent ?? d.overallPercent ?? 0);

          return {
            courseId: r.courseId,
            course: title,
            completed,
            total,
            percent,
            note: "",
          };
        });

        setRows(mapped);

        // 4) Pending quizzes (completed lessons but no certificate)
        // Certificates endpoint: /api/student/certificates/user/{userId}
        let certs = [];
        if (userId) {
          try {
            const certRes = await axios.get(`${API_BASE}/api/student/certificates/user/${userId}`, { headers });
            certs = certRes.data || [];
          } catch {
            certs = [];
          }
        }

        const certByCourse = new Set((Array.isArray(certs) ? certs : []).map((c) => Number(c.courseId)));

        let pending = 0;
        for (const r of mapped) {
          const lessonsDone = r.total > 0 && r.completed >= r.total;
          const hasCert = certByCourse.has(Number(r.courseId));
          if (lessonsDone && !hasCert) pending++;
        }
        setPendingQuizzes(pending);
      } catch (e) {
        setError(e?.response?.data || "Failed to load progress.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  const trackedCourses = rows.length;

  const avgCompletion = useMemo(() => {
    if (rows.length === 0) return 0;
    const sum = rows.reduce((acc, r) => acc + Number(r.percent || 0), 0);
    return Math.round(sum / rows.length);
  }, [rows]);

  return (
    <DashboardLayout
      brandIconClass="fas fa-graduation-cap"
      brandText="OnlineLearning"
      navbarRoleLabel="Student"
      sidebarItems={sidebar}
      title="Progress"
      breadcrumb={[
        { label: "Student", to: "/student/dashboard" },
        { label: "Progress", active: true },
      ]}
    >
      {error ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {String(error)}
        </div>
      ) : null}

      <div className="row">
        <div className="col-lg-4 col-12">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{trackedCourses}</h3>
              <p>Tracked Courses</p>
            </div>
            <div className="icon">
              <i className="fas fa-book"></i>
            </div>
          </div>
        </div>

        <div className="col-lg-4 col-12">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{avgCompletion}%</h3>
              <p>Average Completion</p>
            </div>
            <div className="icon">
              <i className="fas fa-chart-line"></i>
            </div>
          </div>
        </div>

        <div className="col-lg-4 col-12">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>{pendingQuizzes}</h3>
              <p>Pending Quizzes</p>
            </div>
            <div className="icon">
              <i className="fas fa-question-circle"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="card course-card">
        <div className="card-header">
          <h3 className="card-title">Course Progress</h3>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="p-3">Loading...</div>
          ) : (
            <table className="table table-bordered mb-0">
              <thead>
                <tr>
                  <th style={{ width: "45%" }}>Course</th>
                  <th style={{ width: "20%" }}>Lessons</th>
                  <th style={{ width: "35%" }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-muted p-3">
                      No enrollments found.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.courseId}>
                      <td>
                        {r.course}
                        {r.note ? <div className="text-danger small mt-1">{r.note}</div> : null}
                      </td>
                      <td>
                        {r.completed} / {r.total}
                      </td>
                      <td>
                        <div className="progress-modern">
                          <div className="progress modern">
                            <div className="progress-bar" style={{ width: `${Math.round(r.percent)}%` }}></div>
                          </div>
                          <span className="progress-label">{Math.round(r.percent)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
