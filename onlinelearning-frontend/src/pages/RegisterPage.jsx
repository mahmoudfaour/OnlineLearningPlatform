// src/pages/RegisterPage.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../layouts/AuthLayout";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "https://localhost:7244"
).replace(/\/$/, "");

function redirectByRole(role) {
  if (role === "Admin") return "/admin/dashboard";
  if (role === "Instructor") return "/instructor/dashboard";
  return "/student/dashboard";
}

export default function RegisterPage() {
  const nav = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // ✅ Only Student/Instructor allowed
  const [role, setRole] = useState("Student");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

    // ✅ Security: even if someone edits HTML, block Admin here too
    const safeRole = role === "Admin" ? "Student" : role;

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/register`,
        { fullName, email, password, role: safeRole },
        { headers: { "Content-Type": "application/json" } },
      );

      const token = res.data.token ?? res.data.Token;
      const userRole = res.data.role ?? res.data.Role ?? safeRole;
      const name = res.data.fullName ?? res.data.FullName ?? fullName;

      localStorage.setItem("token", token);
      localStorage.setItem("role", userRole);
      localStorage.setItem("fullName", name || "");

      nav(redirectByRole(userRole));
    } catch (error) {
      const msg =
        error?.response?.data ||
        (error?.response?.status === 400
          ? "Registration failed (bad request)."
          : "Registration failed.");

      setErr(typeof msg === "string" ? msg : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout type="register" backgroundUrl="/images/auth-bg.jpg">
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", padding: 16 }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* Brand */}
          <div className="text-center mb-3">
            <div
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(10px)",
              }}
            >
              <i
                className="fas fa-graduation-cap text-white"
                style={{ fontSize: 22 }}
              />
            </div>

            <h2 className="text-white mt-3 mb-1" style={{ fontWeight: 700 }}>
              OnlineLearning
            </h2>
            <p className="login-box-msg mb-2">Create your account</p>
          </div>

          {/* Card */}
          <div
            className="card"
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.94)",
            }}
          >
            <div className="card-body p-3">
              {err ? (
                <div className="alert alert-danger py-2">{err}</div>
              ) : null}

              <form onSubmit={onSubmit}>
                <div className="row">
                  {/* Full name */}
                  <div className="col-md-12">
                    <label className="mb-1">Full Name</label>
                    <div className="input-group mb-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Your full name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={loading}
                      />
                      <div className="input-group-append">
                        <div className="input-group-text">
                          <span className="fas fa-user" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-md-12">
                    <label className="mb-1">Email</label>
                    <div className="input-group mb-2">
                      <input
                        type="email"
                        className="form-control"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                      />
                      <div className="input-group-append">
                        <div className="input-group-text">
                          <span className="fas fa-envelope" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-md-12 mb-2">
                    <label className="mb-1">Register as</label>
                    <select
                      className="form-control"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      disabled={loading}
                    >
                      <option value="Student">Student</option>
                      <option value="Instructor">Instructor</option>
                    </select>
                  </div>

                  {/* Password */}
                  <div className="col-md-12">
                    <label className="mb-1">Password</label>
                    <div className="input-group mb-2">
                      <input
                        type={showPass ? "text" : "password"}
                        className="form-control"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPass((p) => !p)}
                          disabled={loading}
                        >
                          <i
                            className={`fas ${
                              showPass ? "fa-eye-slash" : "fa-eye"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="col-md-12">
                    <label className="mb-1">Confirm Password</label>
                    <div className="input-group mb-3">
                      <input
                        type={showConfirm ? "text" : "password"}
                        className="form-control"
                        placeholder="••••••••"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowConfirm((p) => !p)}
                          disabled={loading}
                        >
                          <i
                            className={`fas ${
                              showConfirm ? "fa-eye-slash" : "fa-eye"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                  style={{
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontWeight: 600,
                  }}
                >
                  {loading ? "Creating account..." : "Register"}
                </button>
              </form>

              <div className="text-center mt-3">
                <span className="text-muted">Already have an account?</span>{" "}
                <Link to="/login" style={{ fontWeight: 600 }}>
                  Sign in
                </Link>
              </div>
            </div>
          </div>

          <p
            className="text-center text-white-50 mt-3 mb-0"
            style={{ fontSize: 12 }}
          >
            © {new Date().getFullYear()} OnlineLearning Platform
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
