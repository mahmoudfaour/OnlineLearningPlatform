// src/pages/RegisterPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../layouts/AuthLayout";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "https://localhost:7244").replace(/\/$/, "");

function redirectByRole(role) {
  if (role === "Admin") return "/admin/dashboard";
  if (role === "Instructor") return "/instructor/dashboard";
  return "/student/dashboard";
}

export default function RegisterPage() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Student");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // If already logged in, redirect
  useEffect(() => {
    const token = localStorage.getItem("token");
    const r = localStorage.getItem("role");
    if (token && r) nav(redirectByRole(r));
  }, [nav]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/register`,
        { fullName, email, password, role },
        { headers: { "Content-Type": "application/json" } }
      );

      const token = res.data.token ?? res.data.Token;
      const userRole = res.data.role ?? res.data.Role ?? role;
      const name = res.data.fullName ?? res.data.FullName ?? fullName;

      localStorage.setItem("token", token);
      localStorage.setItem("role", userRole);
      localStorage.setItem("fullName", name);

      nav(redirectByRole(userRole));
    } catch (error) {
      const msg =
        error?.response?.data ||
        (error?.response?.status === 400 ? "Registration failed (bad request)." : "Registration failed.");
      setErr(typeof msg === "string" ? msg : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout type="register">
      <div className="register-box">
        <div className="register-logo">
          <b>Online</b>Learning
        </div>

        <div className="card">
          <div className="card-body register-card-body">
            <p className="login-box-msg">Register a new account</p>

            {err ? <div className="alert alert-danger py-2">{err}</div> : null}

            <form onSubmit={onSubmit}>
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Full Name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
                <div className="input-group-append">
                  <div className="input-group-text">
                    <span className="fas fa-user"></span>
                  </div>
                </div>
              </div>

              <div className="input-group mb-3">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <div className="input-group-append">
                  <div className="input-group-text">
                    <span className="fas fa-envelope"></span>
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <select
                  className="form-control"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                >
                  <option value="Student">Student</option>
                  <option value="Instructor">Instructor</option>
                  <option value="Admin">Admin</option>
                </select>

                <small className="text-muted">
                  (For your project demo) Role is selectable. In real systems, Admin controls it.
                </small>
              </div>

              <div className="input-group mb-3">
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <div className="input-group-append">
                  <div className="input-group-text">
                    <span className="fas fa-lock"></span>
                  </div>
                </div>
              </div>

              <div className="input-group mb-3">
                <input
                  type="password"
                  className="form-control"
                  placeholder="Retype password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <div className="input-group-append">
                  <div className="input-group-text">
                    <span className="fas fa-lock"></span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "..." : "Register"}
              </button>
            </form>

            <p className="mt-3 mb-0">
              <Link to="/login" className="text-center">
                I already have an account
              </Link>
            </p>

            <hr />
            <Link to="/" className="btn btn-outline-secondary btn-block">
              Back to Prototype Home
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
