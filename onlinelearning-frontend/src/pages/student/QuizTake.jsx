import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import axios from "axios";
import { authHeaders, getUserIdFromToken } from "../../utils/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://localhost:5001").replace(/\/$/, "");

export default function QuizTake() {
  const navigate = useNavigate();

  const sidebar = [
    { to: "/student/dashboard", icon: "fas fa-tachometer-alt", label: "Dashboard" },
    { to: "/student/courses", icon: "fas fa-book", label: "Browse Courses" },
    { to: "/student/progress", icon: "fas fa-chart-line", label: "Progress" },
    { to: "/student/certificates", icon: "fas fa-certificate", label: "Certificates" },
  ];

  const userId = getUserIdFromToken();
  const headers = useMemo(() => authHeaders(), []);

  // read courseId from query: /student/quiz?courseId=1
  const courseId = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return Number(p.get("courseId"));
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quiz, setQuiz] = useState(null); // {id,title,passingScorePercent,quizQuestions:[...]}
  const [attemptId, setAttemptId] = useState(null);

  // answers state:
  // { [questionId]: { selectedAnswerOptionId?, selectedAnswerOptionIds?, shortAnswerText? } }
  const [answers, setAnswers] = useState({});

  // helpers for question types
  function setSingle(qid, optionId) {
    setAnswers((prev) => ({ ...prev, [qid]: { selectedAnswerOptionId: optionId } }));
  }

  function toggleMulti(qid, optionId) {
    setAnswers((prev) => {
      const current = prev[qid]?.selectedAnswerOptionIds || [];
      const next = current.includes(optionId)
        ? current.filter((x) => x !== optionId)
        : [...current, optionId];
      return { ...prev, [qid]: { selectedAnswerOptionIds: next } };
    });
  }

  function setText(qid, value) {
    setAnswers((prev) => ({ ...prev, [qid]: { shortAnswerText: value } }));
  }

  useEffect(() => {
    if (!userId) {
      setError("Please login as Student.");
      setLoading(false);
      return;
    }
    if (!courseId || Number.isNaN(courseId)) {
      setError("Missing courseId in URL. Example: /student/quiz?courseId=1");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError("");

        // 1) get quizzes of the course
        const quizzesRes = await axios.get(`${API_BASE}/api/courses/${courseId}/quizzes`, { headers });
        const quizzes = quizzesRes.data || [];

        const finalQuiz =
          quizzes.find((q) => q.isFinal === true) ||
          quizzes.find((q) => String(q.title).toLowerCase().includes("final"));

        if (!finalQuiz) {
          setError("Final quiz not found for this course.");
          setLoading(false);
          return;
        }

        // 2) start attempt (backend blocks final quiz if lessons not completed)
        const startRes = await axios.post(
          `${API_BASE}/api/student/quizzes/${finalQuiz.id}/attempts/start`,
          { userId },
          { headers }
        );

        const startedAttemptId = startRes.data?.attemptId;
        setAttemptId(startedAttemptId);

        // 3) load full quiz details (questions + answerOptions)
        const quizRes = await axios.get(`${API_BASE}/api/quizzes/${finalQuiz.id}`, { headers });
        setQuiz(quizRes.data);
      } catch (e) {
        setError(e?.response?.data || "Failed to load quiz.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId, courseId, headers]);

  async function submit() {
    if (!attemptId || !quiz) return;

    try {
      setError("");

      const payload = {
        answers: (quiz.quizQuestions || []).map((qq) => {
          const qid = qq.questionId;
          const a = answers[qid] || {};
          return {
            questionId: qid,
            selectedAnswerOptionId: a.selectedAnswerOptionId ?? null,
            selectedAnswerOptionIds: a.selectedAnswerOptionIds ?? [],
            shortAnswerText: a.shortAnswerText ?? null,
          };
        }),
      };

      const res = await axios.post(
        `${API_BASE}/api/student/quizzes/attempts/${attemptId}/submit`,
        payload,
        { headers }
      );

      localStorage.setItem("lastQuizResult", JSON.stringify(res.data));

      navigate(`/student/quiz-result?attemptId=${attemptId}&quizId=${quiz.id}&courseId=${courseId}`);
    } catch (e) {
      setError(e?.response?.data || "Submit failed.");
    }
  }

  return (
    <DashboardLayout
      brandIconClass="fas fa-graduation-cap"
      brandText="OnlineLearning"
      navbarRoleLabel="Student"
      sidebarItems={sidebar}
      title="Take Final Quiz"
      breadcrumb={[
        { label: "Student", to: "/student/dashboard" },
        { label: "Courses", to: "/student/courses" },
        { label: "Final Quiz", active: true },
      ]}
    >
      {error ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          {String(error)}
        </div>
      ) : null}

      <div className="card course-card">
        <div className="card-body">
          {loading ? (
            <div>Loading quiz...</div>
          ) : !quiz ? (
            <div className="text-muted">Quiz not available.</div>
          ) : (
            <>
              <div className="d-flex justify-content-between flex-wrap" style={{ gap: 10 }}>
                <div>
                  <h3 className="mb-1">{quiz.title}</h3>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    Passing score: {quiz.passingScorePercent ?? 60}%
                  </div>
                </div>
                <button className="btn btn-outline-secondary" onClick={() => navigate(-1)} type="button">
                  <i className="fas fa-arrow-left mr-1"></i> Back
                </button>
              </div>

              <hr />

              {(quiz.quizQuestions || []).map((qq, idx) => {
                const q = qq;
                const qid = q.questionId;

                return (
                  <div className="card course-card" key={q.id}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between">
                        <h5 className="mb-3">
                          Q{idx + 1}. {q.questionText}
                        </h5>
                        <span className="badge badge-light">#{qid}</span>
                      </div>

                      {Array.isArray(q.answerOptions) && q.answerOptions.length > 0 ? (
                        <>
                          {String(q.questionType).toLowerCase() === "msq" ? (
                            q.answerOptions.map((op) => {
                              const selected = (answers[qid]?.selectedAnswerOptionIds || []).includes(op.id);
                              return (
                                <div className="custom-control custom-checkbox mb-2" key={op.id}>
                                  <input
                                    type="checkbox"
                                    id={`q${qid}_o${op.id}`}
                                    className="custom-control-input"
                                    checked={selected}
                                    onChange={() => toggleMulti(qid, op.id)}
                                  />
                                  <label className="custom-control-label" htmlFor={`q${qid}_o${op.id}`}>
                                    {op.answerText}
                                  </label>
                                </div>
                              );
                            })
                          ) : (
                            q.answerOptions.map((op) => (
                              <div className="custom-control custom-radio mb-2" key={op.id}>
                                <input
                                  type="radio"
                                  id={`q${qid}_o${op.id}`}
                                  name={`q${qid}`}
                                  className="custom-control-input"
                                  checked={answers[qid]?.selectedAnswerOptionId === op.id}
                                  onChange={() => setSingle(qid, op.id)}
                                />
                                <label className="custom-control-label" htmlFor={`q${qid}_o${op.id}`}>
                                  {op.answerText}
                                </label>
                              </div>
                            ))
                          )}
                        </>
                      ) : (
                        <div className="form-group">
                          <label className="text-muted">Short answer:</label>
                          <input
                            className="form-control"
                            value={answers[qid]?.shortAnswerText || ""}
                            onChange={(e) => setText(qid, e.target.value)}
                            placeholder="Type your answer..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <button className="btn btn-primary btn-block" onClick={submit} type="button">
                <i className="fas fa-paper-plane mr-1"></i> Submit Quiz
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
