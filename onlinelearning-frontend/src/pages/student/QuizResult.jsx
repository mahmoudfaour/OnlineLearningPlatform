// File: src/pages/student/QuizResult.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardLayout from "../../layouts/DashboardLayout";
import { authHeaders } from "../../utils/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://localhost:5001").replace(/\/$/, "");

export default function QuizResult() {
  const sidebar = [
    { to: "/student/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
    { to: "/student/courses", icon: "fas fa-book", label: "Browse Courses" },
    { to: "/student/progress", icon: "fas fa-chart-line", label: "Progress" },
    { to: "/student/certificates", icon: "fas fa-certificate", label: "Certificates" },
  ];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quizMeta, setQuizMeta] = useState(null); // { title, passingScorePercent, quizQuestions: [...] }

  const [result, setResult] = useState({
    quizTitle: "Quiz Result",
    earnedPoints: null,
    totalPoints: null,
    scorePercent: null,
    passingPercent: null,
    passed: null,
    submittedAt: null,
    answers: [], // normalized: [{ questionId, questionText, pointsEarned, isCorrect }]
  });

  const { attemptId, quizId } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      attemptId: params.get("attemptId"),
      quizId: params.get("quizId"),
    };
  }, []);

  function normalizeSubmitAttemptResponse(raw) {
    if (!raw) return null;

    // Your backend returns: { attemptId, quizId, userId, submittedAt, scorePercent, totalPoints, earnedPoints, answers: [...] }
    const d = raw.result || raw.data || raw;

    const earnedPoints = d.earnedPoints ?? d.EarnedPoints ?? null;
    const totalPoints = d.totalPoints ?? d.TotalPoints ?? null;
    const scorePercent = d.scorePercent ?? d.ScorePercent ?? null;

    const submittedAt = d.submittedAt ?? d.SubmittedAt ?? null;

    const answersRaw = d.answers ?? d.Answers ?? [];
    const answers = Array.isArray(answersRaw)
      ? answersRaw.map((a) => ({
          questionId: a.questionId ?? a.QuestionId ?? null,
          isCorrect: a.isCorrect ?? a.IsCorrect ?? null,
          pointsEarned: a.pointsEarned ?? a.PointsEarned ?? null,
          questionText: null, // we will enrich from quiz details
        }))
      : [];

    return {
      earnedPoints,
      totalPoints,
      scorePercent,
      submittedAt,
      answers,
    };
  }

  useEffect(() => {
    const headers = authHeaders();
    const stored = localStorage.getItem("lastQuizResult");

    async function load() {
      try {
        setLoading(true);
        setError("");

        // 1) Load result from localStorage first (what QuizTake saved)
        let parsed = null;
        if (stored) {
          try {
            parsed = JSON.parse(stored);
          } catch {
            parsed = null;
          }
        }

        const normalized = normalizeSubmitAttemptResponse(parsed);
        if (!normalized) {
          setError("No saved quiz result found. Please submit a quiz again.");
          setLoading(false);
          return;
        }

        // 2) Load quiz meta (title + passing + questions) to fill missing UI fields
        if (quizId) {
          try {
            const quizRes = await axios.get(`${API_BASE}/api/quizzes/${quizId}`, { headers });
            setQuizMeta(quizRes.data || null);
          } catch {
            setQuizMeta(null);
          }
        }

        setResult((prev) => ({
          ...prev,
          ...normalized,
        }));
      } catch (e) {
        setError(e?.response?.data || "Failed to load quiz result.");
      } finally {
        setLoading(false);
      }
    }

    load();

  }, [attemptId, quizId]);

  // Enrich answers with question text once quizMeta is loaded
  useEffect(() => {
    if (!quizMeta?.quizQuestions || !Array.isArray(result.answers)) return;

    const questionMap = new Map();
    for (const qq of quizMeta.quizQuestions) {
      // quizQuestions items contain: questionId, questionText, ...
      questionMap.set(qq.questionId, qq.questionText);
    }

    setResult((prev) => ({
      ...prev,
      quizTitle: quizMeta.title || prev.quizTitle,
      passingPercent: quizMeta.passingScorePercent ?? prev.passingPercent,
      answers: (prev.answers || []).map((a) => ({
        ...a,
        questionText: questionMap.get(a.questionId) || a.questionText || `Question #${a.questionId ?? ""}`,
      })),
    }));
  }, [quizMeta, result.answers]);

  // Compute passed once we know passingPercent (or default 60)
  useEffect(() => {
    const passing = result.passingPercent ?? 60;
    const pct = result.scorePercent;

    if (pct == null) return;

    setResult((prev) => ({
      ...prev,
      passed: Number(pct) >= Number(passing),
    }));
  }, [result.scorePercent, result.passingPercent]);

  const scoreText =
    result.earnedPoints != null && result.totalPoints != null
      ? `${result.earnedPoints}/${result.totalPoints}`
      : result.scorePercent != null
      ? `${result.scorePercent.toFixed(0)}%`
      : "-";

  const pctText = result.scorePercent != null ? `${Number(result.scorePercent).toFixed(0)}%` : "-";

  const passedBadge =
    result.passed === true
      ? { text: "PASSED", cls: "badge badge-success" }
      : result.passed === false
      ? { text: "FAILED", cls: "badge badge-danger" }
      : { text: "N/A", cls: "badge badge-secondary" };

  const submittedAtText = result.submittedAt
    ? String(result.submittedAt).slice(0, 19).replace("T", " ")
    : "-";

  return (
    <DashboardLayout
      brandIconClass="fas fa-graduation-cap"
      brandText="OnlineLearning"
      navbarRoleLabel="Student"
      sidebarItems={sidebar}
      title="Quiz Result"
      breadcrumb={[
        { label: "Student", to: "/student/dashboard" },
        { label: "Quiz Result", active: true },
      ]}
    >
      {error ? (
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle mr-2" />
          {String(error)}
        </div>
      ) : null}

      {loading ? (
        <div className="card">
          <div className="card-body">
            <i className="fas fa-spinner fa-spin mr-2" />
            Loading result...
          </div>
        </div>
      ) : (
        <>
          <div className="row">
            <div className="col-lg-3 col-6">
              <div className="small-box bg-info">
                <div className="inner">
                  <h3>{scoreText}</h3>
                  <p>Score</p>
                </div>
                <div className="icon">
                  <i className="fas fa-star" />
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-6">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>{pctText}</h3>
                  <p>Percentage</p>
                </div>
                <div className="icon">
                  <i className="fas fa-percent" />
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-6">
              <div className="small-box bg-warning">
                <div className="inner">
                  <h3>—</h3>
                  <p>Time Taken</p>
                </div>
                <div className="icon">
                  <i className="fas fa-clock" />
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-6">
              <div className="small-box bg-danger">
                <div className="inner">
                  <h3>
                    <span className={passedBadge.cls}>{passedBadge.text}</span>
                  </h3>
                  <p>Result</p>
                </div>
                <div className="icon">
                  <i className="fas fa-check-circle" />
                </div>
              </div>
            </div>
          </div>

          <div className="card course-card">
            <div className="card-header">
              <h3 className="card-title mb-0">Details</h3>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <strong>Quiz:</strong> {result.quizTitle || "-"}
                </div>
                <div className="col-md-4">
                  <strong>Passing Percent:</strong>{" "}
                  {result.passingPercent != null ? `${result.passingPercent}%` : "60%"}
                </div>
                <div className="col-md-4">
                  <strong>Submitted At:</strong> {submittedAtText}
                </div>
              </div>
              <div className="mt-2">
                <strong>Attempt ID:</strong> {attemptId || "-"}
              </div>
            </div>
          </div>

          <div className="card course-card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h3 className="card-title mb-0">Answer Breakdown</h3>
              <small className="text-muted">
                Your backend returns correctness + points only (not selected text). That’s why answers show “—”.
              </small>
            </div>

            <div className="card-body">
              {result.answers.length === 0 ? (
                <div className="text-muted">No answers returned by backend.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>Question</th>
                        <th style={{ width: 140 }}>Points Earned</th>
                        <th style={{ width: 140 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.answers.map((a, idx) => {
                        const ok = a.isCorrect === true;
                        const badge = ok ? "badge badge-success" : "badge badge-danger";
                        return (
                          <tr key={`${a.questionId ?? idx}`}>
                            <td>{idx + 1}</td>
                            <td>{a.questionText || `Question #${a.questionId ?? idx + 1}`}</td>
                            <td>{a.pointsEarned ?? "-"}</td>
                            <td>
                              <span className={badge}>{ok ? "Correct" : "Wrong"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card-footer">
              <button
                className="btn btn-outline-secondary mr-2"
                onClick={() => (window.location.href = "/student/courses")}
                type="button"
              >
                <i className="fas fa-book mr-1" /> Back to Courses
              </button>

              <button
                className="btn btn-primary"
                onClick={() => (window.location.href = "/student/quizzes")}
                type="button"
              >
                <i className="fas fa-redo mr-1" /> Take Another Quiz
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
