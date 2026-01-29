// File: src/pages/admin/UsersManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { adminSidebarItems } from "../../config/adminSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "https://localhost:5001";

function authHeadersJson() {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function authHeadersOnly() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  return text ? JSON.parse(text) : null;
}

export default function UsersManagement() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [users, setUsers] = useState([]);

  // UI state
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // normalized user or null

  // ✅ Use "password" (plain) in UI. Backend should hash it.
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "Student",
  });

  // role guard (frontend)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (role !== "Admin") {
      window.location.href =
        role === "Instructor" ? "/instructor/dashboard" : "/student/dashboard";
    }
  }, []);

  async function loadUsers() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/Users`, { headers: authHeadersOnly() });
      const data = await readJson(res);
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setUsers([]);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    let list = [...users];

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const name = String(u.fullName ?? u.FullName ?? "").toLowerCase();
        const email = String(u.email ?? u.Email ?? "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    if (roleFilter !== "All") {
      list = list.filter((u) => String(u.role ?? u.Role) === roleFilter);
    }

    const created = (u) => String(u.createdAt ?? u.CreatedAt ?? "");

    if (sortBy === "Newest") {
      list.sort((a, b) => created(b).localeCompare(created(a)));
    } else if (sortBy === "Name") {
      list.sort((a, b) =>
        String(a.fullName ?? a.FullName ?? "").localeCompare(
          String(b.fullName ?? b.FullName ?? "")
        )
      );
    } else if (sortBy === "Role") {
      list.sort((a, b) =>
        String(a.role ?? a.Role ?? "").localeCompare(String(b.role ?? b.Role ?? ""))
      );
    }

    return list;
  }, [users, query, roleFilter, sortBy]);

  function roleBadge(role) {
    if (role === "Admin") return "badge-dark";
    if (role === "Instructor") return "badge-warning";
    return "badge-info";
  }

  function openCreate() {
    setEditing(null);
    setForm({
      fullName: "",
      email: "",
      password: "",
      role: "Student",
    });
    setModalOpen(true);
  }

  function openEdit(u) {
    const id = u.id ?? u.Id;

    setEditing({
      id,
      fullName: u.fullName ?? u.FullName ?? "",
      email: u.email ?? u.Email ?? "",
      role: String(u.role ?? u.Role ?? "Student"),
      createdAt: u.createdAt ?? u.CreatedAt ?? null,
    });

    // password empty => optional on edit
    setForm({
      fullName: u.fullName ?? u.FullName ?? "",
      email: u.email ?? u.Email ?? "",
      password: "",
      role: String(u.role ?? u.Role ?? "Student"),
    });

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function saveUser(e) {
    e.preventDefault();
    setErr("");

    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const role = form.role;
    const password = form.password; // keep raw (trim? optional)

    if (!fullName) return alert("Full name is required.");
    if (!email) return alert("Email is required.");
    if (!role) return alert("Role is required.");

    // ✅ Create requires password
    if (!editing && !password.trim()) return alert("Password is required for new users.");

    try {
      if (editing) {
        const body = {
          fullName,
          email,
          role,
          // ✅ only send password if provided
          ...(password.trim() ? { password: password } : {}),
        };

        const res = await fetch(`${API_BASE}/api/Users/${editing.id}`, {
          method: "PUT",
          headers: authHeadersJson(),
          body: JSON.stringify(body),
        });

        // PUT might return 204 => handle that
        if (res.status !== 204) await readJson(res);
      } else {
        const body = { fullName, email, role, password };

        const res = await fetch(`${API_BASE}/api/Users`, {
          method: "POST",
          headers: authHeadersJson(),
          body: JSON.stringify(body),
        });

        await readJson(res);
      }

      closeModal();
      await loadUsers();
    } catch (e2) {
      alert(String(e2?.message || e2));
    }
  }

  async function deleteUser(u) {
    const id = u.id ?? u.Id;
    const name = u.fullName ?? u.FullName ?? `User #${id}`;

    if (!confirm(`Delete ${name}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/Users/${id}`, {
        method: "DELETE",
        headers: authHeadersOnly(),
      });

      if (!res.ok) throw new Error(await res.text());
      await loadUsers();
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  return (
    <DashboardLayout
      brandText="OnlineLearning"
      navbarRoleLabel="Admin"
      sidebarItems={adminSidebarItems}
      title="Users Management"
      breadcrumb={[
        { label: "Home", to: "/admin/dashboard" },
        { label: "Users", active: true },
      ]}
    >
      {/* Header actions */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-end" style={{ gap: 12 }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <label className="mb-1">Search</label>
              <input
                className="form-control"
                placeholder="Search by name or email..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div style={{ minWidth: 180 }}>
              <label className="mb-1">Role</label>
              <select
                className="form-control"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Admin">Admin</option>
                <option value="Instructor">Instructor</option>
                <option value="Student">Student</option>
              </select>
            </div>

            <div style={{ minWidth: 180 }}>
              <label className="mb-1">Sort</label>
              <select
                className="form-control"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="Newest">Newest</option>
                <option value="Name">Name (A-Z)</option>
                <option value="Role">Role</option>
              </select>
            </div>

            <div className="ml-auto">
              <button className="btn btn-primary" type="button" onClick={openCreate}>
                <i className="fas fa-user-plus mr-2" />
                Create User
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="card-body">
            <i className="fas fa-spinner fa-spin mr-2" />
            Loading users...
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2" />
          {err}
        </div>
      ) : null}

      {/* Table */}
      {!loading ? (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title mb-0">Users</h3>
            <span className="text-muted">{filteredUsers.length} users</span>
          </div>

          <div className="card-body table-responsive">
            <table className="table table-bordered table-hover">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>#</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th style={{ width: 130 }}>Role</th>
                  <th style={{ width: 180 }}>Created</th>
                  <th style={{ width: 220 }}>Actions</th>
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
                  filteredUsers.map((u) => {
                    const id = u.id ?? u.Id;
                    const fullName = u.fullName ?? u.FullName ?? "";
                    const email = u.email ?? u.Email ?? "";
                    const role = String(u.role ?? u.Role ?? "");
                    const createdAt = String(u.createdAt ?? u.CreatedAt ?? "");

                    return (
                      <tr key={id}>
                        <td>{id}</td>
                        <td>{fullName}</td>
                        <td>{email}</td>
                        <td>
                          <span className={`badge ${roleBadge(role)}`}>{role}</span>
                        </td>
                        <td>{createdAt ? new Date(createdAt).toLocaleString() : "—"}</td>
                        <td>
                          <div className="d-flex" style={{ gap: 8, flexWrap: "wrap" }}>
                            <button
                              className="btn btn-sm btn-info"
                              type="button"
                              onClick={() => openEdit(u)}
                            >
                              <i className="fas fa-edit mr-1" />
                              Edit
                            </button>

                            <button
                              className="btn btn-sm btn-danger"
                              type="button"
                              onClick={() => deleteUser(u)}
                            >
                              <i className="fas fa-trash mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <small className="text-muted">Uses: GET/POST/PUT/DELETE /api/Users (Admin only)</small>
          </div>
        </div>
      ) : null}

      {/* Modal */}
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
                <h5 className="modal-title">{editing ? "Edit User" : "Create User"}</h5>
                <button type="button" className="close" onClick={closeModal}>
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={saveUser}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      className="form-control"
                      value={form.fullName}
                      onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>{editing ? "New Password (optional)" : "Password"}</label>
                    <input
                      type="password"
                      className="form-control"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder={editing ? "Leave empty to keep old password" : ""}
                      required={!editing}
                      autoComplete="new-password"
                    />
                    <small className="text-muted">
                      Password is hashed server-side (BCrypt) so the user can login normally.
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <select
                      className="form-control"
                      value={form.role}
                      onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Instructor">Instructor</option>
                      <option value="Student">Student</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? "Save Changes" : "Create"}
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
