import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://localhost:5001";

function headers() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function CourseEnrollments() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/Courses/${id}/enrollments`, {
        headers: headers(),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="Course Enrollments"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "My Courses", to: "/instructor/courses" },
        { label: "Enrollments", active: true },
      ]}
    >
      <div className="mb-3">
        <Link to="/instructor/courses" className="btn btn-outline-secondary btn-sm">
          <i className="fas fa-arrow-left mr-1" />
          Back to Courses
        </Link>
      </div>

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
          <div className="card-header">
            <h3 className="card-title mb-0">Enrollments for Course #{id}</h3>
          </div>

          <div className="card-body table-responsive">
            <table className="table table-bordered table-hover">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Enrolled At</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      No enrollments yet.
                    </td>
                  </tr>
                ) : (
                  items.map((e) => (
                    <tr key={e.id}>
                      <td>{e.studentName || "—"}</td>
                      <td>{e.studentEmail || "—"}</td>
                      <td>
                        <span className="badge badge-info">{String(e.status)}</span>
                      </td>
                      <td>{String(e.enrolledAt || "").slice(0, 10) || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
