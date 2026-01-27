using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Questions;
using OnlineLearningPlatform.Application.DTOs.Quizzes;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.Controllers.Instructor;

[ApiController]
[Route("api")]
public class QuizzesController : ControllerBase
{
    private readonly AppDbContext _db;
    public QuizzesController(AppDbContext db) => _db = db;

    // ✅ Students CAN read quizzes list
    // GET: api/courses/{courseId}/quizzes
    [Authorize(Roles = "Student,Instructor,Admin")]
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
                CreatedAt = q.CreatedAt,
                IsFinal = q.IsFinal
            })
            .ToListAsync();

        return Ok(quizzes);
    }

    // ✅ Students CAN read quiz details
    // GET: api/quizzes/{id}
    [Authorize(Roles = "Student,Instructor,Admin")]
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
                IsFinal = q.IsFinal,
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
                        QuestionType = qq.Question.QuestionType,
                        // ✅ include options so your frontend can render them
                        AnswerOptions = qq.Question.AnswerOptions
                            .Select(o => new AnswerOptionReadDto
                            {
                                Id = o.Id,
                                AnswerText = o.AnswerText
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        return quiz is null ? NotFound("Quiz not found.") : Ok(quiz);
    }

    // 🔒 Only Instructor/Admin can create/update/delete
    [Authorize(Roles = "Instructor,Admin")]
    [HttpPost("quizzes")]
    public async Task<ActionResult<QuizReadDto>> Create([FromBody] QuizCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var courseExists = await _db.Courses.AnyAsync(c => c.Id == dto.CourseId);
        if (!courseExists) return BadRequest("CourseId not found.");

        var quiz = new Quiz
        {
            CourseId = dto.CourseId,
            LessonId = dto.LessonId,
            Title = dto.Title,
            PassingScorePercent = dto.PassingScorePercent,
            TimeLimitSeconds = dto.TimeLimitSeconds,
            IsFinal = dto.IsFinal,
            CreatedAt = DateTime.UtcNow
        };

        _db.Quizzes.Add(quiz);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = quiz.Id }, new QuizReadDto
        {
            Id = quiz.Id,
            CourseId = quiz.CourseId,
            LessonId = quiz.LessonId,
            Title = quiz.Title,
            PassingScorePercent = quiz.PassingScorePercent,
            TimeLimitSeconds = quiz.TimeLimitSeconds,
            CreatedAt = quiz.CreatedAt,
            IsFinal = quiz.IsFinal,
            QuizQuestions = new()
        });
    }

    [Authorize(Roles = "Instructor,Admin")]
    [HttpPut("quizzes/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] QuizCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var quiz = await _db.Quizzes.FirstOrDefaultAsync(q => q.Id == id);
        if (quiz is null) return NotFound();

        quiz.CourseId = dto.CourseId;
        quiz.LessonId = dto.LessonId;
        quiz.Title = dto.Title;
        quiz.PassingScorePercent = dto.PassingScorePercent;
        quiz.TimeLimitSeconds = dto.TimeLimitSeconds;
        quiz.IsFinal = dto.IsFinal;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Instructor,Admin")]
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
