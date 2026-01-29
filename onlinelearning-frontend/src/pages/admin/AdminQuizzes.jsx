// File: src/pages/admin/AdminQuizzes.jsx
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { adminSidebarItems } from "../../config/adminSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "https://localhost:5001";

function authHeadersOnly() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  return text ? JSON.parse(text) : null;
}

export default function AdminQuizzes() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("ALL");

  const [quizzes, setQuizzes] = useState([]);
  const [banks, setBanks] = useState([]);

  // role guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) return (window.location.href = "/login");
    if (role !== "Admin") return (window.location.href = "/");
  }, []);

  async function loadCourses() {
    const res = await fetch(`${API_BASE}/api/Courses`, { headers: authHeadersOnly() });
    const data = await readJson(res);
    return Array.isArray(data) ? data : [];
  }

  async function loadBanks() {
    const res = await fetch(`${API_BASE}/api/QuestionBanks`, { headers: authHeadersOnly() });
    const data = await readJson(res);
    return Array.isArray(data) ? data : [];
  }

  async function loadQuizzesForCourse(courseId) {
    const res = await fetch(`${API_BASE}/api/courses/${courseId}/quizzes`, {
      headers: authHeadersOnly(),
    });
    const data = await readJson(res);
    return Array.isArray(data) ? data : [];
  }

  async function loadAll() {
    setLoading(true);
    setErr("");

    try {
      const [coursesData, banksData] = await Promise.all([loadCourses(), loadBanks()]);

      setCourses(coursesData);
      setBanks(banksData);

      // ✅ quizzes: no "get all" endpoint → load by course
      let quizzesAll = [];

      if (selectedCourseId !== "ALL") {
        const list = await loadQuizzesForCourse(Number(selectedCourseId));
        quizzesAll = list.map((q) => ({ ...q, _courseId: q.courseId }));
      } else {
        // load quizzes for each course in parallel
        const results = await Promise.all(
          coursesData.map((c) => loadQuizzesForCourse(c.id))
        );

        quizzesAll = results
          .flat()
          .map((q) => ({ ...q, _courseId: q.courseId }));
      }

      // sort newest first (CreatedAt)
      quizzesAll.sort((a, b) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
      );

      setQuizzes(quizzesAll);
    } catch (e) {
      setErr(String(e?.message || e));
      setCourses([]);
      setBanks([]);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }

  // reload when course filter changes
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  async function deleteQuiz(q) {
    const title = q.title ?? "Quiz";
    if (!confirm(`Delete quiz "${title}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${q.id}`, {
        method: "DELETE",
        headers: authHeadersOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadAll();
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  async function deleteBank(b) {
    const label = `Bank #${b.id} (Source: ${b.sourceType ?? "—"})`;
    if (!confirm(`Delete question bank: ${label}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/QuestionBanks/${b.id}`, {
        method: "DELETE",
        headers: authHeadersOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadAll();
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  const courseTitleById = useMemo(() => {
    const map = new Map();
    for (const c of courses) map.set(c.id, c.title);
    return map;
  }, [courses]);

  return (
    <DashboardLayout
      navbarRoleLabel="Admin"
      sidebarItems={adminSidebarItems}
      title="Quizzes & Question Bank (Admin)"
      breadcrumb={[
        { label: "Home", to: "/admin/dashboard" },
        { label: "Quizzes & Bank", active: true },
      ]}
    >
      {/* Filters */}
      <div className="card">
        <div className="card-body d-flex flex-wrap align-items-end" style={{ gap: 12 }}>
          <div style={{ minWidth: 260 }}>
            <label className="mb-1">Filter quizzes by course</label>
            <select
              className="form-control"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="ALL">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  #{c.id} — {c.title}
                </option>
              ))}
            </select>
            <small className="text-muted">
              Quizzes are loaded via <b>/api/courses/{`{courseId}`}/quizzes</b>
            </small>
          </div>

          <div className="ml-auto">
            <button className="btn btn-outline-primary" type="button" onClick={loadAll}>
              <i className="fas fa-sync-alt mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="card-body">
            <i className="fas fa-spinner fa-spin mr-2" /> Loading...
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2" />
          {err}
        </div>
      ) : null}

      {/* Quizzes */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title mb-0">All Quizzes</h3>
          <span className="text-muted">{quizzes.length} quizzes</span>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: 80 }}>#</th>
                <th>Title</th>
                <th style={{ width: 220 }}>Course</th>
                <th style={{ width: 100 }}>Final</th>
                <th style={{ width: 160 }}>Created</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted">
                    No quizzes found.
                  </td>
                </tr>
              ) : (
                quizzes.map((q) => {
                  const courseId = q.courseId ?? q._courseId;
                  const courseTitle = courseTitleById.get(courseId) || `Course #${courseId}`;

                  return (
                    <tr key={q.id}>
                      <td>{q.id}</td>
                      <td>{q.title ?? "—"}</td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="text-muted">#{courseId}</span>
                          <span>{courseTitle}</span>
                        </div>
                      </td>
                      <td>
                        {q.isFinal ? (
                          <span className="badge badge-danger">Final</span>
                        ) : (
                          <span className="badge badge-secondary">No</span>
                        )}
                      </td>
                      <td>{q.createdAt ? new Date(q.createdAt).toLocaleString() : "—"}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          type="button"
                          onClick={() => deleteQuiz(q)}
                        >
                          <i className="fas fa-trash mr-1" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <small className="text-muted">
            Uses: <b>GET /api/Courses</b>, <b>GET /api/courses/{`{courseId}`}/quizzes</b>,{" "}
            <b>DELETE /api/quizzes/{`{id}`}</b>
          </small>
        </div>
      </div>

      {/* Question Banks */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title mb-0">Question Banks</h3>
          <span className="text-muted">{banks.length} banks</span>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: 80 }}>#</th>
                <th>Source / Owner</th>
                <th style={{ width: 130 }}>CourseId</th>
                <th style={{ width: 130 }}>LessonId</th>
                <th style={{ width: 170 }}>Created</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {banks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted">
                    No banks found.
                  </td>
                </tr>
              ) : (
                banks.map((b) => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td>
                      <div className="d-flex flex-column">
                        <span>
                          <b>Source:</b> {b.sourceType ?? "—"}
                        </span>
                        <span className="text-muted">
                          <b>UserId:</b> {b.userId ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td>{b.courseId ?? "—"}</td>
                    <td>{b.lessonId ?? "—"}</td>
                    <td>{b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        type="button"
                        onClick={() => deleteBank(b)}
                      >
                        <i className="fas fa-trash mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <small className="text-muted">
            Uses: <b>GET /api/QuestionBanks</b>, <b>DELETE /api/QuestionBanks/{`{id}`}</b>
          </small>
        </div>
      </div>
    </DashboardLayout>
  );
}
