import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

async function getJson(url) {
  const res = await fetch(url, { headers: authHeadersOnly() });
  return readJson(res);
}

// Helps sort with best available date
function toDateValue(v) {
  if (!v) return 0;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : 0;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);

  const [recentLessons, setRecentLessons] = useState([]);
  const [recentBanks, setRecentBanks] = useState([]);

  // Frontend role guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) return (window.location.href = "/login");
    if (role !== "Admin") return (window.location.href = "/");
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        // Load main stats lists
        const [usersData, coursesData] = await Promise.all([
          getJson(`${API_BASE}/api/Users`),
          getJson(`${API_BASE}/api/Courses`), // Admin gets all
        ]);

        const usersList = Array.isArray(usersData) ? usersData : [];
        const coursesList = Array.isArray(coursesData) ? coursesData : [];

        setUsers(usersList);
        setCourses(coursesList);

        // ===== Recent Question Banks (your existing controller) =====
        // Route is: [Route("api/[controller]")] on QuestionBanksController => /api/QuestionBanks
        const banksData = await getJson(`${API_BASE}/api/QuestionBanks`);
        const banksList = Array.isArray(banksData) ? banksData : [];

        // Show last 5 by CreatedAt (fallback by Id)
        const banksSorted = [...banksList].sort((a, b) => {
          const ad = toDateValue(a.createdAt ?? a.CreatedAt);
          const bd = toDateValue(b.createdAt ?? b.CreatedAt);
          if (bd !== ad) return bd - ad;
          return (b.id ?? b.Id ?? 0) - (a.id ?? a.Id ?? 0);
        });

        setRecentBanks(banksSorted.slice(0, 5));

        // ===== Recent Lessons (reuse your working endpoint) =====
        // Endpoint you use in AdminLessons: GET /api/courses/{courseId}/lessons
        // We'll fetch lessons for a few most recent courses, then pick top 5 lessons overall.

        const coursesSorted = [...coursesList].sort((a, b) => {
          const ad = toDateValue(a.createdAt ?? a.CreatedAt);
          const bd = toDateValue(b.createdAt ?? b.CreatedAt);
          if (bd !== ad) return bd - ad;
          return (b.id ?? b.Id ?? 0) - (a.id ?? a.Id ?? 0);
        });

        const takeCourses = coursesSorted.slice(0, 6); // fetch lessons for up to 6 courses
        const lessonsResults = await Promise.all(
          takeCourses.map(async (c) => {
            const courseId = c.id ?? c.Id;
            const courseTitle = c.title ?? c.Title ?? `Course #${courseId}`;

            try {
              const data = await getJson(`${API_BASE}/api/courses/${courseId}/lessons`);
              const list = Array.isArray(data) ? data : [];

              return list.map((l) => ({
                ...l,
                __courseId: courseId,
                __courseTitle: courseTitle,
              }));
            } catch {
              return [];
            }
          })
        );

        const allLessons = lessonsResults.flat();

        // Sort lessons by createdAt if exists, else by id desc, else by orderIndex desc
        const lessonsSorted = [...allLessons].sort((a, b) => {
          const ad = toDateValue(a.createdAt ?? a.CreatedAt);
          const bd = toDateValue(b.createdAt ?? b.CreatedAt);
          if (bd !== ad) return bd - ad;

          const aid = a.id ?? a.Id ?? 0;
          const bid = b.id ?? b.Id ?? 0;
          if (bid !== aid) return bid - aid;

          const aOrder = a.orderIndex ?? a.OrderIndex ?? 0;
          const bOrder = b.orderIndex ?? b.OrderIndex ?? 0;
          return bOrder - aOrder;
        });

        setRecentLessons(lessonsSorted.slice(0, 5));
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const published = courses.filter((c) => (c.isPublished ?? c.IsPublished) === true).length;
    return {
      totalUsers: users.length,
      totalCourses: courses.length,
      publishedCourses: published,
      quizAttempts: "—", // no admin endpoint yet
    };
  }, [users, courses]);

  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => {
        const ad = toDateValue(a.createdAt ?? a.CreatedAt);
        const bd = toDateValue(b.createdAt ?? b.CreatedAt);
        if (bd !== ad) return bd - ad;
        return (b.id ?? b.Id ?? 0) - (a.id ?? a.Id ?? 0);
      })
      .slice(0, 5);
  }, [users]);

  const recentCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => {
        const ad = toDateValue(a.createdAt ?? a.CreatedAt);
        const bd = toDateValue(b.createdAt ?? b.CreatedAt);
        if (bd !== ad) return bd - ad;
        return (b.id ?? b.Id ?? 0) - (a.id ?? a.Id ?? 0);
      })
      .slice(0, 5);
  }, [courses]);

  return (
    <DashboardLayout
      navbarRoleLabel="Admin"
      sidebarItems={adminSidebarItems}
      title="Admin Dashboard"
      breadcrumb={[
        { label: "Home", to: "/admin/dashboard" },
        { label: "Dashboard", active: true },
      ]}
    >
      {loading ? (
        <div className="card">
          <div className="card-body">
            <i className="fas fa-spinner fa-spin mr-2" />
            Loading dashboard...
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
          {/* ===== STATS ===== */}
          <div className="row">
            <StatBox
              color="bg-info"
              value={stats.totalUsers}
              label="Total Users"
              icon="fas fa-users"
              link="/admin/users"
            />
            <StatBox
              color="bg-success"
              value={stats.totalCourses}
              label="Total Courses"
              icon="fas fa-book"
              link="/admin/courses"
            />
            <StatBox
              color="bg-warning"
              value={stats.publishedCourses}
              label="Published Courses"
              icon="fas fa-bullhorn"
              link="/admin/courses"
            />
            <StatBox
              color="bg-danger"
              value={stats.quizAttempts}
              label="Quiz Attempts"
              icon="fas fa-question-circle"
            />
          </div>

          {/* ===== TABLES ROW 1 ===== */}
          <div className="row">
            <div className="col-lg-6">
              <Card title="Recent Users" link="/admin/users" linkText="Open Users">
                <SimpleUserTable users={recentUsers} />
              </Card>
            </div>

            <div className="col-lg-6">
              <Card title="Recent Courses" link="/admin/courses" linkText="Open Courses">
                <SimpleCourseTable courses={recentCourses} />
              </Card>
            </div>
          </div>

          {/* ===== TABLES ROW 2 ===== */}
          <div className="row">
            <div className="col-lg-6">
              <Card title="Recent Lessons" link="/admin/lessons" linkText="Open Lessons">
                <SimpleLessonTable lessons={recentLessons} />
              </Card>
            </div>

            <div className="col-lg-6">
              <Card title="Recent Question Banks" link="/admin/quizzes" linkText="Open Quizzes & Banks">
                <SimpleBankTable banks={recentBanks} />
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}

/* ================= UI Helpers ================= */

function StatBox({ color, value, label, icon, link }) {
  const box = (
    <div className={`small-box ${color}`}>
      <div className="inner">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
      <div className="icon">
        <i className={icon} />
      </div>
    </div>
  );

  return <div className="col-lg-3 col-6">{link ? <Link to={link}>{box}</Link> : box}</div>;
}

function Card({ title, link, linkText, children }) {
  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h3 className="card-title mb-0">{title}</h3>
        {link ? (
          <Link to={link} className="btn btn-sm btn-primary">
            {linkText}
          </Link>
        ) : null}
      </div>
      <div className="card-body table-responsive">{children}</div>
    </div>
  );
}

function SimpleUserTable({ users }) {
  return (
    <table className="table table-bordered">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th style={{ width: 110 }}>Role</th>
        </tr>
      </thead>
      <tbody>
        {users.length === 0 ? (
          <tr>
            <td colSpan="3" className="text-center text-muted">
              No users
            </td>
          </tr>
        ) : (
          users.map((u) => {
            const id = u.id ?? u.Id;
            const fullName = u.fullName ?? u.FullName ?? "—";
            const email = u.email ?? u.Email ?? "—";
            const role = String(u.role ?? u.Role ?? "—");
            return (
              <tr key={id}>
                <td>{fullName}</td>
                <td>{email}</td>
                <td>
                  <span className={`badge badge-${roleBadge(role)}`}>{role}</span>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function SimpleCourseTable({ courses }) {
  return (
    <table className="table table-bordered">
      <thead>
        <tr>
          <th>Title</th>
          <th style={{ width: 120 }}>Status</th>
          <th style={{ width: 120 }}>Created</th>
        </tr>
      </thead>
      <tbody>
        {courses.length === 0 ? (
          <tr>
            <td colSpan="3" className="text-center text-muted">
              No courses
            </td>
          </tr>
        ) : (
          courses.map((c) => {
            const id = c.id ?? c.Id;
            const title = c.title ?? c.Title ?? `Course #${id}`;
            const created = String(c.createdAt ?? c.CreatedAt ?? "").slice(0, 10) || "—";
            const isPublished = (c.isPublished ?? c.IsPublished) === true;

            return (
              <tr key={id}>
                <td>{title}</td>
                <td>
                  <span className={`badge ${isPublished ? "badge-success" : "badge-warning"}`}>
                    {isPublished ? "Published" : "Unpublished"}
                  </span>
                </td>
                <td>{created}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function SimpleLessonTable({ lessons }) {
  return (
    <table className="table table-bordered">
      <thead>
        <tr>
          <th>Lesson</th>
          <th style={{ width: 150 }}>Course</th>
          <th style={{ width: 110 }}>Type</th>
        </tr>
      </thead>
      <tbody>
        {lessons.length === 0 ? (
          <tr>
            <td colSpan="3" className="text-center text-muted">
              No lessons
            </td>
          </tr>
        ) : (
          lessons.map((l) => {
            const id = l.id ?? l.Id;
            const title = l.title ?? l.Title ?? "—";
            const type = l.lessonType ?? l.LessonType ?? "—";
            const courseTitle = l.__courseTitle ?? "—";
            return (
              <tr key={id}>
                <td>{title}</td>
                <td>{courseTitle}</td>
                <td>
                  <span className="badge badge-info">{type}</span>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function SimpleBankTable({ banks }) {
  return (
    <table className="table table-bordered">
      <thead>
        <tr>
          <th style={{ width: 70 }}>#</th>
          <th>Source</th>
          <th style={{ width: 120 }}>Created</th>
        </tr>
      </thead>
      <tbody>
        {banks.length === 0 ? (
          <tr>
            <td colSpan="3" className="text-center text-muted">
              No question banks
            </td>
          </tr>
        ) : (
          banks.map((b) => {
            const id = b.id ?? b.Id;
            const sourceType = b.sourceType ?? b.SourceType ?? "—";
            const created = String(b.createdAt ?? b.CreatedAt ?? "").slice(0, 10) || "—";
            return (
              <tr key={id}>
                <td>{id}</td>
                <td>{sourceType}</td>
                <td>{created}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function roleBadge(role) {
  if (role === "Admin") return "dark";
  if (role === "Instructor") return "warning";
  return "info";
}
