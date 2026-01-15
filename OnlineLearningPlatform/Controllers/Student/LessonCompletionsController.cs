using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Lessons;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Student")]

public class LessonCompletionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public LessonCompletionsController(AppDbContext db) => _db = db;

    // GET: api/LessonCompletions/user/1/course/2
    [HttpGet("user/{userId:int}/course/{courseId:int}")]
    public async Task<ActionResult<List<LessonCompletionReadDto>>> GetUserCourseCompletions(int userId, int courseId)
    {
        var items = await _db.LessonCompletions.AsNoTracking()
            .Where(x => x.UserId == userId && x.Lesson.CourseId == courseId)
            .Select(x => new LessonCompletionReadDto
            {
                Id = x.Id,
                LessonId = x.LessonId,
                UserId = x.UserId,
                CompletedAt = x.CompletedAt
            })
            .ToListAsync();

        return Ok(items);
    }

    // POST: api/LessonCompletions
    [HttpPost]
    public async Task<ActionResult<LessonCompletionReadDto>> Complete([FromBody] LessonCompletionCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var lesson = await _db.Lessons.AsNoTracking().FirstOrDefaultAsync(l => l.Id == dto.LessonId);
        if (lesson is null) return BadRequest("LessonId not found.");

        var enrolled = await _db.CourseEnrollments.AnyAsync(e =>
            e.CourseId == lesson.CourseId && e.UserId == dto.UserId && e.Status == EnrollmentStatus.Active);

        if (!enrolled) return BadRequest("User is not actively enrolled in this course.");

        var already = await _db.LessonCompletions.AnyAsync(x => x.LessonId == dto.LessonId && x.UserId == dto.UserId);
        if (already) return BadRequest("Lesson already completed.");

        var completion = new LessonCompletion
        {
            LessonId = dto.LessonId,
            UserId = dto.UserId,
            CompletedAt = DateTime.UtcNow
        };

        _db.LessonCompletions.Add(completion);
        await _db.SaveChangesAsync();

        return Created(string.Empty, new LessonCompletionReadDto
        {
            Id = completion.Id,
            LessonId = completion.LessonId,
            UserId = completion.UserId,
            CompletedAt = completion.CompletedAt
        });
    }
}
