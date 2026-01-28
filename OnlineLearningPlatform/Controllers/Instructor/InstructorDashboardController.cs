using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Instructor;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.API.Controllers;

[ApiController]
[Route("api/instructor/dashboard")]
[Authorize(Roles = "Instructor")]
public class InstructorDashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public InstructorDashboardController(AppDbContext db) => _db = db;

    private int CurrentUserId()
    {
        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirst("id")?.Value;

        if (string.IsNullOrWhiteSpace(idStr))
            throw new UnauthorizedAccessException("Missing user id claim.");

        return int.Parse(idStr);
    }

    // GET: /api/instructor/dashboard/stats
    [HttpGet("stats")]
    [ProducesResponseType(typeof(InstructorDashboardStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<InstructorDashboardStatsDto>> GetStats()
    {
        var instructorId = CurrentUserId();

        // Instructor course ids
        var courseIdsQuery = _db.Courses.AsNoTracking()
            .Where(c => c.UserId == instructorId)
            .Select(c => c.Id);

        var courseIds = await courseIdsQuery.ToListAsync();
        var coursesCreated = courseIds.Count;

        // Total active enrollments in instructor courses
        var totalEnrollments = await _db.CourseEnrollments.AsNoTracking()
            .Where(e => courseIds.Contains(e.CourseId) && e.Status == EnrollmentStatus.Active)
            .CountAsync();

        // Count quizzes in instructor courses
        // (If you later add IsPublished on Quiz, filter by it here)
        var quizzesPublished = await _db.Quizzes.AsNoTracking()
            .Where(q => courseIds.Contains(q.CourseId))
            .CountAsync();

        // Avg score: submitted attempts only for quizzes in instructor courses
        // NULL if no attempts yet
        var avgQuizScore = await _db.QuizAttempts.AsNoTracking()
            .Where(a =>
                a.SubmittedAt != null &&
                _db.Quizzes.Any(q => q.Id == a.QuizId && courseIds.Contains(q.CourseId)))
            .AverageAsync(a => (double?)a.ScorePercent);

        return Ok(new InstructorDashboardStatsDto
        {
            CoursesCreated = coursesCreated,
            TotalEnrollments = totalEnrollments,
            QuizzesPublished = quizzesPublished,
            AvgQuizScore = avgQuizScore
        });
    }
}
