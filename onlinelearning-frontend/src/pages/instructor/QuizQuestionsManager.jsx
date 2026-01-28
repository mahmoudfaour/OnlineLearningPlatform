import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://localhost:5001";

function headersJson() {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : {};
}
function headersAuthOnly() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function QuizQuestionsManager() {
const { quizId } = useParams();
const idNum = Number(quizId);


  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [quiz, setQuiz] = useState(null);
  const [items, setItems] = useState([]); // quiz questions from /api/quizzes/{quizId}/questions

  // ✅ Option B: QuestionBanks + Questions dropdown
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksErr, setBanksErr] = useState("");
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState("");

  const [bankQuestionsLoading, setBankQuestionsLoading] = useState(false);
  const [bankQuestionsErr, setBankQuestionsErr] = useState("");
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");

  // Add form
  const [addForm, setAddForm] = useState({
    points: 1,
    orderIndex: 1,
  });

  // inline edit state (quizQuestionId -> {points, orderIndex})
  const [editMap, setEditMap] = useState({});
  const [busyId, setBusyId] = useState(null);

  // ---------- Load quiz details ----------
  const loadQuiz = useCallback(async () => {
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${idNum}`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setQuiz(data);

      const maxOrder =
        (data?.quizQuestions || []).length > 0
          ? Math.max(...data.quizQuestions.map((x) => Number(x.orderIndex ?? 0)))
          : 0;

      setAddForm((p) => ({ ...p, orderIndex: maxOrder + 1 }));
    } catch (e) {
      setErr(String(e?.message || e));
      setQuiz(null);
    }
  }, [idNum]);

  // ---------- Load quiz questions list ----------
  const loadQuizQuestions = useCallback(async () => {
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${idNum}/questions`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setItems(list);

      const nextMap = {};
      for (const qq of list) {
        nextMap[qq.id] = {
          points: qq.points ?? 1,
          orderIndex: qq.orderIndex ?? 1,
        };
      }
      setEditMap(nextMap);

      const maxOrder =
        list.length > 0 ? Math.max(...list.map((x) => Number(x.orderIndex ?? 0))) : 0;
      setAddForm((p) => ({ ...p, orderIndex: maxOrder + 1 }));
    } catch (e) {
      setErr(String(e?.message || e));
      setItems([]);
      setEditMap({});
    }
  }, [idNum]);

  // ---------- Load question banks ----------
  const loadBanks = useCallback(async () => {
    setBanksErr("");
    setBanksLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/QuestionBanks`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setBanks(list);

      // auto select first bank if none selected
      if (list.length > 0 && !selectedBankId) {
        setSelectedBankId(String(list[0].id));
      }
    } catch (e) {
      setBanksErr(String(e?.message || e));
      setBanks([]);
    } finally {
      setBanksLoading(false);
    }
  }, [selectedBankId]);

  // ---------- Load questions for a bank ----------
  const loadQuestionsByBank = useCallback(async (bankId) => {
    if (!bankId) return;

    setBankQuestionsErr("");
    setBankQuestionsLoading(true);
    setBankQuestions([]);
    setSelectedQuestionId("");

    try {
      const res = await fetch(`${API_BASE}/api/question-banks/${bankId}/questions`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setBankQuestions(list);

      // auto select first question
      if (list.length > 0) {
        setSelectedQuestionId(String(list[0].id));
      }
    } catch (e) {
      setBankQuestionsErr(String(e?.message || e));
      setBankQuestions([]);
    } finally {
      setBankQuestionsLoading(false);
    }
  }, []);

  // ---------- Init ----------
  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadQuiz();
      await loadQuizQuestions();
      await loadBanks();
      setLoading(false);
    }
    init();
  }, [loadQuiz, loadQuizQuestions, loadBanks]);

  // when bank changes, load its questions
  useEffect(() => {
    if (selectedBankId) loadQuestionsByBank(selectedBankId);
  }, [selectedBankId, loadQuestionsByBank]);

  const quizTitle = useMemo(() => quiz?.title || `Quiz #${idNum}`, [quiz, idNum]);

  const selectedQuestion = useMemo(() => {
    const qid = Number(selectedQuestionId);
    return bankQuestions.find((q) => q.id === qid) || null;
  }, [bankQuestions, selectedQuestionId]);

  function setAddField(name, value) {
    setAddForm((p) => ({ ...p, [name]: value }));
  }

  function setEditField(qqId, name, value) {
    setEditMap((p) => ({
      ...p,
      [qqId]: { ...(p[qqId] || {}), [name]: value },
    }));
  }

  async function addQuestion(e) {
    e.preventDefault();

    const questionIdNum = Number(selectedQuestionId);
    if (!questionIdNum) return alert("Select a question first.");

    const pointsNum = Number(addForm.points);
    const orderNum = Number(addForm.orderIndex);

    try {
      setBusyId("add");
      const res = await fetch(`${API_BASE}/api/quizzes/${idNum}/questions`, {
        method: "POST",
        headers: headersJson(),
        body: JSON.stringify({
          questionId: questionIdNum,
          points: pointsNum,
          orderIndex: orderNum,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      await loadQuiz();
      await loadQuizQuestions();

      // bump orderIndex for next add
      setAddForm((p) => ({ ...p, orderIndex: Number(orderNum) + 1 }));
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  async function updateQuizQuestion(qqId) {
    const s = editMap[qqId];
    if (!s) return;

    try {
      setBusyId(qqId);
      const res = await fetch(`${API_BASE}/api/quiz-questions/${qqId}`, {
        method: "PUT",
        headers: headersJson(),
        body: JSON.stringify({
          questionId: 0, // ignored by backend (you said it doesn't allow changing questionId/quizId)
          points: Number(s.points),
          orderIndex: Number(s.orderIndex),
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      await loadQuiz();
      await loadQuizQuestions();
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  async function removeQuizQuestion(qq) {
    if (!confirm("Remove this question from the quiz?")) return;

    try {
      setBusyId(qq.id);
      const res = await fetch(`${API_BASE}/api/quiz-questions/${qq.id}`, {
        method: "DELETE",
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());

      await loadQuiz();
      await loadQuizQuestions();
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="Quiz Questions"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "Quizzes", to: "/instructor/quizzes" },
        { label: "Questions", active: true },
      ]}
    >
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Link to="/instructor/quizzes" className="btn btn-outline-secondary btn-sm">
          <i className="fas fa-arrow-left mr-1" />
          Back to Quizzes
        </Link>
        <span className="text-muted">Quiz ID: {idNum}</span>
      </div>

      {loading ? (
        <div className="card">
          <div className="card-body">
            <i className="fas fa-spinner fa-spin mr-2" /> Loading...
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-2" />
          {err}
        </div>
      ) : null}

      {/* Quiz details */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">{quizTitle}</h3>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <div className="small-box bg-info">
                <div className="inner">
                  <h3>{quiz?.passingScorePercent ?? "-"}%</h3>
                  <p>Passing Score</p>
                </div>
                <div className="icon">
                  <i className="fas fa-check-circle" />
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="small-box bg-warning">
                <div className="inner">
                  <h3>{quiz?.timeLimitSeconds ?? "-"}s</h3>
                  <p>Time Limit</p>
                </div>
                <div className="icon">
                  <i className="fas fa-clock" />
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="small-box bg-secondary">
                <div className="inner">
                  <h3>{quiz?.isFinal ? "YES" : "NO"}</h3>
                  <p>Final Quiz</p>
                </div>
                <div className="icon">
                  <i className="fas fa-flag-checkered" />
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>{items.length}</h3>
                  <p>Questions Added</p>
                </div>
                <div className="icon">
                  <i className="fas fa-list" />
                </div>
              </div>
            </div>
          </div>

          <small className="text-muted">Quiz details from: GET /api/quizzes/{`{id}`}</small>
        </div>
      </div>

      {/* ✅ Option B: Pick bank + question */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">Pick from Question Bank</h3>
        </div>
        <div className="card-body">
          {banksErr ? (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-triangle mr-2" />
              {banksErr}
            </div>
          ) : null}

          <div className="form-row">
            <div className="form-group col-md-6">
              <label>Question Bank</label>
              <select
                className="form-control"
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                disabled={banksLoading}
              >
                {banks.length === 0 ? (
                  <option value="">No banks found</option>
                ) : (
                  banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bank #{b.id} — {b.sourceType}
                      {b.courseId ? ` (Course ${b.courseId})` : ""}
                      {b.lessonId ? ` (Lesson ${b.lessonId})` : ""}
                    </option>
                  ))
                )}
              </select>
              <small className="text-muted">Uses: GET /api/QuestionBanks</small>
            </div>

            <div className="form-group col-md-6">
              <label>Question</label>
              <select
                className="form-control"
                value={selectedQuestionId}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
                disabled={!selectedBankId || bankQuestionsLoading}
              >
                {bankQuestions.length === 0 ? (
                  <option value="">
                    {bankQuestionsLoading ? "Loading questions..." : "No questions found"}
                  </option>
                ) : (
                  bankQuestions.map((q) => (
                    <option key={q.id} value={q.id}>
                      Q#{q.id} — {String(q.questionText || "").slice(0, 60)}
                      {String(q.questionText || "").length > 60 ? "..." : ""}
                    </option>
                  ))
                )}
              </select>
              <small className="text-muted">
                Uses: GET /api/question-banks/{`{bankId}`}/questions
              </small>
            </div>
          </div>

          {bankQuestionsErr ? (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-triangle mr-2" />
              {bankQuestionsErr}
            </div>
          ) : null}

          {/* Preview */}
          {selectedQuestion ? (
            <div className="alert alert-info mb-0">
              <div className="d-flex justify-content-between flex-wrap" style={{ gap: 8 }}>
                <div>
                  <strong>Selected Question:</strong> #{selectedQuestion.id}
                </div>
                <div>
                  <span className="badge badge-info">{selectedQuestion.questionType}</span>
                </div>
              </div>
              <div className="mt-2">{selectedQuestion.questionText}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Add question to quiz */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">Add Selected Question to Quiz</h3>
        </div>
        <div className="card-body">
          <form onSubmit={addQuestion}>
            <div className="form-row">
              <div className="form-group col-md-4">
                <label>Question ID</label>
                <input
                  className="form-control"
                  value={selectedQuestionId || ""}
                  readOnly
                  placeholder="Select a question above"
                />
              </div>

              <div className="form-group col-md-4">
                <label>Points</label>
                <input
                  type="number"
                  className="form-control"
                  value={addForm.points}
                  onChange={(e) => setAddField("points", e.target.value)}
                  min={1}
                  required
                />
              </div>

              <div className="form-group col-md-4">
                <label>Order Index</label>
                <input
                  type="number"
                  className="form-control"
                  value={addForm.orderIndex}
                  onChange={(e) => setAddField("orderIndex", e.target.value)}
                  min={1}
                  required
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={busyId === "add" || !selectedQuestionId}
            >
              <i className="fas fa-plus mr-2" />
              {busyId === "add" ? "Adding..." : "Add to Quiz"}
            </button>
          </form>

          <small className="text-muted d-block mt-2">
            Uses: POST /api/quizzes/{`{idNum}`}/questions
          </small>
        </div>
      </div>

      {/* Current questions list */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">Quiz Questions</h3>
        </div>
        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Order</th>
                <th style={{ width: 90 }}>QQ ID</th>
                <th style={{ width: 110 }}>Q ID</th>
                <th>Question</th>
                <th style={{ width: 160 }}>Type</th>
                <th style={{ width: 120 }}>Points</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted">
                    No questions added yet.
                  </td>
                </tr>
              ) : (
                items.map((qq) => {
                  const state = editMap[qq.id] || {
                    points: qq.points,
                    orderIndex: qq.orderIndex,
                  };

                  return (
                    <tr key={qq.id}>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={state.orderIndex}
                          min={1}
                          onChange={(e) => setEditField(qq.id, "orderIndex", e.target.value)}
                        />
                      </td>
                      <td>{qq.id}</td>
                      <td>{qq.questionId}</td>
                      <td>{qq.questionText}</td>
                      <td>
                        <span className="badge badge-info">{qq.questionType}</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={state.points}
                          min={1}
                          onChange={(e) => setEditField(qq.id, "points", e.target.value)}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-success mr-2"
                          onClick={() => updateQuizQuestion(qq.id)}
                          disabled={busyId === qq.id}
                        >
                          <i className="fas fa-save" />{" "}
                          {busyId === qq.id ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeQuizQuestion(qq)}
                          disabled={busyId === qq.id}
                        >
                          <i className="fas fa-trash" /> Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <small className="text-muted">
            Uses: GET /api/quizzes/{`{idNum}`}/questions, PUT/DELETE /api/quiz-questions/{`{id}`}
          </small>
        </div>
      </div>
    </DashboardLayout>
  );
}
