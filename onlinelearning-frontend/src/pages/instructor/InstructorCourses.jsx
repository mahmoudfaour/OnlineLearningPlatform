import React, { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://localhost:5001";

function headers() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
}

export default function InstructorCourses() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/Courses/mine`, { headers: headers() });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e.message || e));
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function publishToggle(course) {
    const id = course.id;
    const endpoint = course.isPublished ? "unpublish" : "publish";

    try {
      const res = await fetch(`${API_BASE}/api/Courses/${id}/${endpoint}`, {
        method: "PATCH",
        headers: headers(),
      });

      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      alert(`Failed: ${String(e.message || e)}`);
    }
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="My Courses"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "My Courses", active: true },
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
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title mb-0">Courses</h3>
          <a href="/instructor/courses/create" className="btn btn-primary btn-sm">
            <i className="fas fa-plus" /> Create Course
          </a>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th style={{ width: 360 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    No courses found.
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.title}</td>
                    <td>
                      {c.isPublished ? (
                        <span className="badge badge-success">Published</span>
                      ) : (
                        <span className="badge badge-warning">Unpublished</span>
                      )}
                    </td>
                    <td>
                      <a
                        href={`/instructor/courses/${c.id}/edit`}
                        className="btn btn-sm btn-info mr-2"
                      >
                        <i className="fas fa-edit" /> Edit
                      </a>

                      <a
                        href={`/instructor/courses/${c.id}/enrollments`}
                        className="btn btn-sm btn-secondary mr-2"
                      >
                        <i className="fas fa-users" /> Enrollments
                      </a>

                      <button
                        className={`btn btn-sm ${c.isPublished ? "btn-outline-warning" : "btn-success"}`}
                        onClick={() => publishToggle(c)}
                        type="button"
                      >
                        <i className="fas fa-bullhorn" />{" "}
                        {c.isPublished ? "Unpublish" : "Publish"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <small className="text-muted">
            Publish/Unpublish uses your existing PATCH endpoints in CoursesController.
          </small>
        </div>
      </div>
    </DashboardLayout>
  );
}
