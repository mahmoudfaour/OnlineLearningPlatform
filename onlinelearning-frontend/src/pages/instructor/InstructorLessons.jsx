import React, { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { instructorSidebarItems } from "../../config/instructorSidebar";
import { useParams } from "react-router-dom";

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

const LESSON_TYPES = ["Text", "Video"]; // must match your backend enum names
const FILE_TYPES = ["PDF", "Image", "Link", "Other"]; // you can adjust to match your backend expectations

export default function InstructorLessons() {
  const { id } = useParams(); // courseId from URL
  const courseIdFromUrl = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  useEffect(() => {
    if (courseIdFromUrl && !Number.isNaN(courseIdFromUrl)) {
      setSelectedCourseId(String(courseIdFromUrl));
    }
  }, [courseIdFromUrl]);

  const [lessons, setLessons] = useState([]);

  // Lesson modal state
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);

  const [form, setForm] = useState({
    title: "",
    lessonType: "Text",
    contentText: "",
    videoUrl: "",
    orderIndex: 1,
  });

  // Attachments modal state
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsErr, setAttachmentsErr] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [activeLessonForAttachments, setActiveLessonForAttachments] =
    useState(null);

  const [attachmentForm, setAttachmentForm] = useState({
    fileUrl: "",
    fileType: "PDF",
  });

  const selectedCourse = useMemo(() => {
    const idNum = Number(selectedCourseId);
    return courses.find((c) => c.id === idNum) || null;
  }, [courses, selectedCourseId]);

  function setField(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function setAttachmentField(name, value) {
    setAttachmentForm((p) => ({ ...p, [name]: value }));
  }

  const loadCourses = useCallback(async () => {
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/Courses/mine`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCourses(list);

      // auto-select first course
      if (list.length > 0 && !selectedCourseId) {
        setSelectedCourseId(String(list[0].id));
      }
    } catch (e) {
      setErr(String(e?.message || e));
      setCourses([]);
    }
  }, [selectedCourseId]);

  const loadLessons = useCallback(async (courseId) => {
    if (!courseId) return;
    setErr("");

    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons`, {
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setLessons(list);
    } catch (e) {
      setErr(String(e?.message || e));
      setLessons([]);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadCourses();
      setLoading(false);
    }
    init();
  }, [loadCourses]);

  useEffect(() => {
    if (selectedCourseId) loadLessons(selectedCourseId);
  }, [selectedCourseId, loadLessons]);

  // --------------------------
  // Lesson CRUD
  // --------------------------
  function openCreateLessonModal() {
    const nextOrder =
      lessons.length > 0
        ? Math.max(...lessons.map((l) => Number(l.orderIndex ?? 0))) + 1
        : 1;

    setEditingLesson(null);
    setForm({
      title: "",
      lessonType: "Text",
      contentText: "",
      videoUrl: "",
      orderIndex: nextOrder,
    });
    setLessonModalOpen(true);
  }

  function openEditLessonModal(lesson) {
    setEditingLesson(lesson);
    setForm({
      title: lesson.title || "",
      lessonType: lesson.lessonType || "Text",
      contentText: lesson.contentText || "",
      videoUrl: lesson.videoUrl || "",
      orderIndex: Number(lesson.orderIndex ?? 1),
    });
    setLessonModalOpen(true);
  }

  function closeLessonModal() {
    setLessonModalOpen(false);
    setEditingLesson(null);
  }

  async function saveLesson(e) {
    e.preventDefault();

    if (!selectedCourseId) {
      alert("Select a course first.");
      return;
    }

    // client-side validation matching backend rules
    if (!form.title.trim()) return alert("Title is required.");
    if (form.lessonType === "Text" && !form.contentText.trim())
      return alert("ContentText is required for Text lessons.");
    if (form.lessonType === "Video" && !form.videoUrl.trim())
      return alert("VideoUrl is required for Video lessons.");

    try {
      if (editingLesson) {
        // UPDATE
        const res = await fetch(`${API_BASE}/api/lessons/${editingLesson.id}`, {
          method: "PUT",
          headers: headersJson(),
          body: JSON.stringify({
            title: form.title,
            lessonType: form.lessonType,
            contentText: form.lessonType === "Text" ? form.contentText : "",
            videoUrl: form.lessonType === "Video" ? form.videoUrl : "",
            orderIndex: Number(form.orderIndex),
          }),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        // CREATE
        const res = await fetch(
          `${API_BASE}/api/courses/${selectedCourseId}/lessons`,
          {
            method: "POST",
            headers: headersJson(),
            body: JSON.stringify({
              title: form.title,
              lessonType: form.lessonType,
              contentText: form.lessonType === "Text" ? form.contentText : "",
              videoUrl: form.lessonType === "Video" ? form.videoUrl : "",
              orderIndex: Number(form.orderIndex),
            }),
          },
        );
        if (!res.ok) throw new Error(await res.text());
      }

      closeLessonModal();
      await loadLessons(selectedCourseId);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  async function deleteLesson(lesson) {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/lessons/${lesson.id}`, {
        method: "DELETE",
        headers: headersAuthOnly(),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadLessons(selectedCourseId);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  // --------------------------
  // Attachments
  // --------------------------
  const loadAttachments = useCallback(async (lessonId) => {
    if (!lessonId) return;

    setAttachmentsErr("");
    setAttachmentsLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/lessons/${lessonId}/attachments`,
        {
          headers: headersAuthOnly(),
        },
      );

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setAttachments(Array.isArray(data) ? data : []);
    } catch (e) {
      setAttachmentsErr(String(e?.message || e));
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }, []);

  function openAttachmentsModal(lesson) {
    setActiveLessonForAttachments(lesson);
    setAttachmentForm({ fileUrl: "", fileType: "PDF" });
    setAttachments([]);
    setAttachmentsErr("");
    setAttachmentsModalOpen(true);

    // load now
    loadAttachments(lesson.id);
  }

  function closeAttachmentsModal() {
    setAttachmentsModalOpen(false);
    setActiveLessonForAttachments(null);
    setAttachments([]);
    setAttachmentsErr("");
    setAttachmentForm({ fileUrl: "", fileType: "PDF" });
  }

  async function addAttachment(e) {
    e.preventDefault();

    if (!activeLessonForAttachments?.id) return;

    if (!attachmentForm.fileUrl.trim()) {
      alert("FileUrl is required.");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/lessons/${activeLessonForAttachments.id}/attachments`,
        {
          method: "POST",
          headers: headersJson(),
          body: JSON.stringify({
            fileUrl: attachmentForm.fileUrl.trim(),
            fileType: attachmentForm.fileType,
          }),
        },
      );

      if (!res.ok) throw new Error(await res.text());

      // refresh list
      setAttachmentForm({ fileUrl: "", fileType: attachmentForm.fileType });
      await loadAttachments(activeLessonForAttachments.id);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  async function deleteAttachment(att) {
    if (!confirm("Delete this attachment?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/attachments/${att.id}`, {
        method: "DELETE",
        headers: headersAuthOnly(),
      });

      if (!res.ok) throw new Error(await res.text());

      await loadAttachments(activeLessonForAttachments.id);
    } catch (e) {
      alert(String(e?.message || e));
    }
  }

  return (
    <DashboardLayout
      navbarRoleLabel="Instructor"
      sidebarItems={instructorSidebarItems}
      title="Lessons"
      breadcrumb={[
        { label: "Home", to: "/instructor/dashboard" },
        { label: "Lessons", active: true },
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

      {/* Course selector */}
      <div className="card">
        <div
          className="card-body d-flex flex-wrap align-items-end"
          style={{ gap: 12 }}
        >
          <div style={{ minWidth: 280 }}>
            <label className="mb-1">Select course</label>
            <select
              className="form-control"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.length === 0 ? (
                <option value="">No courses found</option>
              ) : (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} — {c.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="ml-auto">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateLessonModal}
              disabled={!selectedCourseId}
            >
              <i className="fas fa-plus mr-2" />
              Create Lesson
            </button>
          </div>

          {selectedCourse ? (
            <small className="text-muted d-block w-100 mt-2">
              Course status:{" "}
              {selectedCourse.isPublished ? (
                <span className="badge badge-success">Published</span>
              ) : (
                <span className="badge badge-warning">Unpublished</span>
              )}
            </small>
          ) : null}
        </div>
      </div>

      {/* Lessons table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title mb-0">
            Lessons {selectedCourse ? `— ${selectedCourse.title}` : ""}
          </h3>
        </div>

        <div className="card-body table-responsive">
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Order</th>
                <th>Title</th>
                <th style={{ width: 120 }}>Type</th>
                <th style={{ width: 360 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lessons.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    No lessons yet.
                  </td>
                </tr>
              ) : (
                lessons.map((l) => (
                  <tr key={l.id}>
                    <td>{l.orderIndex}</td>
                    <td>{l.title}</td>
                    <td>
                      <span className="badge badge-info">{l.lessonType}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-info mr-2"
                        onClick={() => openEditLessonModal(l)}
                      >
                        <i className="fas fa-edit" /> Edit
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-danger mr-2"
                        onClick={() => deleteLesson(l)}
                      >
                        <i className="fas fa-trash" /> Delete
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => openAttachmentsModal(l)}
                      >
                        <i className="fas fa-paperclip" /> Attachments
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <small className="text-muted">
            Attachments modal uses LessonAttachmentsController
            (GET/POST/DELETE).
          </small>
        </div>
      </div>

      {/* Lesson Modal */}
      {lessonModalOpen ? (
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
                  {editingLesson ? "Edit Lesson" : "Create Lesson"}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={closeLessonModal}
                >
                  <span>&times;</span>
                </button>
              </div>

              <form onSubmit={saveLesson}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      className="form-control"
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label>Lesson Type</label>
                      <select
                        className="form-control"
                        value={form.lessonType}
                        onChange={(e) => setField("lessonType", e.target.value)}
                      >
                        {LESSON_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group col-md-6">
                      <label>Order Index</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.orderIndex}
                        onChange={(e) => setField("orderIndex", e.target.value)}
                        min={1}
                        required
                      />
                    </div>
                  </div>

                  {form.lessonType === "Text" ? (
                    <div className="form-group">
                      <label>Content Text</label>
                      <textarea
                        className="form-control"
                        rows={6}
                        value={form.contentText}
                        onChange={(e) =>
                          setField("contentText", e.target.value)
                        }
                        required
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Video URL</label>
                      <input
                        className="form-control"
                        value={form.videoUrl}
                        onChange={(e) => setField("videoUrl", e.target.value)}
                        required
                      />
                      <small className="text-muted">
                        Example: YouTube link or direct video URL.
                      </small>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeLessonModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingLesson ? "Save Changes" : "Create Lesson"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {/* Attachments Modal */}
      {attachmentsModalOpen ? (
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
                  Attachments — {activeLessonForAttachments?.title || "Lesson"}
                </h5>
                <button
                  type="button"
                  className="close"
                  onClick={closeAttachmentsModal}
                >
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body">
                {attachmentsErr ? (
                  <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle mr-2" />
                    {attachmentsErr}
                  </div>
                ) : null}

                {/* Add attachment */}
                <form onSubmit={addAttachment} className="mb-3">
                  <div className="form-row">
                    <div className="form-group col-md-8">
                      <label>File URL</label>
                      <input
                        className="form-control"
                        value={attachmentForm.fileUrl}
                        onChange={(e) =>
                          setAttachmentField("fileUrl", e.target.value)
                        }
                        placeholder="https://... or /uploads/file.pdf"
                        required
                      />
                    </div>

                    <div className="form-group col-md-4">
                      <label>File Type</label>
                      <select
                        className="form-control"
                        value={attachmentForm.fileType}
                        onChange={(e) =>
                          setAttachmentField("fileType", e.target.value)
                        }
                      >
                        {FILE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={attachmentsLoading}
                  >
                    <i className="fas fa-plus mr-2" />
                    Add Attachment
                  </button>
                </form>

                {/* List attachments */}
                {attachmentsLoading ? (
                  <div className="card">
                    <div className="card-body">
                      <i className="fas fa-spinner fa-spin mr-2" /> Loading
                      attachments...
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>URL</th>
                          <th style={{ width: 120 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attachments.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center text-muted">
                              No attachments yet.
                            </td>
                          </tr>
                        ) : (
                          attachments.map((a) => (
                            <tr key={a.id}>
                              <td>
                                <span className="badge badge-info">
                                  {a.fileType}
                                </span>
                              </td>
                              <td style={{ wordBreak: "break-word" }}>
                                <a
                                  href={a.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {a.fileUrl}
                                </a>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => deleteAttachment(a)}
                                >
                                  <i className="fas fa-trash" /> Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <small className="text-muted d-block mt-2">
                  Uses: GET /api/lessons/{`{lessonId}`}/attachments, POST
                  /api/lessons/{`{lessonId}`}/attachments, DELETE
                  /api/attachments/{`{id}`}
                </small>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeAttachmentsModal}
                >
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
