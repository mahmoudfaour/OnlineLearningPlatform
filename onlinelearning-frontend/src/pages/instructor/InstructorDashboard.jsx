// File: src/pages/instructor/InstructorDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { tryGet } from "../../utils/tryGet";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://localhost:5001"; // change if your backend uses another URL/port

function getToken() {
  return localStorage.getItem("token") || "";
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function InstructorDashboard() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState({ fullName: "Instructor", email: "" });

  const [stats, setStats] = useState({
    coursesCreated: 0,
    totalEnrollments: 0,
    quizzesPublished: 0,
    avgQuizScore: 0,
  });

  const [courses, setCourses] = useState([]);
  const [attempts, setAttempts] = useState([]);

  const displayName = useMemo(() => {
    const stored = localStorage.getItem("fullName");
    return (stored || me.fullName || "Instructor").trim();
  }, [me.fullName]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const headers = authHeaders();

    async function load() {
      setLoading(true);

      // 1) Who am I?
      const meRes = await tryGet(
        [
          `${API_BASE}/api/auth/me`,
          `${API_BASE}/api/users/me`,
          `${API_BASE}/api/account/me`,
        ],
        { headers }
      );

      if (meRes.ok && meRes.data) {
        const fullName =
          meRes.data.fullName ||
          meRes.data.name ||
          meRes.data.user?.fullName ||
          "Instructor";
        const email = meRes.data.email || meRes.data.user?.email || "";
        setMe({ fullName, email });
        localStorage.setItem("fullName", fullName);
      }

      // 2) Stats
      const statsRes = await tryGet(
        [
          `${API_BASE}/api/instructor/dashboard/stats`,
          `${API_BASE}/api/instructor/stats`,
          `${API_BASE}/api/dashboard/instructor`,
        ],
        { headers }
      );

      if (statsRes.ok && statsRes.data) {
        const d = statsRes.data;
        setStats({
          coursesCreated: d.coursesCreated ?? d.courses ?? 0,
          totalEnrollments: d.totalEnrollments ?? d.enrollments ?? 0,
          quizzesPublished: d.quizzesPublished ?? d.quizzes ?? 0,
          avgQuizScore: d.avgQuizScore ?? d.averageScore ?? 0,
        });
      } else {
        // fallback demo so UI is never empty
        setStats({
          coursesCreated: 6,
          totalEnrollments: 142,
          quizzesPublished: 18,
          avgQuizScore: 76,
        });
      }

      // 3) My courses
      const coursesRes = await tryGet(
        [
          `${API_BASE}/api/instructor/courses`,
          `${API_BASE}/api/courses/mine`,
          `${API_BASE}/api/courses?mine=true`,
        ],
        { headers }
      );

      if (coursesRes.ok && coursesRes.data) {
        const list = Array.isArray(coursesRes.data)
          ? coursesRes.data
          : coursesRes.data.items || coursesRes.data.data || [];
        setCourses(list);
      } else {
        setCourses([
          {
            id: 1,
            title: "Ethics in Life and Pluralism",
            isPublished: true,
            students: 58,
            updatedAt: "2026-01-10",
          },
          {
            id: 2,
            title: "Final Year Project",
            isPublished: false,
            students: 34,
            updatedAt: "2026-01-06",
          },
          {
            id: 3,
            title: "Engineer Intern",
            isPublished: true,
            students: 50,
            updatedAt: "2026-01-02",
          },
        ]);
      }

      // 4) Recent quiz attempts
      const attemptsRes = await tryGet(
        [
          `${API_BASE}/api/instructor/quiz-attempts/recent`,
          `${API_BASE}/api/instructor/attempts`,
          `${API_BASE}/api/quizzes/attempts/recent`,
        ],
        { headers }
      );

      if (attemptsRes.ok && attemptsRes.data) {
        const list = Array.isArray(attemptsRes.data)
          ? attemptsRes.data
          : attemptsRes.data.items || attemptsRes.data.data || [];
        setAttempts(list);
      } else {
        setAttempts([
          {
            id: 1,
            student: "Student A",
            quiz: "Quiz 1",
            score: 8,
            total: 10,
            date: "2026-01-12",
          },
          {
            id: 2,
            student: "Student B",
            quiz: "Quiz 2",
            score: 6,
            total: 10,
            date: "2026-01-11",
          },
          {
            id: 3,
            student: "Student C",
            quiz: "Quiz 1",
            score: 4,
            total: 10,
            date: "2026-01-10",
          },
        ]);
      }

      setLoading(false);
    }

    load();
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    // keep fullName optional
    window.location.href = "/login";
  }

  const avgScoreLabel = `${Number(stats.avgQuizScore || 0).toFixed(0)}%`;

  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a
              className="nav-link"
              data-widget="pushmenu"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              <i className="fas fa-bars"></i>
            </a>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <a href="/" className="nav-link">
              Home
            </a>
          </li>
        </ul>

        <ul className="navbar-nav ml-auto">
          <li className="nav-item dropdown">
            <a
              className="nav-link"
              data-toggle="dropdown"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              <i className="fas fa-user-circle"></i> {displayName || "Instructor"}
            </a>
            <div className="dropdown-menu dropdown-menu-right">
              <button
                className="dropdown-item"
                type="button"
                onClick={() => alert("Profile page later")}
              >
                <i className="fas fa-user mr-2"></i> Profile
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" type="button" onClick={logout}>
                <i className="fas fa-sign-out-alt mr-2"></i> Logout
              </button>
            </div>
          </li>
        </ul>
      </nav>

      {/* Sidebar */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <a href="/instructor" className="brand-link">
          <i className="fas fa-graduation-cap mr-2"></i>
          <span className="brand-text font-weight-light">OnlineLearning</span>
        </a>

        <div className="sidebar">
          <div className="user-panel user-panel-clean">
            <div className="user-avatar">
              <i className="fas fa-user-circle"></i>
            </div>
            <div className="user-name">{displayName || "Instructor"}</div>
            {me.email ? (
              <small className="text-muted d-block">{me.email}</small>
            ) : null}
          </div>

          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
              <li className="nav-item">
                <a href="/instructor" className="nav-link active">
                  <i className="nav-icon fas fa-tachometer-alt"></i>
                  <p>Dashboard</p>
                </a>
              </li>

              <li className="nav-item">
                <a href="/instructor/courses" className="nav-link">
                  <i className="nav-icon fas fa-book"></i>
                  <p>My Courses</p>
                </a>
              </li>

              <li className="nav-item">
                <a href="/instructor/lessons" className="nav-link">
                  <i className="nav-icon fas fa-file-alt"></i>
                  <p>Lessons</p>
                </a>
              </li>

              <li className="nav-item">
                <a href="/instructor/question-bank" className="nav-link">
                  <i className="nav-icon fas fa-database"></i>
                  <p>Question Bank</p>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="content-wrapper">
        <section className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1>Instructor Dashboard</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item">
                    <a href="/instructor">Home</a>
                  </li>
                  <li className="breadcrumb-item active">Instructor Dashboard</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="content">
          <div className="container-fluid">
            {/* Loading */}
            {loading ? (
              <div className="card">
                <div className="card-body">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Loading dashboard...
                </div>
              </div>
            ) : null}

            {/* Stats boxes */}
            <div className="row">
              <div className="col-lg-3 col-6">
                <div className="small-box bg-info">
                  <div className="inner">
                    <h3>{stats.coursesCreated}</h3>
                    <p>Courses Created</p>
                  </div>
                  <div className="icon">
                    <i className="fas fa-book"></i>
                  </div>
                  <a href="/instructor/courses" className="small-box-footer">
                    Open Courses <i className="fas fa-arrow-circle-right"></i>
                  </a>
                </div>
              </div>

              <div className="col-lg-3 col-6">
                <div className="small-box bg-success">
                  <div className="inner">
                    <h3>{stats.totalEnrollments}</h3>
                    <p>Total Enrollments</p>
                  </div>
                  <div className="icon">
                    <i className="fas fa-user-graduate"></i>
                  </div>
                  <a href="/instructor/courses" className="small-box-footer">
                    View Enrollments <i className="fas fa-arrow-circle-right"></i>
                  </a>
                </div>
              </div>

              <div className="col-lg-3 col-6">
                <div className="small-box bg-warning">
                  <div className="inner">
                    <h3>{stats.quizzesPublished}</h3>
                    <p>Quizzes Published</p>
                  </div>
                  <div className="icon">
                    <i className="fas fa-question-circle"></i>
                  </div>
                  <a href="/instructor/quizzes" className="small-box-footer">
                    Manage Quizzes <i className="fas fa-arrow-circle-right"></i>
                  </a>
                </div>
              </div>

              <div className="col-lg-3 col-6">
                <div className="small-box bg-danger">
                  <div className="inner">
                    <h3>{avgScoreLabel}</h3>
                    <p>Average Quiz Score</p>
                  </div>
                  <div className="icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <a href="/instructor/reports" className="small-box-footer">
                    View Reports <i className="fas fa-arrow-circle-right"></i>
                  </a>
                </div>
              </div>
            </div>

            {/* Courses table */}
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h3 className="card-title mb-0">My Courses (Overview)</h3>
                    <div className="card-tools">
                      <a
                        href="/instructor/courses/create"
                        className="btn btn-sm btn-primary"
                      >
                        <i className="fas fa-plus"></i> Create Course
                      </a>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover">
                        <thead>
                          <tr>
                            <th>Course</th>
                            <th>Status</th>
                            <th>Students</th>
                            <th>Last Updated</th>
                            <th style={{ width: 260 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courses.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-muted">
                                No courses found.
                              </td>
                            </tr>
                          ) : (
                            courses.map((c) => {
                              const id = c.courseId ?? c.id ?? c.CourseId;
                              const title = c.title ?? c.name ?? c.Title ?? "Untitled";
                              const published =
                                c.isPublished ?? c.published ?? c.IsPublished ?? false;
                              const students =
                                c.students ?? c.enrollments ?? c.studentCount ?? 0;
                              const updatedAt =
                                c.updatedAt ??
                                c.lastUpdated ??
                                c.modifiedAt ??
                                c.createdAt ??
                                "";

                              return (
                                <tr key={id ?? title}>
                                  <td>{title}</td>
                                  <td>
                                    {published ? (
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
                                    {updatedAt
                                      ? String(updatedAt).slice(0, 10)
                                      : "-"}
                                  </td>
                                  <td>
                                    <a
                                      href={`/instructor/courses/${id}/edit`}
                                      className="btn btn-sm btn-info mr-2"
                                    >
                                      <i className="fas fa-edit"></i> Edit
                                    </a>
                                    <a
                                      href={`/instructor/courses/${id}/lessons`}
                                      className="btn btn-sm btn-secondary mr-2"
                                    >
                                      <i className="fas fa-file-alt"></i> Lessons
                                    </a>
                                    <a
                                      href={`/instructor/courses/${id}/quizzes`}
                                      className="btn btn-sm btn-warning"
                                    >
                                      <i className="fas fa-question-circle"></i>{" "}
                                      Quizzes
                                    </a>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <small className="text-muted">
                      Note: If your backend endpoints are not ready, the dashboard
                      shows demo data so the UI is never empty.
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent attempts + Quick actions */}
            <div className="row">
              <div className="col-lg-6">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Recent Quiz Attempts</h3>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Quiz</th>
                            <th>Score</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attempts.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">
                                No attempts yet.
                              </td>
                            </tr>
                          ) : (
                            attempts.map((a) => {
                              const score = a.score ?? a.Score ?? 0;
                              const total = a.total ?? a.Total ?? 10;
                              const pct = total
                                ? Math.round((score / total) * 100)
                                : 0;

                              let badge = "badge-success";
                              if (pct < 60) badge = "badge-danger";
                              else if (pct < 75) badge = "badge-warning";

                              return (
                                <tr
                                  key={
                                    a.id ??
                                    `${a.student}-${a.quiz}-${a.date}`
                                  }
                                >
                                  <td>
                                    {a.student ??
                                      a.studentName ??
                                      a.Student ??
                                      "Student"}
                                  </td>
                                  <td>{a.quiz ?? a.quizTitle ?? a.Quiz ?? "Quiz"}</td>
                                  <td>
                                    <span className={`badge ${badge}`}>
                                      {score}/{total}
                                    </span>
                                  </td>
                                  <td>
                                    {(a.date ?? a.createdAt ?? a.Date ?? "")
                                      .toString()
                                      .slice(0, 10) || "-"}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <small className="text-muted">
                      In the real version this comes from your instructor attempts
                      endpoint.
                    </small>
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Quick Actions</h3>
                  </div>
                  <div className="card-body">
                    <a
                      href="/instructor/courses/create"
                      className="btn btn-primary btn-block"
                    >
                      <i className="fas fa-plus"></i> Create New Course
                    </a>
                    <a
                      href="/instructor/question-bank"
                      className="btn btn-info btn-block"
                    >
                      <i className="fas fa-database"></i> Manage Question Banks
                    </a>
                    <a
                      href="/instructor/quizzes"
                      className="btn btn-warning btn-block"
                    >
                      <i className="fas fa-question-circle"></i> Create / Edit
                      Quizzes
                    </a>
                    <button
                      className="btn btn-outline-secondary btn-block"
                      type="button"
                      onClick={logout}
                    >
                      <i className="fas fa-sign-out-alt"></i> Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="main-footer">
        <strong>OnlineLearningPlatform</strong> Frontend
      </footer>
    </div>
  );
}
