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

    [HttpGet("course/{courseId:int}")]
    public async Task<ActionResult<CourseProgressDto>> GetCourseProgress(int courseId)
    {
        var userId = CurrentUserId();

        var enrollment = await _db.CourseEnrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.UserId == userId);

        if (enrollment is null)
            return BadRequest("You are not enrolled in this course.");

        var totalLessons = await _db.Lessons.AsNoTracking()
            .CountAsync(l => l.CourseId == courseId);

        var completedLessons = await _db.LessonCompletions.AsNoTracking()
            .Join(_db.Lessons.AsNoTracking(),
                  lc => lc.LessonId,
                  l => l.Id,
                  (lc, l) => new { lc, l })
            .CountAsync(x => x.lc.UserId == userId && x.l.CourseId == courseId);

        var lessonsPercent = totalLessons == 0 ? 0 : (completedLessons * 100.0 / totalLessons);

        // ---- Final quiz (IsFinal = true) ----
        var finalQuiz = await _db.Quizzes.AsNoTracking()
            .Where(q => q.CourseId == courseId && q.IsFinal)
            .Select(q => new { q.Id, q.Title, q.PassingScorePercent })
            .FirstOrDefaultAsync();

        bool finalPassed = false;

        if (finalQuiz != null)
        {
            var bestScore = await _db.QuizAttempts.AsNoTracking()
                .Where(a => a.UserId == userId && a.QuizId == finalQuiz.Id && a.SubmittedAt != null)
                .MaxAsync(a => (double?)a.ScorePercent);

            finalPassed = bestScore.HasValue && bestScore.Value >= finalQuiz.PassingScorePercent;
        }

        // overall
        double overall;
        var lessonsDone = (totalLessons > 0 && completedLessons >= totalLessons);

        if (lessonsDone && finalQuiz != null)
            overall = finalPassed ? 100 : 99;
        else
            overall = lessonsPercent;

        return Ok(new CourseProgressDto
        {
            CourseId = courseId,
            TotalLessons = totalLessons,
            CompletedLessons = completedLessons,
            LessonsProgressPercent = Math.Round(lessonsPercent, 2),
            QuizHistory = new(), // optional, keep yours if you want
            OverallPercent = Math.Round(overall, 2)
        });
    }
}
