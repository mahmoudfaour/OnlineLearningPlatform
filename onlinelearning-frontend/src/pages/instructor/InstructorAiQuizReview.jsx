import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "https://localhost:7244";

function authHeadersJson() {
  const token = localStorage.getItem("token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}
function authHeadersOnly() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function readJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
  return text ? JSON.parse(text) : null;
}

export default function InstructorAiQuizReview() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [lessons, setLessons] = useState([]);
  const [lessonId, setLessonId] = useState("");

  const [count, setCount] = useState(5);

  const [draft, setDraft] = useState(null); // AiQuizDraftReadDto

  // guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) window.location.href = "/login";
    if (role !== "Instructor") window.location.href = "/login";
  }, []);

  async function loadCourses() {
    const res = await fetch(`${API_BASE}/api/Courses/mine`, {
      headers: authHeadersOnly(),
    });
    const data = await readJson(res);
    const list = Array.isArray(data) ? data : [];
    setCourses(list);
    if (list.length && !courseId) setCourseId(String(list[0].id ?? list[0].Id));
  }

  async function loadLessons(cid) {
    if (!cid) return;
    const res = await fetch(`${API_BASE}/api/courses/${cid}/lessons`, {
      headers: authHeadersOnly(),
    });
    const data = await readJson(res);
    const list = Array.isArray(data) ? data : [];
    setLessons(list);
    if (list.length && !lessonId) setLessonId(String(list[0].id ?? list[0].Id));
  }

  async function loadLatestDraft(lid) {
    if (!lid) return setDraft(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/instructor/ai-quiz/drafts/latest?lessonId=${lid}`,
        { headers: authHeadersOnly() }
      );
      const data = await readJson(res);
      setDraft(data);
    } catch {
      setDraft(null); // no draft found is ok
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        await loadLessons(courseId);
      } catch (e) {
        setErr(String(e?.message || e));
        setLessons([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    loadLatestDraft(lessonId);
  }, [lessonId]);

  const selectedCourse = useMemo(() => {
    const n = Number(courseId);
    return courses.find((c) => (c.id ?? c.Id) === n) || null;
  }, [courses, courseId]);

  const selectedLesson = useMemo(() => {
    const n = Number(lessonId);
    return lessons.find((l) => (l.id ?? l.Id) === n) || null;
  }, [lessons, lessonId]);

  async function generateDraft() {
    if (!lessonId) return alert("Select a lesson first.");

    try {
      setBusy(true);
      setErr("");

      const res = await fetch(
        `${API_BASE}/api/instructor/lessons/${lessonId}/ai-quiz/generate?count=${count}`,
        { method: "POST", headers: authHeadersOnly() }
      );
      await readJson(res);

      // load latest after generating
      await loadLatestDraft(lessonId);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function setQuestionField(qIndex, field, value) {
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      copy.questions[qIndex][field] = value;
      return copy;
    });
  }

  function setOptionField(qIndex, oIndex, field, value) {
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      copy.questions[qIndex].options[oIndex][field] = value;
      return copy;
    });
  }

  function markCorrect(qIndex, optionId) {
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      const q = copy.questions[qIndex];

      // For MCQ: only one correct
      q.options = q.options.map((o) => ({
        ...o,
        isCorrect: o.id === optionId,
      }));

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
    setDraft((prev) => {
      if (!prev) return prev;
      const copy = structuredClone(prev);
      copy.questions[qIndex].options.splice(oIndex, 1);

      // ensure at least one option is correct for MCQ
      const opts = copy.questions[qIndex].options;
      if (opts.length && !opts.some((x) => x.isCorrect)) opts[0].isCorrect = true;

      return copy;
    });
  }

  async function saveDraft() {
    if (!draft) return;

    try {
      setBusy(true);
      setErr("");

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

      {/* selectors */}
      <div className="card">
        <div className="card-body d-flex flex-wrap align-items-end" style={{ gap: 12 }}>
          <div style={{ minWidth: 260 }}>
            <label className="mb-1">Course</label>
            <select className="form-control" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => {
                const id = c.id ?? c.Id;
                const title = c.title ?? c.Title ?? `Course #${id}`;
                return (
                  <option key={id} value={id}>
                    #{id} — {title}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ minWidth: 320 }}>
            <label className="mb-1">Lesson</label>
            <select className="form-control" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              {lessons.length === 0 ? <option value="">No lessons</option> : null}
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  #{l.id} — {l.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 200 }}>
            <label className="mb-1">Questions count</label>
            <input
              type="number"
              className="form-control"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>

          <div className="ml-auto d-flex" style={{ gap: 10 }}>
            <button className="btn btn-primary" type="button" onClick={generateDraft} disabled={busy || !lessonId}>
              <i className="fas fa-magic mr-2" />
              {busy ? "Generating..." : "Generate Draft"}
            </button>

            <button className="btn btn-success" type="button" onClick={saveDraft} disabled={busy || !draft}>
              <i className="fas fa-save mr-2" />
              Save Draft
            </button>

            <button className="btn btn-outline-secondary" type="button" disabled title="Step 3">
              <i className="fas fa-check mr-2" />
              Approve (Step 3)
            </button>
          </div>
        </div>

        <div className="card-body pt-0">
          <small className="text-muted">
            Selected: <b>{selectedCourse?.title ?? selectedCourse?.Title ?? "—"}</b> /{" "}
            <b>{selectedLesson?.title ?? "—"}</b>
          </small>
        </div>
      </div>

      {/* draft */}
      {!draft ? (
        <div className="card">
          <div className="card-body text-muted">No draft loaded yet. Generate one for the selected lesson.</div>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="mb-0">Draft Questions</h4>
            <button className="btn btn-sm btn-outline-primary" onClick={addQuestion} disabled={busy}>
              <i className="fas fa-plus mr-1" /> Add Question
            </button>
          </div>

          {draft.questions?.length ? (
            draft.questions.map((q, qi) => (
              <div className="card" key={q.id ?? qi}>
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <b>Q{qi + 1}</b> <span className="text-muted">#{q.id || "new"}</span>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteQuestion(qi)} disabled={busy}>
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
                      onChange={(e) => setQuestionField(qi, "questionText", e.target.value)}
                      disabled={busy}
                    />
                  </div>

                  <div className="form-group">
                    <label>Explanation (optional)</label>
                    <input
                      className="form-control"
                      value={q.explanation ?? ""}
                      onChange={(e) => setQuestionField(qi, "explanation", e.target.value)}
                      disabled={busy}
                    />
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <label className="mb-0">Options (MCQ)</label>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => addOption(qi)} disabled={busy}>
                      <i className="fas fa-plus mr-1" /> Add option
                    </button>
                  </div>

                  <div className="mt-2">
                    {(q.options ?? []).map((o, oi) => (
                      <div className="d-flex align-items-center mb-2" key={o.id ?? oi} style={{ gap: 10 }}>
                        <input
                          type="radio"
                          name={`correct_${qi}`}
                          checked={!!o.isCorrect}
                          onChange={() => markCorrect(qi, o.id)}
                          disabled={busy}
                        />

                        <input
                          className="form-control"
                          value={o.answerText ?? ""}
                          onChange={(e) => setOptionField(qi, oi, "answerText", e.target.value)}
                          disabled={busy}
                        />

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteOption(qi, oi)}
                          disabled={busy || (q.options?.length ?? 0) <= 2}
                          title={(q.options?.length ?? 0) <= 2 ? "Keep at least 2 options" : "Delete"}
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <small className="text-muted">Tip: Only one correct option is allowed (MCQ).</small>
                </div>
              </div>
            ))
          ) : (
            <div className="card">
              <div className="card-body text-muted">No questions inside this draft.</div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
