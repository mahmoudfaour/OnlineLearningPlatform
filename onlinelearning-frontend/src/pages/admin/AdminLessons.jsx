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

export default function AdminLessons() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [lessons, setLessons] = useState([]);

  // Frontend role guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) return (window.location.href = "/login");
    if (role !== "Admin") return (window.location.href = "/");
  }, []);

  async function loadCourses() {
    const res = await fetch(`${API_BASE}/api/Courses`, { headers: authHeadersOnly() }); // Admin get all
    const data = await readJson(res);
    const list = Array.isArray(data) ? data : [];
    setCourses(list);
    if (list.length > 0 && !selectedCourseId) setSelectedCourseId(String(list[0].id ?? list[0].Id));
  }

  async function loadLessons(courseId) {
    if (!courseId) return;
    // ✅ You need an endpoint like: GET /api/courses/{courseId}/lessons (Admin allowed)
    const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons`, {
      headers: authHeadersOnly(),
    });
    const data = await readJson(res);
    setLessons(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        await loadCourses();
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        await loadLessons(selectedCourseId);
      } catch (e) {
        setErr(String(e?.message || e));
        setLessons([]);
      }
    })();
  }, [selectedCourseId]);

  const selectedCourse = useMemo(() => {
    const idNum = Number(selectedCourseId);
    return courses.find((c) => (c.id ?? c.Id) === idNum) || null;
  }, [courses, selectedCourseId]);

  async function deleteLesson(lesson) {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;

    try {
      // ✅ You need: DELETE /api/lessons/{id} (Admin allowed)
      const res = await fetch(`${API_BASE}/api/lessons/${lesson.id}`, {
        method: "DELETE",
        headers: authHeadersOnly(),
      });
      if (!res.ok) throw new Error(await res.text());

      await loadLessons(selectedCourseId);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Admin"
      sidebarItems={adminSidebarItems}
      title="Lessons (Admin)"
      breadcrumb={[
        { label: "Home", to: "/admin/dashboard" },
        { label: "Lessons", active: true },
      ]}
    >
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

      {/* Course selector */}
      <div className="card">
        <div className="card-body d-flex flex-wrap align-items-end" style={{ gap: 12 }}>
          <div style={{ minWidth: 280 }}>
            <label className="mb-1">Select course</label>
            <select
              className="form-control"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.length === 0 ? (
                <option value="">No courses found</option>
              ) : (
                courses.map((c) => {
                  const id = c.id ?? c.Id;
                  const title = c.title ?? c.Title ?? `Course #${id}`;
                  return (
                    <option key={id} value={id}>
                      #{id} — {title}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {selectedCourse ? (
            <small className="text-muted d-block w-100 mt-2">
              Course status:{" "}
              {selectedCourse.isPublished ?? selectedCourse.IsPublished ? (
                <span className="badge badge-success">Published</span>
              ) : (
                <span className="badge badge-warning">Unpublished</span>
              )}
            </small>
          ) : null}
        </div>
      </div>

      {/* Lessons table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">
            Lessons {selectedCourse ? `— ${selectedCourse.title ?? selectedCourse.Title}` : ""}
          </h3>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Order</th>
                <th>Title</th>
                <th style={{ width: 140 }}>Type</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lessons.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    No lessons found.
                  </td>
                </tr>
              ) : (
                lessons.map((l) => (
                  <tr key={l.id}>
                    <td>{l.orderIndex}</td>
                    <td>{l.title}</td>
                    <td>
                      <span className="badge badge-info">{l.lessonType}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        type="button"
                        onClick={() => deleteLesson(l)}
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
            Requires: Admin allowed on GET /api/courses/{`{courseId}`}/lessons and DELETE
            /api/lessons/{`{id}`}.
          </small>
        </div>
      </div>
    </DashboardLayout>
  );
}
