using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Quizzes;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.Controllers.Instructor;

[ApiController]
[Route("api")]
[Authorize(Roles = "Instructor,Admin")]

public class QuizzesController : ControllerBase
{
    private readonly AppDbContext _db;
    public QuizzesController(AppDbContext db) => _db = db;

    // GET: api/courses/{courseId}/quizzes
    [HttpGet("courses/{courseId:int}/quizzes")]
    public async Task<ActionResult<List<QuizReadDto>>> GetByCourse(int courseId)
    {
        var courseExists = await _db.Courses.AnyAsync(c => c.Id == courseId);
        if (!courseExists) return NotFound("Course not found.");

        var quizzes = await _db.Quizzes.AsNoTracking()
            .Where(q => q.CourseId == courseId)
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new QuizReadDto
            {
                Id = q.Id,
                CourseId = q.CourseId,
                LessonId = q.LessonId,
                Title = q.Title,
                PassingScorePercent = q.PassingScorePercent,
                TimeLimitSeconds = q.TimeLimitSeconds,
                CreatedAt = q.CreatedAt
            })
            .ToListAsync();

        return Ok(quizzes);
    }

    // GET: api/quizzes/{id}
    [HttpGet("quizzes/{id:int}")]
    public async Task<ActionResult<QuizReadDto>> GetById(int id)
    {
        var quiz = await _db.Quizzes.AsNoTracking()
            .Where(q => q.Id == id)
            .Select(q => new QuizReadDto
            {
                Id = q.Id,
                CourseId = q.CourseId,
                LessonId = q.LessonId,
                Title = q.Title,
                PassingScorePercent = q.PassingScorePercent,
                TimeLimitSeconds = q.TimeLimitSeconds,
                CreatedAt = q.CreatedAt,
                QuizQuestions = q.QuizQuestions
                    .OrderBy(qq => qq.OrderIndex)
                    .Select(qq => new QuizQuestionReadDto
                    {
                        Id = qq.Id,
                        QuizId = qq.QuizId,
                        QuestionId = qq.QuestionId,
                        Points = qq.Points,
                        OrderIndex = qq.OrderIndex,
                        QuestionText = qq.Question.QuestionText,
                        QuestionType = qq.Question.QuestionType
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        return quiz is null ? NotFound() : Ok(quiz);
    }

    // POST: api/quizzes
    [HttpPost("quizzes")]
    public async Task<ActionResult<QuizReadDto>> Create([FromBody] QuizCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var courseExists = await _db.Courses.AnyAsync(c => c.Id == dto.CourseId);
        if (!courseExists) return BadRequest("CourseId not found.");

        if (dto.LessonId.HasValue)
        {
            var lesson = await _db.Lessons.AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == dto.LessonId.Value);

            if (lesson is null) return BadRequest("LessonId not found.");
            if (lesson.CourseId != dto.CourseId)
                return BadRequest("LessonId must belong to the same CourseId.");
        }

        var quiz = new Quiz
        {
            CourseId = dto.CourseId,
            LessonId = dto.LessonId,
            Title = dto.Title,
            PassingScorePercent = dto.PassingScorePercent,
            TimeLimitSeconds = dto.TimeLimitSeconds,
            CreatedAt = DateTime.UtcNow
        };

        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync();

        // return the quiz (empty QuizQuestions at creation)
        return CreatedAtAction(nameof(GetById), new { id = quiz.Id }, new QuizReadDto
        {
            Id = quiz.Id,
            CourseId = quiz.CourseId,
            LessonId = quiz.LessonId,
            Title = quiz.Title,
            PassingScorePercent = quiz.PassingScorePercent,
            TimeLimitSeconds = quiz.TimeLimitSeconds,
            CreatedAt = quiz.CreatedAt,
            QuizQuestions = new()
        });
    }

    // PUT: api/quizzes/{id}
    [HttpPut("quizzes/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] QuizCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var quiz = await _db.Quizzes.FirstOrDefaultAsync(q => q.Id == id);
        if (quiz is null) return NotFound();

        var courseExists = await _db.Courses.AnyAsync(c => c.Id == dto.CourseId);
        if (!courseExists) return BadRequest("CourseId not found.");

        if (dto.LessonId.HasValue)
        {
            var lesson = await _db.Lessons.AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == dto.LessonId.Value);

            if (lesson is null) return BadRequest("LessonId not found.");
            if (lesson.CourseId != dto.CourseId)
                return BadRequest("LessonId must belong to the same CourseId.");
        }

        quiz.CourseId = dto.CourseId;
        quiz.LessonId = dto.LessonId;
        quiz.Title = dto.Title;
        quiz.PassingScorePercent = dto.PassingScorePercent;
        quiz.TimeLimitSeconds = dto.TimeLimitSeconds;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/quizzes/{id}
    [HttpDelete("quizzes/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var quiz = await _db.Quizzes.FirstOrDefaultAsync(q => q.Id == id);
        if (quiz is null) return NotFound();

        _db.Quizzes.Remove(quiz);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
