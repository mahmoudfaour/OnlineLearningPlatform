// File: src/layouts/DashboardLayout.jsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

export default function DashboardLayout({
  brandIconClass = "fas fa-graduation-cap",
  brandText = "OnlineLearning",
  navbarRoleLabel = "",
  sidebarItems = [],
  title = "",
  breadcrumb = [],
  children,
}) {
  const location = useLocation();

  // lock to prevent double toggle during animation
  const toggleLockRef = useRef(false);

  // ✅ AdminLTE body classes
  useEffect(() => {
    const classesToAdd = [ "sidebar-mini", "layout-fixed"];
    document.body.classList.add(...classesToAdd);

    return () => {
      document.body.classList.remove(...classesToAdd);
      document.body.classList.remove("sidebar-collapse");
      document.body.classList.remove("sidebar-open");
    };
  }, []);

  // ✅ Close mobile sidebar when route changes
  useEffect(() => {
    document.body.classList.remove("sidebar-open");
  }, [location.pathname]);

  const items = useMemo(() => {
    return (sidebarItems || []).map((it) => ({
      ...it,
      isActive: location.pathname === it.to,
    }));
  }, [sidebarItems, location.pathname]);

  const toggleSidebar = useCallback(() => {
    if (toggleLockRef.current) return;
    toggleLockRef.current = true;

    const isMobile = window.innerWidth < 992;

    if (isMobile) {
      document.body.classList.toggle("sidebar-open");
    } else {
      document.body.classList.toggle("sidebar-collapse");
    }

    // release after transition time
    window.setTimeout(() => {
      toggleLockRef.current = false;
    }, 250);
  }, []);

  // ✅ Click outside to close on mobile (stable)
  useEffect(() => {
    function handleOutsideClick(e) {
      const isMobile = window.innerWidth < 992;
      if (!isMobile) return;
      if (!document.body.classList.contains("sidebar-open")) return;

      const target = e.target;

      // ignore clicks on toggle button
      if (target.closest("[data-sidebar-toggle='true']")) return;

      // ignore clicks inside sidebar
      if (target.closest(".main-sidebar")) return;

      // otherwise close
      document.body.classList.remove("sidebar-open");
    }

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }

  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <button
              type="button"
              className="nav-link btn btn-link p-0"
              aria-label="Toggle sidebar"
              data-sidebar-toggle="true"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSidebar();
              }}
              style={{
                textDecoration: "none",
                cursor: "pointer",
                width: 44,
                height: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="fas fa-bars" />
            </button>
          </li>

          <li className="nav-item d-none d-sm-inline-block">
            <Link to="/" className="nav-link">
              Home
            </Link>
          </li>
        </ul>

        <ul className="navbar-nav ml-auto align-items-center">
          {navbarRoleLabel ? (
            <li className="nav-item">
              <span className="nav-link text-muted">{navbarRoleLabel}</span>
            </li>
          ) : null}

          <li className="nav-item">
            <button
              type="button"
              onClick={logout}
              className="btn btn-outline-danger"
              style={{
                borderRadius: 999,
                padding: "6px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                background: "transparent",
              }}
            >
              <i className="fas fa-sign-out-alt" />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Sidebar */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link to="/" className="brand-link">
          <i className={`${brandIconClass} mr-2`} />
          <span className="brand-text font-weight-light">{brandText}</span>
        </Link>

        <div className="sidebar">
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
              {items.map((item) => (
                <li className="nav-item" key={item.to}>
                  <Link to={item.to} className={`nav-link ${item.isActive ? "active" : ""}`}>
                    <i className={`nav-icon ${item.icon}`} />
                    <p>{item.label}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="content-wrapper">
        <section className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1>{title}</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  {(breadcrumb || []).map((b, idx) => (
                    <li key={idx} className={`breadcrumb-item ${b.active ? "active" : ""}`}>
                      {b.to && !b.active ? <Link to={b.to}>{b.label}</Link> : b.label}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="content">
          <div className="container-fluid">{children}</div>
        </section>
      </div>

      <footer className="main-footer">
        <strong>{brandText}</strong> © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
