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

export default function QuestionBanks() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [banks, setBanks] = useState([]);

  // create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    userId: "", // IMPORTANT: we will set it from localStorage userId or token-based if you store it
    courseId: "",
    lessonId: "",
    sourceType: "Manual",
  });

  // you likely store userId in localStorage from login response
  const storedUserId = useMemo(() => {
    const v = localStorage.getItem("userId");
    return v ? Number(v) : null;
  }, []);

  const loadBanks = useCallback(async () => {
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/QuestionBanks`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setBanks(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setBanks([]);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadBanks();
      setLoading(false);
    }
    init();
  }, [loadBanks]);

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function openCreate() {
    setForm({
      userId: storedUserId ? String(storedUserId) : "",
      courseId: "",
      lessonId: "",
      sourceType: "Manual",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function createBank(e) {
    e.preventDefault();

    const userId = Number(form.userId || storedUserId || 0);
    if (!userId) return alert("UserId is required (store userId in localStorage after login).");

    const payload = {
      userId,
      courseId: form.courseId ? Number(form.courseId) : null,
      lessonId: form.lessonId ? Number(form.lessonId) : null,
      sourceType: form.sourceType,
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/QuestionBanks`, {
        method: "POST",
        headers: headersJson(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      closeModal();
      await loadBanks();
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteBank(b) {
    if (!confirm(`Delete Question Bank #${b.id}? This will remove all its questions.`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/QuestionBanks/${b.id}`, {
        method: "DELETE",
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadBanks();
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="Question Banks"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "Question Banks", active: true },
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

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title mb-0">All Banks</h3>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="fas fa-plus mr-1" /> Create Bank
          </button>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th style={{ width: 100 }}>User</th>
                <th style={{ width: 120 }}>Course</th>
                <th style={{ width: 120 }}>Lesson</th>
                <th style={{ width: 140 }}>Source</th>
                <th style={{ width: 140 }}>Created</th>
                <th style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted">
                    No banks yet.
                  </td>
                </tr>
              ) : (
                banks.map((b) => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td>{b.userId}</td>
                    <td>{b.courseId ?? "-"}</td>
                    <td>{b.lessonId ?? "-"}</td>
                    <td>
                      <span className="badge badge-info">{b.sourceType}</span>
                    </td>
                    <td>{String(b.createdAt || "").slice(0, 10) || "-"}</td>
                    <td>
                      <Link
                        to={`/instructor/question-banks/${b.id}/questions`}
                        className="btn btn-sm btn-secondary mr-2"
                      >
                        <i className="fas fa-list mr-1" /> Questions
                      </Link>

                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteBank(b)}
                      >
                        <i className="fas fa-trash" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <small className="text-muted">
            Uses: GET/POST/DELETE /api/QuestionBanks
          </small>
        </div>
      </div>

      {/* Create modal */}
      {modalOpen ? (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Question Bank</h5>
                <button type="button" className="close" onClick={closeModal}>
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={createBank}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>UserId</label>
                    <input
                      className="form-control"
                      value={form.userId}
                      onChange={(e) => setField("userId", e.target.value)}
                      placeholder="Must be your instructor userId"
                      required
                    />
                    <small className="text-muted">
                      Backend requires UserId. Best practice: store it from login in localStorage as "userId".
                    </small>
                  </div>

                  <div className="form-group">
                    <label>CourseId (optional)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.courseId}
                      onChange={(e) => setField("courseId", e.target.value)}
                      placeholder="ex: 5"
                    />
                  </div>

                  <div className="form-group">
                    <label>LessonId (optional)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.lessonId}
                      onChange={(e) => setField("lessonId", e.target.value)}
                      placeholder="ex: 12"
                    />
                  </div>

                  <div className="form-group">
                    <label>SourceType</label>
                    <input
                      className="form-control"
                      value={form.sourceType}
                      onChange={(e) => setField("sourceType", e.target.value)}
                      placeholder="Manual / AI / Imported ..."
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Creating..." : "Create"}
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
