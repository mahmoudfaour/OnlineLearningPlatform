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

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // If already logged in, redirect (DON'T do nav() directly in render)
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
        { headers: { "Content-Type": "application/json" } },
      );

      // backend returns: UserId, FullName, Email, Role, Token
      const { token, role, fullName, userId } = {
        token: res.data.token ?? res.data.Token,
        role: res.data.role ?? res.data.Role,
        fullName: res.data.fullName ?? res.data.FullName,
        userId: res.data.userId ?? res.data.UserId,
      };

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("fullName", fullName || "");
      localStorage.setItem("userId", String(userId || "")); // ✅ add this

      nav(redirectByRole(role));
    } catch (error) {
      // 401 => invalid credentials
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
    <AuthLayout type="login">
      <div className="login-box">
        <div className="login-logo">
          <b>Online</b>Learning
        </div>

        <div className="card">
          <div className="card-body login-card-body">
            <p className="login-box-msg">Sign in to start your session</p>

            {err ? <div className="alert alert-danger py-2">{err}</div> : null}

            <form onSubmit={onSubmit}>
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

              <div className="row">
                <div className="col-8">
                  <div className="icheck-primary">
                    <input type="checkbox" id="remember" disabled={loading} />
                    <label htmlFor="remember">Remember Me</label>
                  </div>
                </div>

                <div className="col-4">
                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={loading}
                  >
                    {loading ? "..." : "Sign In"}
                  </button>
                </div>
              </div>
            </form>

            <p className="mb-1 mt-3">
              <a href="#">I forgot my password</a>
            </p>
            <p className="mb-0">
              <Link to="/register" className="text-center">
                Register a new account
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
