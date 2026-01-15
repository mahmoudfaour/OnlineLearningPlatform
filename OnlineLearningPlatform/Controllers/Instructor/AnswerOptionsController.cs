using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Questions;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.API.Controllers.Instructor;

[ApiController]
[Route("api")]
[Authorize(Roles = "Instructor,Admin")]

public class AnswerOptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AnswerOptionsController(AppDbContext db) => _db = db;

    // GET: api/questions/{questionId}/options
    [HttpGet("questions/{questionId:int}/options")]
    public async Task<ActionResult<List<AnswerOptionReadDto>>> GetByQuestion(int questionId)
    {
        var questionExists = await _db.Questions.AnyAsync(q => q.Id == questionId);
        if (!questionExists) return NotFound("Question not found.");

        var options = await _db.AnswerOptions.AsNoTracking()
            .Where(o => o.QuestionId == questionId)
            .Select(o => new AnswerOptionReadDto
            {
                Id = o.Id,
                QuestionId = o.QuestionId,
                AnswerText = o.AnswerText,
                IsCorrect = o.IsCorrect
            })
            .ToListAsync();

        return Ok(options);
    }

    // POST: api/questions/{questionId}/options
    [HttpPost("questions/{questionId:int}/options")]
    public async Task<ActionResult<AnswerOptionReadDto>> Create(int questionId, [FromBody] AnswerOptionCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var question = await _db.Questions.FirstOrDefaultAsync(q => q.Id == questionId);
        if (question is null) return NotFound("Question not found.");

        // Minimal safety: ShortAnswer should not have options
        if (question.QuestionType == QuestionType.ShortAnswer)
            return BadRequest("ShortAnswer questions do not use AnswerOptions.");

        // MCQ: only one correct answer (enforced here)
        if (question.QuestionType == QuestionType.MCQ && dto.IsCorrect)
        {
            var alreadyCorrect = await _db.AnswerOptions.AnyAsync(o => o.QuestionId == questionId && o.IsCorrect);
            if (alreadyCorrect) return BadRequest("MCQ can have only one correct answer.");
        }

        var option = new AnswerOption
        {
            QuestionId = questionId,
            AnswerText = dto.AnswerText,
            IsCorrect = dto.IsCorrect
        };

        _db.AnswerOptions.Add(option);
        await _db.SaveChangesAsync();

        var result = new AnswerOptionReadDto
        {
            Id = option.Id,
            QuestionId = option.QuestionId,
            AnswerText = option.AnswerText,
            IsCorrect = option.IsCorrect
        };

        return Created(string.Empty, result);
    }

    // DELETE: api/options/{id}
    [HttpDelete("options/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var option = await _db.AnswerOptions.FirstOrDefaultAsync(o => o.Id == id);
        if (option is null) return NotFound();

        _db.AnswerOptions.Remove(option);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
