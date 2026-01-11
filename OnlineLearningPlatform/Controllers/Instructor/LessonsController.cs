using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Lessons;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Infrastructure;
using OnlineLearningPlatform.Models;

namespace OnlineLearningPlatform.Controllers.Instructor;

[ApiController]
[Route("api")]
public class LessonsController : ControllerBase
{
    private readonly AppDbContext _db;
    public LessonsController(AppDbContext db) => _db = db;

    // GET: api/courses/{courseId}/lessons
    [HttpGet("courses/{courseId:int}/lessons")]
    public async Task<ActionResult<List<LessonReadDto>>> GetByCourse(int courseId)
    {
        var exists = await _db.Courses.AnyAsync(c => c.Id == courseId);
        if (!exists) return NotFound("Course not found.");

        var lessons = await _db.Lessons.AsNoTracking()
            .Where(l => l.CourseId == courseId)
            .OrderBy(l => l.OrderIndex)
            .Select(l => new LessonReadDto
            {
                Id = l.Id,
                CourseId = l.CourseId,
                Title = l.Title,
                LessonType = l.LessonType,
                ContentText = l.ContentText,
                VideoUrl = l.VideoUrl,
                OrderIndex = l.OrderIndex
            })
            .ToListAsync();

        return Ok(lessons);
    }

    // POST: api/courses/{courseId}/lessons
    [HttpPost("courses/{courseId:int}/lessons")]
    public async Task<ActionResult<LessonReadDto>> Create(int courseId, [FromBody] LessonCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var courseExists = await _db.Courses.AnyAsync(c => c.Id == courseId);
        if (!courseExists) return NotFound("Course not found.");

        // Validate required content based on type (PDF: content/video url)
        if (dto.LessonType == LessonType.Text && string.IsNullOrWhiteSpace(dto.ContentText))
            return BadRequest("ContentText is required for Text lessons.");

        if (dto.LessonType == LessonType.Video && string.IsNullOrWhiteSpace(dto.VideoUrl))
            return BadRequest("VideoUrl is required for Video lessons.");

        var lesson = new Lesson
        {
            CourseId = courseId,
            Title = dto.Title,
            LessonType = dto.LessonType,
            ContentText = dto.ContentText,
            VideoUrl = dto.VideoUrl,
            OrderIndex = dto.OrderIndex
        };

        _db.Lessons.Add(lesson);
        await _db.SaveChangesAsync();

        var result = new LessonReadDto
        {
            Id = lesson.Id,
            CourseId = lesson.CourseId,
            Title = lesson.Title,
            LessonType = lesson.LessonType,
            ContentText = lesson.ContentText,
            VideoUrl = lesson.VideoUrl,
            OrderIndex = lesson.OrderIndex
        };

        return CreatedAtAction(nameof(GetByCourse), new { courseId }, result);
    }

    // PUT: api/lessons/{id}
    [HttpPut("lessons/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] LessonCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var lesson = await _db.Lessons.FirstOrDefaultAsync(l => l.Id == id);
        if (lesson is null) return NotFound();

        if (dto.LessonType == LessonType.Text && string.IsNullOrWhiteSpace(dto.ContentText))
            return BadRequest("ContentText is required for Text lessons.");

        if (dto.LessonType == LessonType.Video && string.IsNullOrWhiteSpace(dto.VideoUrl))
            return BadRequest("VideoUrl is required for Video lessons.");

        lesson.Title = dto.Title;
        lesson.LessonType = dto.LessonType;
        lesson.ContentText = dto.ContentText;
        lesson.VideoUrl = dto.VideoUrl;
        lesson.OrderIndex = dto.OrderIndex;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/lessons/{id}
    [HttpDelete("lessons/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var lesson = await _db.Lessons.FirstOrDefaultAsync(l => l.Id == id);
        if (lesson is null) return NotFound();

        _db.Lessons.Remove(lesson);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
