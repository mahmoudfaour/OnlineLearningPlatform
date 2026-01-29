// src/pages/LoginPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) nav(redirectByRole(role));
  }, [nav]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const { token, role, fullName, userId } = {
        token: res.data.token ?? res.data.Token,
        role: res.data.role ?? res.data.Role,
        fullName: res.data.fullName ?? res.data.FullName,
        userId: res.data.userId ?? res.data.UserId,
      };

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("fullName", fullName || "");
      localStorage.setItem("userId", String(userId || ""));

      nav(redirectByRole(role));
    } catch (error) {
      const msg =
        error?.response?.data ||
        (error?.response?.status === 401
          ? "Invalid email or password."
          : "Login failed.");

      setErr(typeof msg === "string" ? msg : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout type="login" backgroundUrl="/images/auth-bg.jpg">
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", padding: 16 }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
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
            <p className="text-white-50 mb-0">
              Sign in to your account
            </p>
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
            <div className="card-body p-4">
              {err && (
                <div className="alert alert-danger py-2">{err}</div>
              )}

              <form onSubmit={onSubmit}>
                <label className="mb-1">Email</label>
                <div className="input-group mb-3">
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

                <label className="mb-1">Password</label>
                <div className="input-group mb-4">
                  <input
                    type={showPass ? "text" : "password"}
                    className="form-control"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
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
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="text-center mt-3">
                <span className="text-muted">Don’t have an account?</span>{" "}
                <Link to="/register" style={{ fontWeight: 600 }}>
                  Register
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
