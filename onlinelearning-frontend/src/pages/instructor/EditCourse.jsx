import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://localhost:5001";

function headers() {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : {};
}

export default function EditCourse() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/Courses/manage/${id}`, {
        headers: headers(),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setTitle(data.title || "");
      setDescription(data.description || "");
      setIsPublished(!!data.isPublished);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/Courses/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) throw new Error(await res.text());

      nav("/instructor/courses", {
        state: {
          flash: { type: "success", message: "Course updated successfully ✅" },
        },
        replace: true,
      });
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    const endpoint = isPublished ? "unpublish" : "publish";

    try {
      const res = await fetch(`${API_BASE}/api/Courses/${id}/${endpoint}`, {
        method: "PATCH",
        headers: headers(),
      });

      if (!res.ok) throw new Error(await res.text());

      await load(); // refresh
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="Edit Course"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "My Courses", to: "/instructor/courses" },
        { label: "Edit", active: true },
      ]}
    >
      {loading ? (
        <div className="card">
          <div className="card-body">
            <i className="fas fa-spinner fa-spin mr-2" /> Loading...
          </div>
        </div>
      ) : err ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2" />
          {err}
        </div>
      ) : (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title mb-0">Course #{id}</h3>

            <button
              type="button"
              onClick={togglePublish}
              className={`btn btn-sm ${
                isPublished ? "btn-outline-warning" : "btn-success"
              }`}
            >
              {isPublished ? "Unpublish" : "Publish"}
            </button>
          </div>

          <div className="card-body">
            <form onSubmit={save}>
              <div className="form-group">
                <label>Title</label>
                <input
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows="5"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <button className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary ml-2"
                onClick={() => nav("/instructor/courses")}
                disabled={saving}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
