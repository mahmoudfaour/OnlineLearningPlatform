import React, { useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";
import { useNavigate } from "react-router-dom";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://localhost:5001";

function headers() {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : {};
}

export default function CreateCourse() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (saving) return;

    setErr("");
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/api/Courses`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to create course.");
      }

      // ✅ Go back to courses list + show a green success message
      nav("/instructor/courses", {
        state: {
          flash: {
            type: "success",
            message: "Course created successfully ✅",
          },
        },
        replace: true,
      });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="Create Course"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "My Courses", to: "/instructor/courses" },
        { label: "Create", active: true },
      ]}
    >
      {err ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2" />
          {err}
        </div>
      ) : null}

      <div className="card">
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Title</label>
              <input
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
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
              {saving ? "Saving..." : "Create"}
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
    </DashboardLayout>
  );
}
