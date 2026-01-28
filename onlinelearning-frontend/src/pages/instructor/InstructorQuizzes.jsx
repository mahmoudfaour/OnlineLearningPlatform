import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "https://localhost:5001";

function headersJson() {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : {};
}
function headersAuthOnly() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function InstructorQuizzes() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [quizzes, setQuizzes] = useState([]);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);

  const [form, setForm] = useState({
    title: "",
    lessonId: "", // optional
    passingScorePercent: 60,
    timeLimitSeconds: 900,
    isFinal: false,
  });

  // ✅ course object safe lookup (id OR Id)
  const selectedCourse = useMemo(() => {
    const idNum = Number(selectedCourseId);
    return courses.find((c) => (c.id ?? c.Id) === idNum) || null;
  }, [courses, selectedCourseId]);

  const loadCourses = useCallback(async () => {
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/Courses/mine`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCourses(list);

      // ✅ auto-select first course safely (id OR Id)
      if (list.length > 0 && !selectedCourseId) {
        const firstId = list[0].id ?? list[0].Id;
        if (firstId) setSelectedCourseId(String(firstId));
      }
    } catch (e) {
      setErr(String(e?.message || e));
      setCourses([]);
    }
  }, [selectedCourseId]);

  const loadQuizzes = useCallback(async (courseId) => {
    if (!courseId) return;
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/quizzes`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setQuizzes([]);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadCourses();
      setLoading(false);
    }
    init();
  }, [loadCourses]);

  useEffect(() => {
    if (selectedCourseId) loadQuizzes(selectedCourseId);
  }, [selectedCourseId, loadQuizzes]);

  function openCreateModal() {
    setEditingQuiz(null);
    setForm({
      title: "",
      lessonId: "",
      passingScorePercent: 60,
      timeLimitSeconds: 900,
      isFinal: false,
    });
    setModalOpen(true);
  }

  function openEditModal(q) {
    setEditingQuiz(q);
    setForm({
      title: q.title || q.Title || "",
      lessonId: q.lessonId ?? q.LessonId ?? "",
      passingScorePercent: q.passingScorePercent ?? q.PassingScorePercent ?? 60,
      timeLimitSeconds: q.timeLimitSeconds ?? q.TimeLimitSeconds ?? 900,
      isFinal: !!(q.isFinal ?? q.IsFinal),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingQuiz(null);
  }

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function saveQuiz(e) {
    e.preventDefault();
    if (!selectedCourseId) return alert("Select a course first.");
    if (!form.title.trim()) return alert("Title is required.");

    const payload = {
      courseId: Number(selectedCourseId),
      lessonId: form.lessonId ? Number(form.lessonId) : null,
      title: form.title.trim(),
      passingScorePercent: Number(form.passingScorePercent),
      timeLimitSeconds: Number(form.timeLimitSeconds),
      isFinal: !!form.isFinal,
    };

    try {
      if (editingQuiz) {
        const quizId = editingQuiz.id ?? editingQuiz.Id;
        const res = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
          method: "PUT",
          headers: headersJson(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch(`${API_BASE}/api/quizzes`, {
          method: "POST",
          headers: headersJson(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      }

      closeModal();
      await loadQuizzes(selectedCourseId);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  async function deleteQuiz(q) {
    const quizId = q.id ?? q.Id;
    const title = q.title ?? q.Title ?? "this quiz";

    if (!confirm(`Delete quiz "${title}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
        method: "DELETE",
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadQuizzes(selectedCourseId);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="Quizzes"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "Quizzes", active: true },
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

      {/* Course select */}
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
                  const courseId = c.id ?? c.Id;
                  const title = c.title ?? c.Title ?? "Untitled";
                  return (
                    <option key={courseId} value={courseId}>
                      #{courseId} — {title}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <div className="ml-auto">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateModal}
              disabled={!selectedCourseId}
            >
              <i className="fas fa-plus mr-2" />
              Create Quiz
            </button>
          </div>

          {selectedCourse ? (
            <small className="text-muted d-block w-100 mt-2">
              Course status:{" "}
              {(selectedCourse.isPublished ?? selectedCourse.IsPublished) ? (
                <span className="badge badge-success">Published</span>
              ) : (
                <span className="badge badge-warning">Unpublished</span>
              )}
            </small>
          ) : null}
        </div>
      </div>

      {/* Quizzes table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">
            Quizzes{" "}
            {selectedCourse ? `— ${selectedCourse.title ?? selectedCourse.Title}` : ""}
          </h3>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th>Title</th>
                <th style={{ width: 120 }}>Final</th>
                <th style={{ width: 150 }}>Passing</th>
                <th style={{ width: 150 }}>Time Limit</th>
                <th style={{ width: 320 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {quizzes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted">
                    No quizzes yet.
                  </td>
                </tr>
              ) : (
                quizzes.map((q) => {
                  const quizId = q.id ?? q.Id;
                  const title = q.title ?? q.Title ?? "Untitled";
                  const isFinal = !!(q.isFinal ?? q.IsFinal);
                  const pass = q.passingScorePercent ?? q.PassingScorePercent ?? 0;
                  const limit = q.timeLimitSeconds ?? q.TimeLimitSeconds ?? 0;

                  return (
                    <tr key={quizId}>
                      <td>{quizId}</td>
                      <td>{title}</td>
                      <td>
                        {isFinal ? (
                          <span className="badge badge-danger">Final</span>
                        ) : (
                          <span className="badge badge-secondary">No</span>
                        )}
                      </td>
                      <td>{pass}%</td>
                      <td>{limit}s</td>
                      <td>
                        <Link
                          to={`/instructor/quizzes/${quizId}/questions`}
                          className="btn btn-sm btn-secondary mr-2"
                        >
                          <i className="fas fa-list mr-1" />
                          Questions
                        </Link>

                        <button
                          type="button"
                          className="btn btn-sm btn-info mr-2"
                          onClick={() => openEditModal(q)}
                        >
                          <i className="fas fa-edit" /> Edit
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => deleteQuiz(q)}
                        >
                          <i className="fas fa-trash" /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <small className="text-muted">
            Uses: GET /api/courses/{`{courseId}`}/quizzes, POST/PUT/DELETE /api/quizzes
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
                <h5 className="modal-title">
                  {editingQuiz ? "Edit Quiz" : "Create Quiz"}
                </h5>
                <button type="button" className="close" onClick={closeModal}>
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={saveQuiz}>
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

                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label>Passing Score (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.passingScorePercent}
                        onChange={(e) => setField("passingScorePercent", e.target.value)}
                        min={0}
                        max={100}
                        required
                      />
                    </div>

                    <div className="form-group col-md-4">
                      <label>Time Limit (seconds)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.timeLimitSeconds}
                        onChange={(e) => setField("timeLimitSeconds", e.target.value)}
                        min={0}
                        required
                      />
                    </div>

                    <div className="form-group col-md-4">
                      <label>Lesson ID (optional)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.lessonId}
                        onChange={(e) => setField("lessonId", e.target.value)}
                        placeholder="Leave empty if not linked"
                      />
                    </div>
                  </div>

                  <div className="form-check">
                    <input
                      id="isFinal"
                      type="checkbox"
                      className="form-check-input"
                      checked={form.isFinal}
                      onChange={(e) => setField("isFinal", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="isFinal">
                      This is a Final Quiz
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingQuiz ? "Save Changes" : "Create Quiz"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
