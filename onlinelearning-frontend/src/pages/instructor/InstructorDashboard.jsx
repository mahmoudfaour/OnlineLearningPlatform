import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";
import { Link } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://localhost:5001";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getJson(url) {
  const res = await fetch(url, { headers: authHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  return text ? JSON.parse(text) : null;
}

export default function InstructorDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    coursesCreated: 0,
    totalEnrollments: 0,
    quizzesPublished: 0,
    avgQuizScore: null, // null => show "—"
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");

      try {
        // 1) Courses (existing endpoint)
        const coursesData = await getJson(`${API_BASE}/api/Courses/mine`);
        const list = Array.isArray(coursesData) ? coursesData : [];
        setCourses(list);

        // 2) Stats (real endpoint)
        const statsData = await getJson(
          `${API_BASE}/api/instructor/dashboard/stats`,
        );

        setStats({
          coursesCreated: Number(
            statsData?.coursesCreated ?? statsData?.CoursesCreated ?? 0,
          ),
          totalEnrollments: Number(
            statsData?.totalEnrollments ?? statsData?.TotalEnrollments ?? 0,
          ),
          quizzesPublished: Number(
            statsData?.quizzesPublished ?? statsData?.QuizzesPublished ?? 0,
          ),
          avgQuizScore:
            statsData?.avgQuizScore ?? statsData?.AvgQuizScore ?? null,
        });
      } catch (e) {
        setCourses([]);
        setStats({
          coursesCreated: 0,
          totalEnrollments: 0,
          quizzesPublished: 0,
          avgQuizScore: null,
        });
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <DashboardLayout
      brandText="OnlineLearning"
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="Instructor Dashboard"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "Dashboard", active: true },
      ]}
    >
      {loading ? (
        <div className="card">
          <div className="card-body">
            <i className="fas fa-spinner fa-spin mr-2" />
            Loading dashboard...
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2" />
          {err}
        </div>
      ) : null}

      {!loading ? (
        <>
          {/* Stats */}
          <div className="row">
            <StatBox
              color="bg-info"
              value={stats.coursesCreated}
              label="Courses Created"
              icon="fas fa-book"
            />
            <StatBox
              color="bg-success"
              value={stats.totalEnrollments}
              label="Total Enrollments"
              icon="fas fa-user-graduate"
            />
            <StatBox
              color="bg-warning"
              value={stats.quizzesPublished}
              label="Quizzes Published"
              icon="fas fa-question-circle"
            />
            <StatBox
              color="bg-danger"
              value={
                stats.avgQuizScore == null
                  ? "—"
                  : `${Math.round(Number(stats.avgQuizScore))}%`
              }
              label="Average Quiz Score"
              icon="fas fa-chart-line"
            />
          </div>

          {/* Courses table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">My Courses</h3>
            </div>

            <div className="card-body table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Students</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-muted">
                        No courses yet.
                      </td>
                    </tr>
                  ) : (
                    courses.map((c) => {
                      const id = c.id ?? c.Id;
                      const title = c.title ?? c.Title ?? "Untitled";
                      const isPublished = c.isPublished ?? c.IsPublished;

                      // your current DTO doesn’t include enrollmentCount, so this will be 0 unless you add it
                      const students = Number(
                        c.enrollmentCount ?? c.EnrollmentCount ?? 0,
                      );

                      return (
                        <tr key={id}>
                          <td>{title}</td>
                          <td>
                            {isPublished ? (
                              <span className="badge badge-success">
                                Published
                              </span>
                            ) : (
                              <span className="badge badge-warning">
                                Unpublished
                              </span>
                            )}
                          </td>
                          <td>{students}</td>
                          <td>
                            <Link
                              to={`/instructor/courses/${id}/edit`}
                              className="btn btn-sm btn-info mr-2"
                            >
                              Edit
                            </Link>

                            <Link
                              to={`/instructor/courses/${id}/lessons`}
                              className="btn btn-sm btn-secondary"
                            >
                              Lessons
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <small className="text-muted">
                Uses: GET /api/Courses/mine and GET
                /api/instructor/dashboard/stats
              </small>
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}

function StatBox({ color, value, label, icon }) {
  return (
    <div className="col-lg-3 col-6">
      <div className={`small-box ${color}`}>
        <div className="inner">
          <h3>{value}</h3>
          <p>{label}</p>
        </div>
        <div className="icon">
          <i className={icon} />
        </div>
      </div>
    </div>
  );
}
