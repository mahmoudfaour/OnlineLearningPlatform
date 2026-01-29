import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "https://localhost:7244";

function authHeadersOnly() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function authHeadersJson() {
  return { ...authHeadersOnly(), "Content-Type": "application/json" };
}

async function readJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  return text ? JSON.parse(text) : null;
}

export default function AiQuizReview() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [lessons, setLessons] = useState([]);
  const [lessonId, setLessonId] = useState("");

  const [count, setCount] = useState(5);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) return nav("/login");
    if (role !== "Instructor") return nav("/login");
  }, [nav]);

  async function loadCourses() {
    const res = await fetch(`${API_BASE}/api/Courses/mine`, {
      headers: authHeadersOnly(),
    });
    const data = await readJson(res);
    const list = Array.isArray(data) ? data : [];
    setCourses(list);

    if (list.length > 0) {
      const firstId = String(list[0].id ?? list[0].Id);
      setCourseId((prev) => prev || firstId);
    }
  }

  async function loadLessons(cid) {
    if (!cid) return;

    const res = await fetch(`${API_BASE}/api/courses/${cid}/lessons`, {
      headers: authHeadersOnly(),
    });
    const data = await readJson(res);
    const list = Array.isArray(data) ? data : [];
    setLessons(list);

    if (list.length > 0) {
      const first = String(list[0].id ?? list[0].Id);
      setLessonId((prev) => prev || first);
    } else {
      setLessonId("");
      setDraft(null);
    }
  }

  async function loadLatestDraft(lid) {
    if (!lid) return setDraft(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/instructor/ai-quiz/drafts/latest?lessonId=${lid}`,
        { headers: authHeadersOnly() }
      );
      const data = await readJson(res);
      setDraft(normalizeDraft(data));
    } catch {
      setDraft(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        await loadCourses();
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setDraft(null);
        await loadLessons(courseId);
      } catch (e) {
        setErr(String(e?.message || e));
        setLessons([]);
        setLessonId("");
        setDraft(null);
      }
    })();
  }, [courseId]);

  useEffect(() => {
    loadLatestDraft(lessonId);
  }, [lessonId]);

  const selectedCourse = useMemo(() => {
    const idNum = Number(courseId);
    return courses.find((c) => (c.id ?? c.Id) === idNum) || null;
  }, [courses, courseId]);

  const selectedLesson = useMemo(() => {
    const idNum = Number(lessonId);
    return lessons.find((l) => (l.id ?? l.Id) === idNum) || null;
  }, [lessons, lessonId]);

  async function generateDraft() {
    if (!lessonId) return alert("Please select a lesson first.");

    let safeCount = Number(count);
    if (Number.isNaN(safeCount) || safeCount < 1) safeCount = 1;
    if (safeCount > 20) safeCount = 20;

    setBusy(true);
    setErr("");

    try {
      const res = await fetch(
        `${API_BASE}/api/instructor/lessons/${lessonId}/ai-quiz/generate?count=${safeCount}`,
        { method: "POST", headers: authHeadersOnly() }
      );
      await readJson(res);
      await loadLatestDraft(lessonId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;

    const payload = {
      id: draft.id,
      questions: draft.questions.map((q) => ({
        id: q.id ?? 0,
        questionText: q.questionText ?? "",
        questionType: q.questionType ?? "MCQ",
        explanation: q.explanation ?? "",
        options: (q.options ?? []).map((o) => ({
          id: o.id ?? 0,
          answerText: o.answerText ?? "",
          isCorrect: !!o.isCorrect,
        })),
      })),
    };

    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/instructor/ai-quiz/drafts/${draft.id}`, {
        method: "PUT",
        headers: authHeadersJson(),
        body: JSON.stringify(payload),
      });

      if (res.status !== 204) await readJson(res);

      await loadLatestDraft(lessonId);
      alert("Draft saved ✅");
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function approveDraft() {
    if (!draft) return;

    setBusy(true);
    setErr("");

    try {
      const res = await fetch(
        `${API_BASE}/api/instructor/ai-quiz/drafts/${draft.id}/approve`,
        { method: "POST", headers: authHeadersOnly() }
      );

      if (res.status === 204) {
        alert("Approved ✅ Saved to Question Bank.");
      } else {
        const data = await readJson(res); // expects { questionBankId, createdQuestionsCount, createdQuestionIds }
        const bankId = data?.questionBankId ?? data?.QuestionBankId;
        alert(`Approved ✅ Saved to Question Bank #${bankId}`);
      }

      // After approve we delete draft in backend, so reload latest => null
      await loadLatestDraft(lessonId);
    } catch (e) {
      setErr(String(e?.message || e));
      alert(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // =========================
  // UI editing helpers
  // =========================

  function updateQuestion(qIndex, patch) {
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      copy.questions[qIndex] = { ...copy.questions[qIndex], ...patch };
      return copy;
    });
  }

  function updateOption(qIndex, oIndex, patch) {
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      copy.questions[qIndex].options[oIndex] = {
        ...copy.questions[qIndex].options[oIndex],
        ...patch,
      };
      return copy;
    });
  }

  function setCorrect(qIndex, optionId) {
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      const q = copy.questions[qIndex];
      q.options = q.options.map((o) => ({ ...o, isCorrect: o.id === optionId }));
      return copy;
    });
  }

  function addQuestion() {
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      copy.questions.push({
        id: 0,
        questionText: "",
        questionType: "MCQ",
        explanation: "",
        options: [
          { id: 0, answerText: "Option A", isCorrect: true },
          { id: 0, answerText: "Option B", isCorrect: false },
        ],
      });
      return copy;
    });
  }

  function deleteQuestion(qIndex) {
    if (!confirm("Delete this question?")) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      copy.questions.splice(qIndex, 1);
      return copy;
    });
  }

  function addOption(qIndex) {
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      copy.questions[qIndex].options.push({ id: 0, answerText: "", isCorrect: false });
      return copy;
    });
  }

  function deleteOption(qIndex, oIndex) {
    const q = draft?.questions?.[qIndex];
    if (!q) return;
    if ((q.options?.length ?? 0) <= 2) return alert("Keep at least 2 options.");

    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      copy.questions[qIndex].options.splice(oIndex, 1);

      const opts = copy.questions[qIndex].options;
      if (opts.length && !opts.some((x) => x.isCorrect)) opts[0].isCorrect = true;

      return copy;
    });
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="AI Quiz Review"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "AI Quiz Review", active: true },
      ]}
    >
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

      <div className="card">
        <div className="card-body">
          <div className="row" style={{ rowGap: 12 }}>
            <div className="col-md-5">
              <label className="mb-1">Course</label>
              <select
                className="form-control"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                {courses.length === 0 ? (
                  <option value="">No courses found</option>
                ) : (
                  courses.map((c) => {
                    const id = c.id ?? c.Id;
                    const title = c.title ?? c.Title ?? `Course #${id}`;
                    return (
                      <option key={id} value={id}>
                        #{id} — {title}
                      </option>
                    );
                  })
                )}
              </select>

              {selectedCourse ? (
                <small className="text-muted d-block mt-1">
                  Status:{" "}
                  {selectedCourse.isPublished ?? selectedCourse.IsPublished ? (
                    <span className="badge badge-success">Published</span>
                  ) : (
                    <span className="badge badge-warning">Unpublished</span>
                  )}
                </small>
              ) : null}
            </div>

            <div className="col-md-4">
              <label className="mb-1">Lesson</label>
              <select
                className="form-control"
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                disabled={!courseId || lessons.length === 0}
              >
                {lessons.length === 0 ? (
                  <option value="">No lessons found</option>
                ) : (
                  lessons.map((l) => {
                    const id = l.id ?? l.Id;
                    const title = l.title ?? l.Title ?? `Lesson #${id}`;
                    const order = l.orderIndex ?? l.OrderIndex;
                    return (
                      <option key={id} value={id}>
                        {order != null ? `${order}. ` : ""}
                        {title}
                      </option>
                    );
                  })
                )}
              </select>

              {selectedLesson ? (
                <small className="text-muted d-block mt-1">
                  Type:{" "}
                  <span className="badge badge-info">
                    {selectedLesson.lessonType ?? selectedLesson.LessonType ?? "—"}
                  </span>
                </small>
              ) : null}
            </div>

            <div className="col-md-3">
              <label className="mb-1">Questions to generate</label>
              <input
                className="form-control"
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                disabled={busy}
              />
              <small className="text-muted">Min 1, max 20</small>
            </div>
          </div>

          <div className="d-flex justify-content-end mt-3" style={{ gap: 10 }}>
            <Link className="btn btn-outline-secondary" to="/instructor/lessons">
              Back to Lessons
            </Link>

            <button
              className="btn btn-primary"
              type="button"
              onClick={generateDraft}
              disabled={busy || !lessonId}
            >
              <i className={`fas ${busy ? "fa-spinner fa-spin" : "fa-magic"} mr-2`} />
              Generate Draft
            </button>

            <button
              className="btn btn-success"
              type="button"
              onClick={saveDraft}
              disabled={busy || !draft}
              title={!draft ? "Generate a draft first" : "Save current edits"}
            >
              <i className="fas fa-save mr-2" />
              Save Draft
            </button>

            <button
              className="btn btn-warning"
              type="button"
              onClick={approveDraft}
              disabled={busy || !draft}
              title="Persist to QuestionBank/Questions/AnswerOptions"
            >
              <i className="fas fa-check mr-2" />
              Approve
            </button>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4 className="mb-0">Draft Questions</h4>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={addQuestion}
          disabled={!draft || busy}
        >
          <i className="fas fa-plus mr-1" /> Add Question
        </button>
      </div>

      {!draft ? (
        <div className="card">
          <div className="card-body text-muted">
            Select a lesson and click <b>Generate Draft</b>. If a draft already exists, it will load automatically.
          </div>
        </div>
      ) : (
        <>
          <div className="mb-2 text-muted">
            Draft #{draft.id} — {draft.questions?.length ?? 0} questions
          </div>

          {(draft.questions ?? []).length === 0 ? (
            <div className="card">
              <div className="card-body text-muted">No questions in this draft.</div>
            </div>
          ) : (
            (draft.questions ?? []).map((q, qi) => (
              <div className="card" key={q.id || `q-${qi}`}>
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <b>Q{qi + 1}</b>{" "}
                    <span className="text-muted">#{q.id ? q.id : "new"}</span>
                  </div>

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteQuestion(qi)}
                    disabled={busy}
                  >
                    <i className="fas fa-trash mr-1" /> Delete
                  </button>
                </div>

                <div className="card-body">
                  <div className="form-group">
                    <label>Question Text</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={q.questionText ?? ""}
                      onChange={(e) => updateQuestion(qi, { questionText: e.target.value })}
                      disabled={busy}
                    />
                  </div>

                  <div className="form-group">
                    <label>Explanation (optional)</label>
                    <input
                      className="form-control"
                      value={q.explanation ?? ""}
                      onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                      disabled={busy}
                    />
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <label className="mb-0">Options</label>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => addOption(qi)}
                      disabled={busy}
                    >
                      <i className="fas fa-plus mr-1" /> Add option
                    </button>
                  </div>

                  <div className="mt-2">
                    {(q.options ?? []).map((o, oi) => (
                      <div
                        className="d-flex align-items-center mb-2"
                        key={o.id || `o-${qi}-${oi}`}
                        style={{ gap: 10 }}
                      >
                        <input
                          type="radio"
                          name={`correct_${qi}`}
                          checked={!!o.isCorrect}
                          onChange={() => setCorrect(qi, o.id)}
                          disabled={busy}
                          title="Mark correct"
                        />

                        <input
                          className="form-control"
                          value={o.answerText ?? ""}
                          onChange={(e) => updateOption(qi, oi, { answerText: e.target.value })}
                          disabled={busy}
                        />

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteOption(qi, oi)}
                          disabled={busy || (q.options?.length ?? 0) <= 2}
                          title={(q.options?.length ?? 0) <= 2 ? "Keep at least 2 options" : "Delete option"}
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <small className="text-muted">Only one correct option is allowed (MCQ).</small>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function normalizeDraft(d) {
  if (!d) return null;

  return {
    id: d.id ?? d.Id,
    courseId: d.courseId ?? d.CourseId,
    lessonId: d.lessonId ?? d.LessonId,
    userId: d.userId ?? d.UserId,
    createdAt: d.createdAt ?? d.CreatedAt,
    questions: (d.questions ?? d.Questions ?? []).map((q) => ({
      id: q.id ?? q.Id ?? 0,
      questionText: q.questionText ?? q.QuestionText ?? "",
      questionType: q.questionType ?? q.QuestionType ?? "MCQ",
      explanation: q.explanation ?? q.Explanation ?? "",
      options: (q.options ?? q.Options ?? []).map((o) => ({
        id: o.id ?? o.Id ?? 0,
        answerText: o.answerText ?? o.AnswerText ?? "",
        isCorrect: o.isCorrect ?? o.IsCorrect ?? false,
      })),
    })),
  };
}
