// File: src/pages/instructor/BankQuestions.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "https://localhost:5001";

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

export default function BankQuestions() {
  const { id } = useParams(); // bankId
  const bankId = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [questions, setQuestions] = useState([]);

  // create/edit question modal
  const [qModalOpen, setQModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [savingQ, setSavingQ] = useState(false);

  const [qForm, setQForm] = useState({
    questionText: "",
    questionType: "MCQ", // MCQ | MSQ | TrueFalse | ShortAnswer (matches your enum names)
    explanation: "",
  });

  // answer options modal
  const [optModalOpen, setOptModalOpen] = useState(false);
  const [optQuestion, setOptQuestion] = useState(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsErr, setOptionsErr] = useState("");
  const [options, setOptions] = useState([]);
  const [optSaving, setOptSaving] = useState(false);

  const [optForm, setOptForm] = useState({
    answerText: "",
    isCorrect: false,
  });

  const bankTitle = useMemo(() => `Question Bank #${bankId}`, [bankId]);

  const loadQuestions = useCallback(async () => {
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/question-banks/${bankId}/questions`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e?.message || e));
      setQuestions([]);
    }
  }, [bankId]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadQuestions();
      setLoading(false);
    }
    init();
  }, [loadQuestions]);

  function openCreateQuestion() {
    setEditingQuestion(null);
    setQForm({
      questionText: "",
      questionType: "MCQ",
      explanation: "",
    });
    setQModalOpen(true);
  }

  function openEditQuestion(q) {
    setEditingQuestion(q);
    setQForm({
      questionText: q.questionText || "",
      questionType: q.questionType || "MCQ",
      explanation: q.explanation || "",
    });
    setQModalOpen(true);
  }

  function closeQModal() {
    setQModalOpen(false);
    setEditingQuestion(null);
  }

  function setQField(name, value) {
    setQForm((p) => ({ ...p, [name]: value }));
  }

  async function saveQuestion(e) {
    e.preventDefault();

    if (!qForm.questionText.trim()) return alert("Question text is required.");

    const payload = {
      questionText: qForm.questionText.trim(),
      questionType: qForm.questionType,
      explanation: qForm.explanation?.trim() || "",
    };

    try {
      setSavingQ(true);

      if (editingQuestion) {
        const res = await fetch(`${API_BASE}/api/questions/${editingQuestion.id}`, {
          method: "PUT",
          headers: headersJson(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await fetch(`${API_BASE}/api/question-banks/${bankId}/questions`, {
          method: "POST",
          headers: headersJson(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      }

      closeQModal();
      await loadQuestions();
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setSavingQ(false);
    }
  }

  async function deleteQuestion(q) {
    if (!confirm("Delete this question?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/questions/${q.id}`, {
        method: "DELETE",
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadQuestions();
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  // ------------------------
  // Answer Options modal logic
  // ------------------------
  const loadOptions = useCallback(async (questionId) => {
    if (!questionId) return;
    setOptionsErr("");
    setOptionsLoading(true);
    setOptions([]);

    try {
      const res = await fetch(`${API_BASE}/api/questions/${questionId}/options`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOptions(Array.isArray(data) ? data : []);
    } catch (e) {
      setOptionsErr(String(e?.message || e));
      setOptions([]);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  function openOptionsModal(q) {
    // If ShortAnswer -> no options
    if (q.questionType === "ShortAnswer") {
      alert("ShortAnswer questions do not use AnswerOptions.");
      return;
    }

    setOptQuestion(q);
    setOptForm({ answerText: "", isCorrect: false });
    setOptModalOpen(true);
    loadOptions(q.id);
  }

  function closeOptionsModal() {
    setOptModalOpen(false);
    setOptQuestion(null);
    setOptions([]);
    setOptionsErr("");
  }

  function setOptField(name, value) {
    setOptForm((p) => ({ ...p, [name]: value }));
  }

  async function addOption(e) {
    e.preventDefault();
    if (!optQuestion) return;

    if (!optForm.answerText.trim()) return alert("Answer text is required.");

    try {
      setOptSaving(true);
      const res = await fetch(`${API_BASE}/api/questions/${optQuestion.id}/options`, {
        method: "POST",
        headers: headersJson(),
        body: JSON.stringify({
          answerText: optForm.answerText.trim(),
          isCorrect: !!optForm.isCorrect,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      setOptForm({ answerText: "", isCorrect: false });
      await loadOptions(optQuestion.id);
    } catch (e) {
      alert(String(e?.message || e));
    } finally {
      setOptSaving(false);
    }
  }

  async function deleteOption(opt) {
    if (!confirm("Delete this option?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/options/${opt.id}`, {
        method: "DELETE",
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      if (optQuestion) await loadOptions(optQuestion.id);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title={bankTitle}
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "Question Banks", to: "/instructor/question-banks" },
        { label: `Bank ${bankId}`, active: true },
      ]}
    >
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Link to="/instructor/question-banks" className="btn btn-outline-secondary btn-sm">
          <i className="fas fa-arrow-left mr-1" />
          Back to Banks
        </Link>

        <button className="btn btn-primary btn-sm" onClick={openCreateQuestion}>
          <i className="fas fa-plus mr-1" /> Add Question
        </button>
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

      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">Questions</h3>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th>Question</th>
                <th style={{ width: 160 }}>Type</th>
                <th style={{ width: 280 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    No questions yet.
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id}>
                    <td>{q.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.questionText}</div>
                      {q.explanation ? (
                        <small className="text-muted d-block">
                          Explanation: {q.explanation}
                        </small>
                      ) : null}
                    </td>
                    <td>
                      <span className="badge badge-info">{q.questionType}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary mr-2"
                        type="button"
                        onClick={() => openOptionsModal(q)}
                        disabled={q.questionType === "ShortAnswer"}
                        title={
                          q.questionType === "ShortAnswer"
                            ? "ShortAnswer has no options"
                            : "Manage options"
                        }
                      >
                        <i className="fas fa-list mr-1" />
                        Options
                      </button>

                      <button
                        className="btn btn-sm btn-info mr-2"
                        type="button"
                        onClick={() => openEditQuestion(q)}
                      >
                        <i className="fas fa-edit" /> Edit
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        type="button"
                        onClick={() => deleteQuestion(q)}
                      >
                        <i className="fas fa-trash" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <small className="text-muted">
            Uses: GET/POST /api/question-banks/{`{bankId}`}/questions, PUT/DELETE /api/questions/{`{id}`}
          </small>
        </div>
      </div>

      {/* Create/Edit Question Modal */}
      {qModalOpen ? (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingQuestion ? "Edit Question" : "Create Question"}
                </h5>
                <button type="button" className="close" onClick={closeQModal}>
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={saveQuestion}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Question Text</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={qForm.questionText}
                      onChange={(e) => setQField("questionText", e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-4">
                      <label>Question Type</label>
                      <select
                        className="form-control"
                        value={qForm.questionType}
                        onChange={(e) => setQField("questionType", e.target.value)}
                      >
                        <option value="MCQ">MCQ</option>
                        <option value="MSQ">MSQ</option>
                        <option value="TrueFalse">TrueFalse</option>
                        <option value="ShortAnswer">ShortAnswer</option>
                      </select>
                      <small className="text-muted">
                        ShortAnswer has no AnswerOptions.
                      </small>
                    </div>

                    <div className="form-group col-md-8">
                      <label>Explanation (optional)</label>
                      <input
                        className="form-control"
                        value={qForm.explanation}
                        onChange={(e) => setQField("explanation", e.target.value)}
                        placeholder="Shown after answering (optional)"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeQModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingQ}>
                    {savingQ ? "Saving..." : editingQuestion ? "Save Changes" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {/* Answer Options Modal */}
      {optModalOpen ? (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Answer Options — Q#{optQuestion?.id}
                </h5>
                <button type="button" className="close" onClick={closeOptionsModal}>
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body">
                {optionsErr ? (
                  <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle mr-2" />
                    {optionsErr}
                  </div>
                ) : null}

                {/* Add option */}
                <form onSubmit={addOption} className="mb-3">
                  <div className="form-row align-items-end">
                    <div className="form-group col-md-7">
                      <label>Answer Text</label>
                      <input
                        className="form-control"
                        value={optForm.answerText}
                        onChange={(e) => setOptField("answerText", e.target.value)}
                        placeholder="Type the option..."
                        required
                      />
                    </div>

                    <div className="form-group col-md-3">
                      <div className="form-check mt-4">
                        <input
                          id="isCorrect"
                          type="checkbox"
                          className="form-check-input"
                          checked={optForm.isCorrect}
                          onChange={(e) => setOptField("isCorrect", e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="isCorrect">
                          Correct
                        </label>
                      </div>
                    </div>

                    <div className="form-group col-md-2">
                      <button className="btn btn-primary btn-block" disabled={optSaving}>
                        {optSaving ? "..." : "Add"}
                      </button>
                    </div>
                  </div>

                  <small className="text-muted">
                    Backend rule: MCQ allows only one correct option.
                  </small>
                </form>

                {/* Options list */}
                {optionsLoading ? (
                  <div className="card">
                    <div className="card-body">
                      <i className="fas fa-spinner fa-spin mr-2" />
                      Loading options...
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: 80 }}>ID</th>
                          <th>Answer</th>
                          <th style={{ width: 120 }}>Correct</th>
                          <th style={{ width: 140 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {options.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center text-muted">
                              No options yet.
                            </td>
                          </tr>
                        ) : (
                          options.map((o) => (
                            <tr key={o.id}>
                              <td>{o.id}</td>
                              <td>{o.answerText}</td>
                              <td>
                                {o.isCorrect ? (
                                  <span className="badge badge-success">Yes</span>
                                ) : (
                                  <span className="badge badge-secondary">No</span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-danger"
                                  type="button"
                                  onClick={() => deleteOption(o)}
                                >
                                  <i className="fas fa-trash" /> Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    <small className="text-muted d-block mt-2">
                      Uses: GET /api/questions/{`{questionId}`}/options, POST /api/questions/{`{questionId}`}/options, DELETE /api/options/{`{id}`}
                    </small>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeOptionsModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
