using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Questions;
using OnlineLearningPlatform.Application.DTOs.Quizzes;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.Controllers.Instructor;

[ApiController]
[Route("api")]
[Authorize(Roles = "Instructor,Admin")]

public class QuestionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public QuestionsController(AppDbContext db) => _db = db;

    // GET: api/question-banks/{bankId}/questions
    [HttpGet("question-banks/{bankId:int}/questions")]
    public async Task<ActionResult<List<QuestionReadDto>>> GetByBank(int bankId)
    {
        var bankExists = await _db.QuestionBanks.AnyAsync(qb => qb.Id == bankId);
        if (!bankExists) return NotFound("QuestionBank not found.");

        var questions = await _db.Questions.AsNoTracking()
            .Where(q => q.QuestionBankId == bankId)
            .Select(q => new QuestionReadDto
            {
                Id = q.Id,
                QuestionBankId = q.QuestionBankId,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                Explanation = q.Explanation,
                AnswerOptions = q.AnswerOptions
                    .Select(a => new AnswerOptionReadDto
                    {
                        Id = a.Id,
                        QuestionId = a.QuestionId,
                        AnswerText = a.AnswerText,
                        IsCorrect = a.IsCorrect
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(questions);
    }

    // GET: api/questions/{id}
    [HttpGet("questions/{id:int}")]
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
                        QuestionType = qq.Question.QuestionType,

                        // ✅ FIX: return AnswerOptions, using AnswerText (NOT OptionText)
                        AnswerOptions = qq.Question.AnswerOptions
                            .OrderBy(o => o.Id)
                            .Select(o => new OnlineLearningPlatform.Application.DTOs.Questions.AnswerOptionReadDto
                            {
                                Id = o.Id,
                                QuestionId = o.QuestionId,
                                AnswerText = o.AnswerText,   // ✅ correct property name
                                IsCorrect = o.IsCorrect
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        return quiz is null ? NotFound() : Ok(quiz);
    }


    // POST: api/question-banks/{bankId}/questions
    [HttpPost("question-banks/{bankId:int}/questions")]
    public async Task<ActionResult<QuestionReadDto>> Create(int bankId, [FromBody] QuestionCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var bankExists = await _db.QuestionBanks.AnyAsync(qb => qb.Id == bankId);
        if (!bankExists) return NotFound("QuestionBank not found.");

        var question = new Question
        {
            QuestionBankId = bankId,
            QuestionText = dto.QuestionText,
            QuestionType = dto.QuestionType,
            Explanation = dto.Explanation
        };

        _db.Questions.Add(question);
        await _db.SaveChangesAsync();

        var result = new QuestionReadDto
        {
            Id = question.Id,
            QuestionBankId = question.QuestionBankId,
            QuestionText = question.QuestionText,
            QuestionType = question.QuestionType,
            Explanation = question.Explanation,
            AnswerOptions = new List<AnswerOptionReadDto>()
        };

        return CreatedAtAction(nameof(GetById), new { id = question.Id }, result);
    }

    // PUT: api/questions/{id}
    [HttpPut("questions/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] QuestionCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var question = await _db.Questions.FirstOrDefaultAsync(q => q.Id == id);
        if (question is null) return NotFound();

        question.QuestionText = dto.QuestionText;
        question.QuestionType = dto.QuestionType;
        question.Explanation = dto.Explanation;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/questions/{id}
    [HttpDelete("questions/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var question = await _db.Questions.FirstOrDefaultAsync(q => q.Id == id);
        if (question is null) return NotFound();

        _db.Questions.Remove(question);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
