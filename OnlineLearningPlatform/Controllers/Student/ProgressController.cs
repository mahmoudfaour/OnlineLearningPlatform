using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.API;

[ApiController]
[Route("api/student/progress")]
public class ProgressController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProgressController(AppDbContext db) => _db = db;

    // GET: api/student/progress/course/{courseId}/user/{userId}
    [HttpGet("course/{courseId:int}/user/{userId:int}")]
    public async Task<ActionResult<CourseProgressDto>> GetCourseProgress(int courseId, int userId)
    {
        // must be enrolled (Active or Completed)
        var enrollment = await _db.CourseEnrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.UserId == userId);

        if (enrollment is null)
            return BadRequest("User is not enrolled in this course.");

        // total lessons in course
        var totalLessons = await _db.Lessons.AsNoTracking()
            .CountAsync(l => l.CourseId == courseId);

        // completed lessons for this user in this course
        var completedLessons = await _db.LessonCompletions.AsNoTracking()
            .CountAsync(lc => lc.UserId == userId && lc.Lesson.CourseId == courseId);

        var lessonsPercent = totalLessons == 0 ? 0 : (completedLessons * 100.0 / totalLessons);

        // quizzes in this course (course-level + lesson-level quizzes)
        var quizzes = await _db.Quizzes.AsNoTracking()
            .Where(q => q.CourseId == courseId)
            .Select(q => new { q.Id, q.Title })
            .ToListAsync();

        // quiz attempt history summary
        var quizIds = quizzes.Select(q => q.Id).ToList();

        var attempts = await _db.QuizAttempts.AsNoTracking()
            .Where(a => a.UserId == userId && quizIds.Contains(a.QuizId) && a.SubmittedAt != null)
            .GroupBy(a => a.QuizId)
            .Select(g => new
            {
                QuizId = g.Key,
                AttemptsCount = g.Count(),
                BestScore = g.Max(x => x.ScorePercent),
                LastAttemptAt = g.Max(x => x.SubmittedAt)
            })
            .ToListAsync();

        var history = quizzes.Select(q =>
        {
            var a = attempts.FirstOrDefault(x => x.QuizId == q.Id);
            return new QuizAttemptSummaryDto
            {
                QuizId = q.Id,
                QuizTitle = q.Title,
                AttemptsCount = a?.AttemptsCount ?? 0,
                BestScorePercent = a?.BestScore ?? 0,
                LastAttemptAt = a?.LastAttemptAt
            };
        }).ToList();

        // very simple overall: lessons only (you can later include quizzes weighting)
        var overall = lessonsPercent;

        return Ok(new CourseProgressDto
        {
            CourseId = courseId,
            UserId = userId,
            TotalLessons = totalLessons,
            CompletedLessons = completedLessons,
            LessonsProgressPercent = Math.Round(lessonsPercent, 2),
            QuizHistory = history,
            OverallPercent = Math.Round(overall, 2)
        });
    }
}
