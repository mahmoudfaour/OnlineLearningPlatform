using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Quizzes;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Infrastructure;
using OnlineLearningPlatform.Models;

namespace OnlineLearningPlatform.Controllers.Instructor;

[ApiController]
[Route("api")]
public class QuizQuestionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public QuizQuestionsController(AppDbContext db) => _db = db;

    // GET: api/quizzes/{quizId}/questions
    [HttpGet("quizzes/{quizId:int}/questions")]
    public async Task<ActionResult<List<QuizQuestionReadDto>>> GetByQuiz(int quizId)
    {
        var quizExists = await _db.Quizzes.AnyAsync(q => q.Id == quizId);
        if (!quizExists) return NotFound("Quiz not found.");

        var items = await _db.QuizQuestions.AsNoTracking()
            .Where(qq => qq.QuizId == quizId)
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
            .ToListAsync();

        return Ok(items);
    }

    // POST: api/quizzes/{quizId}/questions
    [HttpPost("quizzes/{quizId:int}/questions")]
    public async Task<ActionResult<QuizQuestionReadDto>> Add(int quizId, [FromBody] QuizQuestionAddDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var quiz = await _db.Quizzes.AsNoTracking().FirstOrDefaultAsync(q => q.Id == quizId);
        if (quiz is null) return NotFound("Quiz not found.");

        var question = await _db.Questions.AsNoTracking().FirstOrDefaultAsync(q => q.Id == dto.QuestionId);
        if (question is null) return BadRequest("QuestionId not found.");

        // Prevent duplicates
        var exists = await _db.QuizQuestions.AnyAsync(x => x.QuizId == quizId && x.QuestionId == dto.QuestionId);
        if (exists) return BadRequest("This question is already added to the quiz.");

        // Basic rule: ShortAnswer should have no options (already enforced in Step 2.3),
        // for other types ensure options exist before attaching to quiz.
        if (question.QuestionType != QuestionType.ShortAnswer)
        {
            var hasOptions = await _db.AnswerOptions.AnyAsync(o => o.QuestionId == question.Id);
            if (!hasOptions) return BadRequest("This question has no AnswerOptions. Add options first.");
        }

        // MCQ/TrueFalse should have at least 1 correct option
        if (question.QuestionType is QuestionType.MCQ or QuestionType.TrueFalse or QuestionType.MSQ)
        {
            var hasCorrect = await _db.AnswerOptions.AnyAsync(o => o.QuestionId == question.Id && o.IsCorrect);
            if (!hasCorrect) return BadRequest("This question has no correct AnswerOption marked.");
        }

        var qq = new QuizQuestion
        {
            QuizId = quizId,
            QuestionId = dto.QuestionId,
            Points = dto.Points,
            OrderIndex = dto.OrderIndex
        };

        _db.QuizQuestions.Add(qq);
        await _db.SaveChangesAsync();

        return Created(string.Empty, new QuizQuestionReadDto
        {
            Id = qq.Id,
            QuizId = qq.QuizId,
            QuestionId = qq.QuestionId,
            Points = qq.Points,
            OrderIndex = qq.OrderIndex,
            QuestionText = question.QuestionText,
            QuestionType = question.QuestionType
        });
    }

    // PUT: api/quiz-questions/{id}
    [HttpPut("quiz-questions/{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] QuizQuestionAddDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var qq = await _db.QuizQuestions.FirstOrDefaultAsync(x => x.Id == id);
        if (qq is null) return NotFound();

        // don't allow changing QuestionId/QuizId here; just points/order
        qq.Points = dto.Points;
        qq.OrderIndex = dto.OrderIndex;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/quiz-questions/{id}
    [HttpDelete("quiz-questions/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var qq = await _db.QuizQuestions.FirstOrDefaultAsync(x => x.Id == id);
        if (qq is null) return NotFound();

        _db.QuizQuestions.Remove(qq);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
