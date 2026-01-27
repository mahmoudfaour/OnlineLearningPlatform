import DashboardLayout from "../../layouts/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/apiClient";
import { Link } from "react-router-dom";
import { authHeaders, getUserIdFromToken } from "../../utils/auth";

export default function StudentDashboard() {
  const sidebar = useMemo(
    () => [
      { to: "/student/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard", active: true },
      { to: "/student/courses", icon: "fas fa-book", label: "Browse Courses" },
      { to: "/student/progress", icon: "fas fa-chart-line", label: "Progress" },
      { to: "/student/certificates", icon: "fas fa-certificate", label: "Certificates" },
    ],
    []
  );

  const userId = getUserIdFromToken();
  const headers = useMemo(() => authHeaders(), []);

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [coursesMap, setCoursesMap] = useState({}); // { courseId: courseTitle }

  const [courseProgressMap, setCourseProgressMap] = useState({});
  const [overallProgress, setOverallProgress] = useState(0);

  const [pendingQuizzes, setPendingQuizzes] = useState(0);
  const [certCount, setCertCount] = useState(0);

  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        // 1) My enrollments
        const enrRes = await api.get("/api/student/courseenrollments/my", { headers });
        const activeEnrollments = (enrRes.data || []).filter(
          (e) => String(e.status).toLowerCase() === "active"
        );
        setEnrollments(activeEnrollments);

        const courseIds = [...new Set(activeEnrollments.map((e) => e.courseId))];

        // 2) Fetch course titles
        const courseResults = await Promise.all(
          courseIds.map(async (cid) => {
            try {
              const cRes = await api.get(`/api/Courses/${cid}`);
              return [cid, cRes.data?.title || `Course #${cid}`];
            } catch {
              return [cid, `Course #${cid}`];
            }
          })
        );

        const titleMap = {};
        for (const [cid, title] of courseResults) titleMap[cid] = title;
        setCoursesMap(titleMap);

        // 3) Fetch progress per course
        const progressResults = await Promise.all(
          courseIds.map(async (cid) => {
            try {
              const pRes = await api.get(`/api/student/progress/course/${cid}`, { headers });
              const p = pRes.data || {};
              return [
                cid,
                {
                  overallPercent: Number(p.overallPercent ?? 0),
                  totalLessons: Number(p.totalLessons ?? 0),
                  completedLessons: Number(p.completedLessons ?? 0),
                },
              ];
            } catch {
              return [
                cid,
                {
                  overallPercent: 0,
                  totalLessons: 0,
                  completedLessons: 0,
                },
              ];
            }
          })
        );

        const progMap = {};
        for (const [cid, prog] of progressResults) progMap[cid] = prog;
        setCourseProgressMap(progMap);

        // 4) Overall progress = average over enrolled courses
        if (courseIds.length > 0) {
          const avg =
            progressResults.reduce((sum, [, p]) => sum + Number(p.overallPercent || 0), 0) /
            courseIds.length;
          setOverallProgress(Math.round(avg));
        } else {
          setOverallProgress(0);
        }

        // 5) Certificates earned (still fine)
        let certs = [];
        if (userId) {
          try {
            const certRes = await api.get(`/api/student/certificates/user/${userId}`, { headers });
            certs = certRes.data || [];
          } catch {
            certs = [];
          }
        }
        setCertCount(Array.isArray(certs) ? certs.length : 0);

        // ✅ 6) Pending quizzes (REAL logic using your new endpoint)
        // pending = lessonsCompleted && hasFinalQuiz && NOT passed
        const statusResults = await Promise.all(
          courseIds.map(async (cid) => {
            try {
              const sRes = await api.get(`/api/student/quizzes/final/status/${cid}`, { headers });
              return { cid, ok: true, data: sRes.data };
            } catch {
              return { cid, ok: false, data: null };
            }
          })
        );

        let pending = 0;
        for (const r of statusResults) {
          if (!r.ok || !r.data) continue;

          const hasFinalQuiz = r.data.hasFinalQuiz === true;
          const lessonsCompleted = r.data.lessonsCompleted === true;
          const passed = r.data.passed === true;

          if (hasFinalQuiz && lessonsCompleted && !passed) pending++;
        }

        setPendingQuizzes(pending);
      } catch {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [headers, userId]);

  const enrolledCount = enrollments.length;

  return (
    <DashboardLayout
      brandIconClass="fas fa-graduation-cap"
      brandText="OnlineLearning"
      navbarRoleLabel="Student"
      sidebarItems={sidebar}
      title="Student Dashboard"
      breadcrumb={[
        { label: "Home", to: "/student/dashboard" },
        { label: "Student Dashboard", active: true },
      ]}
    >
      {loading ? (
        <div className="alert alert-info">
          <i className="fas fa-spinner fa-spin mr-1"></i> Loading dashboard...
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-1"></i> {error}
        </div>
      ) : (
        <>
          <div className="row">
            <div className="col-lg-3 col-6">
              <div className="small-box bg-info">
                <div className="inner">
                  <h3>{enrolledCount}</h3>
                  <p>Enrolled Courses</p>
                </div>
                <div className="icon">
                  <i className="fas fa-book"></i>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-6">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>{overallProgress}%</h3>
                  <p>Overall Progress</p>
                </div>
                <div className="icon">
                  <i className="fas fa-chart-line"></i>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-6">
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

            <div className="col-lg-3 col-6">
              <div className="small-box bg-danger">
                <div className="inner">
                  <h3>{certCount}</h3>
                  <p>Certificates Earned</p>
                </div>
                <div className="icon">
                  <i className="fas fa-certificate"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="card course-card">
                <div className="card-header">
                  <h3 className="card-title">My Courses</h3>
                </div>
                <div className="card-body">
                  {enrolledCount === 0 ? (
                    <div className="alert alert-light mb-0">
                      You are not enrolled in any course yet.{" "}
                      <Link to="/student/courses">Browse courses</Link>
                    </div>
                  ) : (
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th style={{ width: "55%" }}>Course</th>
                          <th style={{ width: "45%" }}>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((e) => {
                          const cid = e.courseId;
                          const p = courseProgressMap[cid] || { overallPercent: 0 };
                          const percent = Math.max(0, Math.min(100, Number(p.overallPercent || 0)));

                          return (
                            <tr key={e.id}>
                              <td>
                                <Link to={`/student/courses/${cid}`}>
                                  {coursesMap[cid] || `Course #${cid}`}
                                </Link>
                              </td>
                              <td>
                                <div className="progress-modern">
                                  <div className="progress modern">
                                    <div className="progress-bar" style={{ width: `${percent}%` }}></div>
                                  </div>
                                  <span className="progress-label">{percent}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
