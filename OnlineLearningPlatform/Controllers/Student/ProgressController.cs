using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Progress;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.API;

[ApiController]
[Route("api/student/progress")]
[Authorize(Roles = "Student")]
public class ProgressController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProgressController(AppDbContext db) => _db = db;

    private int CurrentUserId()
        => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ✅ GET: api/student/progress/course/{courseId}
    [HttpGet("course/{courseId:int}")]
    [ProducesResponseType(typeof(CourseProgressDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CourseProgressDto>> GetCourseProgress(int courseId)
    {
        var userId = CurrentUserId();

        // must be enrolled (any status except Dropped is typically fine; adjust if you want)
        var enrollment = await _db.CourseEnrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.UserId == userId);

        if (enrollment is null)
            return BadRequest("You are not enrolled in this course.");

        // total lessons in course
        var totalLessons = await _db.Lessons.AsNoTracking()
            .CountAsync(l => l.CourseId == courseId);

        // completed lessons (safer query without relying on navigation property)
        var completedLessons = await _db.LessonCompletions.AsNoTracking()
            .Join(_db.Lessons.AsNoTracking(),
                  lc => lc.LessonId,
                  l => l.Id,
                  (lc, l) => new { lc, l })
            .CountAsync(x => x.lc.UserId == userId && x.l.CourseId == courseId);

        var lessonsPercent = totalLessons == 0 ? 0 : (completedLessons * 100.0 / totalLessons);

        // quizzes in this course (course-level + lesson-level quizzes)
        var quizzes = await _db.Quizzes.AsNoTracking()
            .Where(q => q.CourseId == courseId)
            .Select(q => new { q.Id, q.Title })
            .ToListAsync();

        var quizIds = quizzes.Select(q => q.Id).ToList();

        // attempt history summary
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

        // overall percent (simple version: lessons only)
        var overall = lessonsPercent;

        return Ok(new CourseProgressDto
        {
            CourseId = courseId,
            TotalLessons = totalLessons,
            CompletedLessons = completedLessons,
            LessonsProgressPercent = Math.Round(lessonsPercent, 2),
            QuizHistory = history,
            OverallPercent = Math.Round(overall, 2)
        });
    }
}
