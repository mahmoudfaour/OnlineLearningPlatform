import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { api } from "../../api/apiClient";
import courseDefaultImg from "../../assets/ui-assets/img/course-default.jpg";
import { authHeaders } from "../../utils/auth";

export default function CoursesList() {
  const sidebar = [
    { to: "/student/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
    { to: "/student/courses", icon: "fas fa-book", label: "Browse Courses", active: true },
    { to: "/student/progress", icon: "fas fa-chart-line", label: "Progress" },
    { to: "/student/certificates", icon: "fas fa-certificate", label: "Certificates" },
  ];

  const [items, setItems] = useState([]); // full list (enriched)
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1) get published courses (no search param; we’ll filter on client to guarantee it works)
      const res = await api.get("/api/Courses/published");
      const courses = res.data || [];

      // 2) fetch lessons count per course
      const headers = authHeaders();

      const counts = await Promise.all(
        courses.map(async (c) => {
          try {
            const lessonsRes = await api.get(`/api/courses/${c.id}/lessons`, { headers });
            return Array.isArray(lessonsRes.data) ? lessonsRes.data.length : 0;
          } catch {
            return 0;
          }
        })
      );

      const mapped = courses.map((c, idx) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        lessonsCount: counts[idx] ?? 0,
        image: courseDefaultImg,
      }));

      setItems(mapped);
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ✅ client-side filter (works even if backend doesn’t support search)
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const t = (c.title || "").toLowerCase();
      const d = (c.description || "").toLowerCase();
      return t.includes(q) || d.includes(q);
    });
  }, [items, search]);

  function onSubmitFilter(e) {
    e.preventDefault();
    // If you still want to re-fetch on filter click, keep this:
    // load();
    // But since we filter client-side, no need to hit the server each time.
  }

  return (
    <DashboardLayout
      brandIconClass="fas fa-graduation-cap"
      brandText="OnlineLearning"
      navbarRoleLabel="Student"
      sidebarItems={sidebar}
      title="Browse Courses"
      breadcrumb={[
        { label: "Student", to: "/student/dashboard" },
        { label: "Courses", active: true },
      ]}
    >
      {/* Filters bar */}
      <div className="card course-card">
        <div className="card-body">
          <form onSubmit={onSubmitFilter}>
            <div className="row">
              <div className="col-md-9 mb-2">
                <input
                  className="form-control"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="col-md-3 mb-2 d-flex" style={{ gap: 10 }}>
                <button className="btn btn-primary flex-fill" type="submit" disabled={loading}>
                  <i className="fas fa-search mr-1"></i> Filter
                </button>

                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setSearch("")}
                  disabled={loading || !search}
                >
                  Clear
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="alert alert-danger mt-2 mb-0">
              <i className="fas fa-exclamation-triangle mr-1"></i> {String(error)}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="alert alert-info">
          <i className="fas fa-spinner fa-spin mr-1"></i> Loading courses...
        </div>
      ) : (
        <div className="row">
          {filteredItems.map((c) => (
            <div className="col-lg-4 col-md-6" key={c.id}>
              <div className="card course-card">
                <img
                  src={c.image}
                  alt={c.title}
                  className="card-img-top"
                  style={{ height: 160, objectFit: "cover" }}
                  onError={(e) => (e.currentTarget.src = courseDefaultImg)}
                />
                <div className="card-body">
                  <h5 className="mb-1">{c.title}</h5>

                  <div className="text-muted mb-2" style={{ fontSize: 13 }}>
                    <i className="fas fa-list mr-1"></i> {c.lessonsCount} lessons
                  </div>

                  <div className="mb-2" style={{ fontSize: 13 }}>
                    {c.description}
                  </div>

                  <Link to={`/student/courses/${c.id}`} className="btn btn-outline-primary btn-block">
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="col-12">
              <div className="alert alert-light">No courses found.</div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
