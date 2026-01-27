import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { api } from "../../api/apiClient";
import { authHeaders, getUserIdFromToken } from "../../utils/auth";
import courseDefaultImg from "../../assets/ui-assets/img/course-default.jpg";

export default function CourseDetails() {
  const { id } = useParams();
  const courseId = Number(id);
  const navigate = useNavigate();

  const sidebar = useMemo(
    () => [
      {
        to: "/student/dashboard",
        icon: "fas fa-tachometer-alt",
        label: "Dashboard",
      },
      {
        to: "/student/courses",
        icon: "fas fa-book",
        label: "Browse Courses",
        active: true,
      },
      { to: "/student/progress", icon: "fas fa-chart-line", label: "Progress" },
      {
        to: "/student/certificates",
        icon: "fas fa-certificate",
        label: "Certificates",
      },
    ],
    [],
  );

  const userId = getUserIdFromToken();
  const headers = useMemo(() => authHeaders(), []);

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [progress, setProgress] = useState(null);

  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");

  const enrolled = !!enrollment;

  const lessonsDone =
    progress &&
    Number(progress.totalLessons) > 0 &&
    Number(progress.completedLessons) >= Number(progress.totalLessons);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const courseRes = await api.get(`/api/Courses/${courseId}`);
        setCourse({
          ...courseRes.data,
          instructor: "—",
          duration: "—",
        });

        const lessonsRes = await api.get(`/api/courses/${courseId}/lessons`, {
          headers,
        });
        setLessons(lessonsRes.data || []);

        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        if (token && role === "Student") {
          const enrRes = await api.get(`/api/student/courseenrollments/my`, {
            headers,
          });

          const active = (enrRes.data || []).find(
            (e) =>
              e.courseId === courseId &&
              String(e.status).toLowerCase() === "active",
          );
          setEnrollment(active || null);

          if (active) {
            try {
              const progRes = await api.get(
                `/api/student/progress/course/${courseId}`,
                { headers },
              );
              setProgress(progRes.data);
            } catch {
              setProgress(null);
            }
          } else {
            setProgress(null);
          }
        } else {
          setEnrollment(null);
          setProgress(null);
        }
      } catch (e) {
        if (e?.response?.status === 404)
          setError("Course not found (or not published).");
        else setError(e?.response?.data || "Failed to load course details.");
      } finally {
        setLoading(false);
      }
    }

    if (!courseId || Number.isNaN(courseId)) {
      setError("Invalid course id.");
      setLoading(false);
      return;
    }

    load();
  }, [courseId, headers]);

  const onEnroll = async () => {
    setEnrolling(true);
    setError("");

    try {
      const res = await api.post(
        `/api/student/courseenrollments`,
        { courseId },
        { headers },
      );

      setEnrollment(res.data);

      try {
        const progRes = await api.get(
          `/api/student/progress/course/${courseId}`,
          { headers },
        );

        setProgress(progRes.data);
      } catch {
        setProgress(null);
      }

      if (lessons.length > 0) {
        navigate(
          `/student/lesson?courseId=${courseId}&lessonId=${lessons[0].id}`,
        );
      }
    } catch (e) {
      const msg =
        e?.response?.data || e?.response?.data?.message || "Enrollment failed.";
      setError(typeof msg === "string" ? msg : "Enrollment failed.");
    } finally {
      setEnrolling(false);
    }
  };

  const onStartLearning = () => {
    if (!lessons.length) {
      setError("This course has no lessons yet.");
      return;
    }
    navigate(`/student/lesson?courseId=${courseId}&lessonId=${lessons[0].id}`);
  };

  const onTakeFinalQuiz = () => {
    navigate(`/student/quiz?courseId=${courseId}`);
  };

  return (
    <DashboardLayout
      brandIconClass="fas fa-graduation-cap"
      brandText="OnlineLearning"
      navbarRoleLabel="Student"
      sidebarItems={sidebar}
      title="Course Details"
      breadcrumb={[
        { label: "Student", to: "/student/dashboard" },
        { label: "Courses", to: "/student/courses" },
        { label: `#${id}`, active: true },
      ]}
    >
      {loading ? (
        <div className="alert alert-info">
          <i className="fas fa-spinner fa-spin mr-1"></i> Loading course...
        </div>
      ) : error && !course ? (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle mr-1"></i> {String(error)}
          <div className="mt-2">
            <Link
              to="/student/courses"
              className="btn btn-outline-light btn-sm"
            >
              Back to Courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-lg-8">
            <div className="card course-card">
              <img
                src={courseDefaultImg}
                alt={course.title}
                className="card-img-top"
                style={{ height: 220, objectFit: "cover" }}
              />

              <div className="card-body">
                <h3 className="mb-2">{course.title}</h3>
                <p className="text-muted mb-3">{course.description}</p>

                <div className="d-flex flex-wrap" style={{ gap: 10 }}>
                  <span className="badge badge-light">
                    <i className="fas fa-layer-group mr-1"></i> {lessons.length}{" "}
                    lessons
                  </span>

                  {enrolled && progress ? (
                    <span className="badge badge-success">
                      <i className="fas fa-chart-line mr-1"></i> Progress:{" "}
                      {progress.overallPercent ?? 0}%
                    </span>
                  ) : null}
                </div>

                <hr />

                {error ? (
                  <div className="alert alert-danger">
                    <i className="fas fa-exclamation-triangle mr-1"></i>{" "}
                    {String(error)}
                  </div>
                ) : null}

                <div className="d-flex flex-wrap" style={{ gap: 10 }}>
                  {enrolled ? (
                    <>
                      <button
                        onClick={onStartLearning}
                        className="btn btn-primary"
                        type="button"
                      >
                        <i className="fas fa-play mr-1"></i> Start / Continue
                        Learning
                      </button>

                      <button
                        onClick={onTakeFinalQuiz}
                        className="btn btn-outline-info"
                        type="button"
                        disabled={!lessonsDone}
                        title={!lessonsDone ? "Complete all lessons first" : ""}
                      >
                        <i className="fas fa-question-circle mr-1"></i> Take
                        Final Quiz
                      </button>

                      {!lessonsDone ? (
                        <div
                          className="text-muted"
                          style={{ fontSize: 13, alignSelf: "center" }}
                        >
                          Final quiz unlocks after finishing all lessons.
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <button
                      onClick={onEnroll}
                      className="btn btn-success"
                      disabled={enrolling || !userId}
                      type="button"
                      title={!userId ? "Please login as Student first" : ""}
                    >
                      <i className="fas fa-check mr-1"></i>{" "}
                      {enrolling ? "Enrolling..." : "Enroll Now"}
                    </button>
                  )}

                  <Link
                    to="/student/courses"
                    className="btn btn-outline-secondary"
                  >
                    Back to Courses
                  </Link>
                </div>
              </div>
            </div>

            <div className="card course-card">
              <div className="card-header">
                <h3 className="card-title">Lessons</h3>
              </div>
              <div className="card-body p-0">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "60%" }}>Lesson</th>
                      <th style={{ width: "20%" }}>Type</th>
                      <th style={{ width: "20%" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-muted p-3">
                          No lessons yet.
                        </td>
                      </tr>
                    ) : (
                      lessons.map((lesson) => (
                        <tr key={lesson.id}>
                          <td>{lesson.title}</td>
                          <td>
                            <span className="badge badge-info">
                              {String(lesson.lessonType)}
                            </span>
                          </td>
                          <td>
                            <Link
                              className={`btn btn-sm ${enrolled ? "btn-primary" : "btn-outline-secondary"}`}
                              to={
                                enrolled
                                  ? `/student/lesson?courseId=${courseId}&lessonId=${lesson.id}`
                                  : "#"
                              }
                              onClick={(e) => {
                                if (!enrolled) {
                                  e.preventDefault();
                                  setError(
                                    "Please enroll first to open lessons.",
                                  );
                                }
                              }}
                            >
                              <i className="fas fa-external-link-alt mr-1"></i>{" "}
                              Open Lesson
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card course-card">
              <div className="card-header">
                <h3 className="card-title">Actions</h3>
              </div>
              <div className="card-body">
                <button
                  className="btn btn-outline-primary btn-block"
                  onClick={() =>
                    navigate(`/student/progress?courseId=${courseId}`)
                  }
                  type="button"
                >
                  <i className="fas fa-chart-line mr-1"></i> View Progress
                </button>

                <button
                  className="btn btn-outline-info btn-block"
                  onClick={onTakeFinalQuiz}
                  type="button"
                  disabled={!enrolled || !lessonsDone}
                  title={
                    !enrolled
                      ? "Enroll first"
                      : !lessonsDone
                        ? "Complete all lessons first"
                        : ""
                  }
                >
                  <i className="fas fa-question-circle mr-1"></i> Take Final
                  Quiz
                </button>
              </div>
            </div>

            <div className="card course-card">
              <div className="card-body">
                <div className="alert alert-light mb-0">
                  Certificate requires: <b>All lessons + Final Quiz ≥ 60%</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
