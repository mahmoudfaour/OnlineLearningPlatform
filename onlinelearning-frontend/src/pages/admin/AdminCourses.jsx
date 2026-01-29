// File: src/pages/admin/AdminCourses.jsx
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { adminSidebarItems } from "../../config/adminSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "https://localhost:5001";

function authHeaders(json = false) {
  const token = localStorage.getItem("token");
  const h = token ? { Authorization: `Bearer ${token}` } : {};
  return json ? { ...h, "Content-Type": "application/json" } : h;
}

async function readTextOrJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  return text ? JSON.parse(text) : null;
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

export default function AdminCourses() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [courses, setCourses] = useState([]);

  // UI state
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All | Published | Unpublished
  const [sortBy, setSortBy] = useState("Newest"); // Newest | Oldest | Title

  // Modal (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // course object or null
  const [form, setForm] = useState({
    title: "",
    description: "",
  });

  // Auth guard (Admin only)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (role && role !== "Admin") {
      window.location.href =
        role === "Student"
          ? "/student/dashboard"
          : role === "Instructor"
          ? "/instructor/dashboard"
          : "/";
    }
  }, []);

  async function loadCourses() {
    setLoading(true);
    setErr("");

    try {
      // Admin endpoint
      const res = await fetch(`${API_BASE}/api/Courses`, {
        headers: authHeaders(false),
      });
      const data = await readTextOrJson(res);
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      setCourses([]);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  const stats = useMemo(() => {
    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => c.isPublished ?? c.IsPublished).length;
    const unpublishedCourses = totalCourses - publishedCourses;

    // Optional: total instructors (based on UserId/CreatedByUserId)
    const instructorIds = new Set(
      courses
        .map((c) => c.userId ?? c.UserId ?? c.createdByUserId ?? c.CreatedByUserId)
        .filter((x) => x != null)
    );

    return {
      totalCourses,
      publishedCourses,
      unpublishedCourses,
      uniqueInstructors: instructorIds.size,
    };
  }, [courses]);

  const filtered = useMemo(() => {
    let list = [...courses];

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const title = String(c.title ?? c.Title ?? "").toLowerCase();
        const desc = String(c.description ?? c.Description ?? "").toLowerCase();
        const idStr = String(c.id ?? c.Id ?? "");
        return title.includes(q) || desc.includes(q) || idStr.includes(q);
      });
    }

    if (statusFilter !== "All") {
      const wantPublished = statusFilter === "Published";
      list = list.filter((c) => Boolean(c.isPublished ?? c.IsPublished) === wantPublished);
    }

    if (sortBy === "Newest") {
      list.sort((a, b) =>
        String(b.createdAt ?? b.CreatedAt ?? "").localeCompare(String(a.createdAt ?? a.CreatedAt ?? ""))
      );
    } else if (sortBy === "Oldest") {
      list.sort((a, b) =>
        String(a.createdAt ?? a.CreatedAt ?? "").localeCompare(String(b.createdAt ?? b.CreatedAt ?? ""))
      );
    } else if (sortBy === "Title") {
      list.sort((a, b) =>
        String(a.title ?? a.Title ?? "").localeCompare(String(b.title ?? b.Title ?? ""))
      );
    }

    return list;
  }, [courses, query, statusFilter, sortBy]);

  function openCreateModal() {
    setEditing(null);
    setForm({ title: "", description: "" });
    setModalOpen(true);
  }

  function openEditModal(course) {
    setEditing(course);
    setForm({
      title: course.title ?? course.Title ?? "",
      description: course.description ?? course.Description ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function saveCourse(e) {
    e.preventDefault();
    setErr("");

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      alert("Title is required.");
      return;
    }

    try {
      if (editing) {
        const id = editing.id ?? editing.Id;

        const res = await fetch(`${API_BASE}/api/Courses/${id}`, {
          method: "PUT",
          headers: authHeaders(true),
          body: JSON.stringify({ title, description }),
        });

        await readTextOrJson(res);
      } else {
        const res = await fetch(`${API_BASE}/api/Courses`, {
          method: "POST",
          headers: authHeaders(true),
          body: JSON.stringify({ title, description }),
        });

        await readTextOrJson(res);
      }

      closeModal();
      await loadCourses();
    } catch (e2) {
      alert(String(e2?.message || e2));
    }
  }

  async function togglePublish(course) {
    const id = course.id ?? course.Id;
    const isPublished = Boolean(course.isPublished ?? course.IsPublished);

    try {
      const endpoint = isPublished ? "unpublish" : "publish";
      const res = await fetch(`${API_BASE}/api/Courses/${id}/${endpoint}`, {
        method: "PATCH",
        headers: authHeaders(false),
      });

      // PATCH returns NoContent, but some servers return empty
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      await loadCourses();
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  async function deleteCourse(course) {
    const id = course.id ?? course.Id;
    const title = course.title ?? course.Title ?? `#${id}`;

    if (!confirm(`Delete course "${title}"?\nThis cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/Courses/${id}`, {
        method: "DELETE",
        headers: authHeaders(false),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }

      await loadCourses();
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  return (
    <DashboardLayout
      brandText="OnlineLearning"
      navbarRoleLabel="Admin"
      sidebarItems={adminSidebarItems}
      title="Courses Management"
      breadcrumb={[
        { label: "Home", to: "/admin/dashboard" },
        { label: "Courses", active: true },
      ]}
    >
      {loading ? (
        <div className="card">
          <div className="card-body">
            <i className="fas fa-spinner fa-spin mr-2" />
            Loading courses...
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
              value={stats.totalCourses}
              label="Total Courses"
              icon="fas fa-book"
            />
            <StatBox
              color="bg-success"
              value={stats.publishedCourses}
              label="Published"
              icon="fas fa-bullhorn"
            />
            <StatBox
              color="bg-warning"
              value={stats.unpublishedCourses}
              label="Unpublished"
              icon="fas fa-eye-slash"
            />
            <StatBox
              color="bg-danger"
              value={stats.uniqueInstructors}
              label="Unique Instructors"
              icon="fas fa-chalkboard-teacher"
            />
          </div>

          {/* Filters */}
          <div className="card">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-end" style={{ gap: 12 }}>
                <div style={{ minWidth: 260 }}>
                  <label className="mb-1">Search</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by title/description/id..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="input-group-append">
                      <button className="btn btn-primary" type="button" onClick={() => {}}>
                        <i className="fas fa-search" />
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ minWidth: 200 }}>
                  <label className="mb-1">Status</label>
                  <select
                    className="form-control"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Published">Published</option>
                    <option value="Unpublished">Unpublished</option>
                  </select>
                </div>

                <div style={{ minWidth: 200 }}>
                  <label className="mb-1">Sort</label>
                  <select
                    className="form-control"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="Newest">Newest</option>
                    <option value="Oldest">Oldest</option>
                    <option value="Title">Title (A-Z)</option>
                  </select>
                </div>

                <div className="ml-auto">
                  <button type="button" className="btn btn-primary" onClick={openCreateModal}>
                    <i className="fas fa-plus mr-2" />
                    Create Course
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title mb-0">Courses</h3>
              <div className="card-tools">
                <span className="text-muted">{filtered.length} courses</span>
              </div>
            </div>

            <div className="card-body table-responsive">
              <table className="table table-bordered table-hover">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>#</th>
                    <th>Title</th>
                    <th>Description</th>
                    <th style={{ width: 130 }}>Status</th>
                    <th style={{ width: 120 }}>InstructorId</th>
                    <th style={{ width: 240 }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        No courses found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => {
                      const id = c.id ?? c.Id;
                      const title = c.title ?? c.Title ?? "Untitled";
                      const desc = c.description ?? c.Description ?? "";
                      const isPublished = Boolean(c.isPublished ?? c.IsPublished);
                      const instructorId = c.userId ?? c.UserId ?? c.createdByUserId ?? c.CreatedByUserId;

                      return (
                        <tr key={id}>
                          <td>{id}</td>
                          <td>{title}</td>
                          <td style={{ maxWidth: 420 }}>
                            <span style={{ display: "inline-block", maxWidth: 420, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {desc}
                            </span>
                          </td>
                          <td>
                            {isPublished ? (
                              <span className="badge badge-success">Published</span>
                            ) : (
                              <span className="badge badge-warning">Unpublished</span>
                            )}
                          </td>
                          <td>{instructorId ?? "—"}</td>
                          <td>
                            <div className="d-flex" style={{ gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-info"
                                onClick={() => openEditModal(c)}
                              >
                                <i className="fas fa-edit" /> Edit
                              </button>

                              <button
                                type="button"
                                className={`btn btn-sm ${isPublished ? "btn-secondary" : "btn-success"}`}
                                onClick={() => togglePublish(c)}
                              >
                                <i className={`fas ${isPublished ? "fa-eye-slash" : "fa-bullhorn"}`} />{" "}
                                {isPublished ? "Unpublish" : "Publish"}
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => deleteCourse(c)}
                              >
                                <i className="fas fa-trash" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <small className="text-muted d-block mt-2">
                Uses: GET /api/Courses (Admin), POST /api/Courses, PUT /api/Courses/{`{id}`}, PATCH
                /api/Courses/{`{id}`}/publish|unpublish, DELETE /api/Courses/{`{id}`}.
              </small>
            </div>
          </div>

          {/* Modal */}
          {modalOpen ? (
            <div
              className="modal fade show"
              style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
              role="dialog"
              aria-modal="true"
            >
              <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">{editing ? "Edit Course" : "Create Course"}</h5>
                    <button type="button" className="close" onClick={closeModal}>
                      <span>&times;</span>
                    </button>
                  </div>

                  <form onSubmit={saveCourse}>
                    <div className="modal-body">
                      <div className="form-group">
                        <label>Title</label>
                        <input
                          className="form-control"
                          value={form.title}
                          onChange={(e) => setField("title", e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          className="form-control"
                          rows={5}
                          value={form.description}
                          onChange={(e) => setField("description", e.target.value)}
                        />
                      </div>

                      <small className="text-muted">
                        Note: Creating/Editing ignores instructor assignment in your current backend.
                        Course owner comes from the token user.
                      </small>
                    </div>

                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={closeModal}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {editing ? "Save Changes" : "Create"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </DashboardLayout>
  );
}
