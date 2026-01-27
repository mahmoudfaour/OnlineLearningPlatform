import React, { useEffect, useMemo, useState } from "react";

export default function UsersManagement() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  const [users, setUsers] = useState([
    { id: 1, fullName: "Admin User", email: "admin@example.com", role: "Admin", status: "Active", createdAt: "2026-01-12" },
    { id: 2, fullName: "Instructor A", email: "instructor@example.com", role: "Instructor", status: "Active", createdAt: "2026-01-11" },
    { id: 3, fullName: "Student A", email: "student@example.com", role: "Student", status: "Pending", createdAt: "2026-01-10" },
  ]);

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

  const filteredUsers = useMemo(() => {
    let list = [...users];

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== "All") {
      list = list.filter((u) => u.role === roleFilter);
    }

    if (sortBy === "Newest") {
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    } else if (sortBy === "Name") {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (sortBy === "Role") {
      list.sort((a, b) => a.role.localeCompare(b.role));
    }

    return list;
  }, [users, query, roleFilter, sortBy]);

  const roleBadge = (role) => {
    if (role === "Admin") return "badge-dark";
    if (role === "Instructor") return "badge-warning";
    return "badge-info";
  };

  const statusBadge = (status) => {
    if (status === "Active") return "badge-success";
    if (status === "Pending") return "badge-warning";
    return "badge-secondary";
  };

  const onEdit = (u) => alert(`Edit user: ${u.fullName}`);
  const onReset = (u) => alert(`Reset password: ${u.fullName}`);
  const onDelete = (u) => alert(`Delete user: ${u.fullName}`);
  const onCreateUser = () => alert("Create User");

  const onApprove = (u) => {
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: "Active" } : x)));
  };

  return (
    <div className="content-wrapper" style={{ minHeight: "100vh" }}>
      <section className="content-header">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center">
            <h1>Users Management</h1>
            <button className="btn btn-primary btn-sm" type="button" onClick={onCreateUser}>
              <i className="fas fa-user-plus" /> Create User
            </button>
          </div>
        </div>
      </section>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-body">
              <div className="form-row">
                <div className="col-md-6 mb-2">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by name or email..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="input-group-append">
                      <button className="btn btn-primary" type="button">
                        <i className="fas fa-search" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 mb-2">
                  <select className="form-control" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="All">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Instructor">Instructor</option>
                    <option value="Student">Student</option>
                  </select>
                </div>

                <div className="col-md-3 mb-2">
                  <select className="form-control" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="Newest">Sort By: Newest</option>
                    <option value="Name">Sort By: Name (A-Z)</option>
                    <option value="Role">Sort By: Role</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Users List</h3>
              <div className="card-tools">
                <span className="text-muted">{filteredUsers.length} users</span>
              </div>
            </div>

            <div className="card-body">
              <table className="table table-bordered table-hover">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ width: 260 }}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.fullName}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${roleBadge(u.role)}`}>{u.role}</span>
                        </td>
                        <td>
                          <span className={`badge ${statusBadge(u.status)}`}>{u.status}</span>
                        </td>
                        <td>
                          <div className="d-flex" style={{ gap: 8, flexWrap: "wrap" }}>
                            <button className="btn btn-sm btn-info" type="button" onClick={() => onEdit(u)}>
                              <i className="fas fa-edit" /> Edit
                            </button>

                            <button className="btn btn-sm btn-secondary" type="button" onClick={() => onReset(u)}>
                              <i className="fas fa-key" /> Reset
                            </button>

                            {u.status === "Pending" ? (
                              <button className="btn btn-sm btn-success" type="button" onClick={() => onApprove(u)}>
                                <i className="fas fa-check" /> Approve
                              </button>
                            ) : null}

                            <button className="btn btn-sm btn-danger" type="button" onClick={() => onDelete(u)}>
                              <i className="fas fa-trash" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card-footer">
              <nav aria-label="Users pagination">
                <ul className="pagination mb-0">
                  <li className="page-item disabled">
                    <a className="page-link" href="#prev" onClick={(e) => e.preventDefault()}>
                      Previous
                    </a>
                  </li>
                  <li className="page-item active">
                    <a className="page-link" href="#1" onClick={(e) => e.preventDefault()}>
                      1
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#2" onClick={(e) => e.preventDefault()}>
                      2
                    </a>
                  </li>
                  <li className="page-item">
                    <a className="page-link" href="#next" onClick={(e) => e.preventDefault()}>
                      Next
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
