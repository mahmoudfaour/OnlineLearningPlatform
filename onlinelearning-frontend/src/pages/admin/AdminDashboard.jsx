import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const stats = {
    totalUsers: 320,
    totalCourses: 48,
    publishedCourses: 37,
    quizAttempts: 1240,
  };

  const recentUsers = [
    { name: "John Doe", email: "john@example.com", role: "Student", joined: "2026-01-12" },
    { name: "Sarah Ali", email: "sarah@example.com", role: "Instructor", joined: "2026-01-11" },
    { name: "Mark Smith", email: "mark@example.com", role: "Student", joined: "2026-01-10" },
  ];

  const recentCourses = [
    { title: "Ethics in Life and Pluralism", creator: "Instructor A", status: "Published", created: "2026-01-09" },
    { title: "Final Year Project", creator: "Instructor B", status: "Unpublished", created: "2026-01-07" },
    { title: "Engineer Intern", creator: "Instructor A", status: "Published", created: "2026-01-05" },
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (role && role !== "Admin") {
      window.location.href =
        role === "Student" ? "/student" : role === "Instructor" ? "/instructor" : "/";
    }
  }, []);

  return (
    <div className="content-wrapper" style={{ minHeight: "100vh" }}>
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Admin Dashboard</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item">
                  <Link to="/admin">Home</Link>
                </li>
                <li className="breadcrumb-item active">Admin Dashboard</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-3 col-6">
              <div className="small-box bg-info">
                <div className="inner">
                  <h3>{stats.totalUsers}</h3>
                  <p>Total Users</p>
                </div>
                <div className="icon">
                  <i className="fas fa-users" />
                </div>
                <Link to="/admin/users" className="small-box-footer">
                  Manage Users <i className="fas fa-arrow-circle-right" />
                </Link>
              </div>
            </div>

            <div className="col-lg-3 col-6">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>{stats.totalCourses}</h3>
                  <p>Total Courses</p>
                </div>
                <div className="icon">
                  <i className="fas fa-book" />
                </div>
                <Link to="/admin/courses" className="small-box-footer">
                  View Courses <i className="fas fa-arrow-circle-right" />
                </Link>
              </div>
            </div>

            <div className="col-lg-3 col-6">
              <div className="small-box bg-warning">
                <div className="inner">
                  <h3>{stats.publishedCourses}</h3>
                  <p>Published Courses</p>
                </div>
                <div className="icon">
                  <i className="fas fa-bullhorn" />
                </div>
                <Link to="/admin/courses" className="small-box-footer">
                  Review Publishing <i className="fas fa-arrow-circle-right" />
                </Link>
              </div>
            </div>

            <div className="col-lg-3 col-6">
              <div className="small-box bg-danger">
                <div className="inner">
                  <h3>{stats.quizAttempts}</h3>
                  <p>Total Quiz Attempts</p>
                </div>
                <div className="icon">
                  <i className="fas fa-question-circle" />
                </div>
                <a href="#reports" className="small-box-footer">
                  View Reports <i className="fas fa-arrow-circle-right" />
                </a>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Recent Users</h3>
                  <div className="card-tools">
                    <Link to="/admin/users" className="btn btn-sm btn-primary">
                      <i className="fas fa-users" /> Open Users
                    </Link>
                  </div>
                </div>
                <div className="card-body">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.map((u, idx) => (
                        <tr key={idx}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`badge ${u.role === "Instructor" ? "badge-warning" : "badge-info"}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>{u.joined}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Recent Courses</h3>
                  <div className="card-tools">
                    <Link to="/admin/courses" className="btn btn-sm btn-success">
                      <i className="fas fa-book" /> Open Courses
                    </Link>
                  </div>
                </div>
                <div className="card-body">
                  <table className="table table-hover table-bordered">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Creator</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCourses.map((c, idx) => (
                        <tr key={idx}>
                          <td>{c.title}</td>
                          <td>{c.creator}</td>
                          <td>
                            <span className={`badge ${c.status === "Published" ? "badge-success" : "badge-warning"}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>{c.created}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="row" id="reports">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">System Notes</h3>
                </div>
                <div className="card-body">
                  <ul className="mb-0">
                    <li>Review unpublished courses before publishing.</li>
                    <li>Monitor quiz attempts for unusual activity.</li>
                    <li>Manage users and roles through the Users page.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
