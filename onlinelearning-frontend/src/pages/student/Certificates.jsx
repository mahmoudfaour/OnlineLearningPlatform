// File: src/pages/student/Certificates.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import { authHeaders, getUserIdFromToken } from "../../utils/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://localhost:5001").replace(/\/$/, "");

export default function Certificates() {
  const sidebar = useMemo(
    () => [
      { to: "/student/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
      { to: "/student/courses", icon: "fas fa-book", label: "Browse Courses" },
      { to: "/student/progress", icon: "fas fa-chart-line", label: "Progress" },
      { to: "/student/certificates", icon: "fas fa-certificate", label: "Certificates", active: true },
    ],
    []
  );

  const userId = getUserIdFromToken();

  const [loading, setLoading] = useState(true);
  const [busyCourseId, setBusyCourseId] = useState(null);
  const [downloadingCertId, setDownloadingCertId] = useState(null);
  const [error, setError] = useState("");

  const [enrollments, setEnrollments] = useState([]);
  const [certs, setCerts] = useState([]);
  const [courses, setCourses] = useState([]);

  // courseId -> CourseProgressDto (or null)
  const [progressMap, setProgressMap] = useState({});

  const coursesMap = useMemo(() => {
    const m = new Map();
    for (const c of courses) m.set(c.id, c);
    return m;
  }, [courses]);

  const enrolledCourseIds = useMemo(() => {
    return (enrollments || [])
      .filter((e) => String(e.status).toLowerCase() === "active")
      .map((e) => e.courseId);
  }, [enrollments]);

  const hasCertificateCourseIds = useMemo(() => {
    return new Set((certs || []).map((c) => c.courseId));
  }, [certs]);

  const pendingCourses = useMemo(() => {
    return enrolledCourseIds.filter((cid) => !hasCertificateCourseIds.has(cid));
  }, [enrolledCourseIds, hasCertificateCourseIds]);

  useEffect(() => {
    if (!userId) {
      setError("Missing userId in token. Please login again.");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError("");

        const headers = authHeaders();

        // 1) published courses
        const coursesRes = await axios.get(`${API_BASE}/api/Courses/published`);
        setCourses(coursesRes.data || []);

        // 2) my enrollments
        const enrRes = await axios.get(`${API_BASE}/api/student/courseenrollments/my`, { headers });
        const enr = enrRes.data || [];
        setEnrollments(enr);

        // 3) my certificates
        const certRes = await axios.get(`${API_BASE}/api/student/certificates/user/${userId}`, { headers });
        setCerts(certRes.data || []);

        // 4) progress for each active enrolled course
        const activeCourseIds = enr
          .filter((e) => String(e.status).toLowerCase() === "active")
          .map((e) => e.courseId);

        const progEntries = await Promise.all(
          activeCourseIds.map(async (cid) => {
            try {
              const r = await axios.get(`${API_BASE}/api/student/progress/course/${cid}`, { headers });
              return [cid, r.data];
            } catch {
              return [cid, null];
            }
          })
        );

        const next = {};
        for (const [cid, data] of progEntries) next[cid] = data;
        setProgressMap(next);
      } catch (e) {
        setError(e?.response?.data?.message || e?.response?.data || e.message || "Failed to load certificates.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  async function refreshCertificates() {
    const headers = authHeaders();
    const certRes = await axios.get(`${API_BASE}/api/student/certificates/user/${userId}`, { headers });
    setCerts(certRes.data || []);
  }

  async function generate(courseId) {
    if (!userId) return;

    try {
      setBusyCourseId(courseId);
      setError("");

      const headers = authHeaders();
      const res = await axios.post(
        `${API_BASE}/api/student/certificates/generate`,
        { courseId, userId },
        { headers }
      );

      await refreshCertificates();
      alert(`Certificate generated: ${res.data?.certificateCode || "OK"}`);
    } catch (e) {
      // backend may return string
      setError(e?.response?.data?.message || e?.response?.data || e.message || "Certificate generation failed.");
    } finally {
      setBusyCourseId(null);
    }
  }

  async function downloadCertificate(certificateId, courseTitle) {
    try {
      setDownloadingCertId(certificateId);
      setError("");

      const headers = authHeaders();

      const res = await axios.get(`${API_BASE}/api/student/certificates/${certificateId}/download`, {
        headers,
        responseType: "blob", // IMPORTANT for PDF
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const safeTitle = String(courseTitle || "certificate")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 80);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate_${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      // If server returns an error as a blob, read it
      const data = e?.response?.data;
      if (data instanceof Blob) {
        const text = await data.text();
        setError(text || "Failed to download certificate.");
      } else {
        setError(e?.response?.data?.message || e?.response?.data || e.message || "Failed to download certificate.");
      }
    } finally {
      setDownloadingCertId(null);
    }
  }

  const isEligibleForCertificate = (courseId) => {
    const p = progressMap[courseId];
    // if progress endpoint not available, let backend decide (button enabled)
    if (!p || p.overallPercent == null) return true;
    return Number(p.overallPercent) >= 100;
  };

  const eligibilityHint = (courseId) => {
    const p = progressMap[courseId];
    if (!p) return "Progress info not loaded. Try again.";
    const overall = Number(p.overallPercent || 0);
    if (overall >= 100) return "Eligible ✅";
    return "Not eligible yet: complete final quiz (≥60%) to reach 100%.";
  };

  return (
    <DashboardLayout
      brandIconClass="fas fa-graduation-cap"
      brandText="OnlineLearning"
      navbarRoleLabel="Student"
      sidebarItems={sidebar}
      title="Certificates"
      breadcrumb={[
        { label: "Student", to: "/student/dashboard" },
        { label: "Certificates", active: true },
      ]}
    >
      {error ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {String(error)}
        </div>
      ) : null}

      {/* My Certificates */}
      <div className="card course-card">
        <div className="card-header">
          <h3 className="card-title">My Certificates</h3>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="p-3">
              <i className="fas fa-spinner fa-spin mr-2"></i>Loading...
            </div>
          ) : (
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Code</th>
                  <th style={{ width: "40%" }}>Course</th>
                  <th style={{ width: "20%" }}>Generated</th>
                  <th style={{ width: "10%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {certs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-muted p-3">
                      No certificates yet.
                    </td>
                  </tr>
                ) : (
                  certs.map((c) => {
                    const courseTitle = coursesMap.get(c.courseId)?.title || `Course #${c.courseId}`;
                    const date = c.generatedAt ? String(c.generatedAt).slice(0, 10) : "—";
                    const isDownloading = downloadingCertId === c.id;

                    return (
                      <tr key={c.id}>
                        <td>{c.certificateCode}</td>
                        <td>{courseTitle}</td>
                        <td>{date}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => downloadCertificate(c.id, courseTitle)}
                            type="button"
                            disabled={isDownloading}
                            title="Download as PDF"
                          >
                            {isDownloading ? (
                              <>
                                <i className="fas fa-spinner fa-spin mr-1"></i> Downloading...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-download mr-1"></i> Download
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Generate Certificate */}
      <div className="card course-card">
        <div className="card-header">
          <h3 className="card-title">Generate Certificate</h3>
        </div>

        <div className="card-body">
          {loading ? (
            <div>
              <i className="fas fa-spinner fa-spin mr-2"></i>Loading...
            </div>
          ) : pendingCourses.length === 0 ? (
            <div className="text-muted">No enrolled courses pending certificate.</div>
          ) : (
            <div className="d-flex flex-wrap" style={{ gap: 10 }}>
              {pendingCourses.map((courseId) => {
                const title = coursesMap.get(courseId)?.title || `Course #${courseId}`;
                const eligible = isEligibleForCertificate(courseId);
                const hint = eligibilityHint(courseId);

                const p = progressMap[courseId];
                const overall = p?.overallPercent != null ? Number(p.overallPercent) : null;

                const busy = busyCourseId === courseId;

                return (
                  <div key={courseId} style={{ minWidth: 320 }}>
                    <div className="mb-2">
                      <div className="font-weight-bold">{title}</div>
                      <div className="text-muted" style={{ fontSize: 13 }}>
                        Progress: {overall == null ? "—" : `${overall}%`} • {hint}
                      </div>
                    </div>

                    <button
                      className="btn btn-success"
                      onClick={() => generate(courseId)}
                      disabled={busy || !eligible}
                      type="button"
                      title={!eligible ? hint : ""}
                    >
                      {busy ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>Generating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-certificate mr-2"></i> Generate Certificate
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
