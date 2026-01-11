using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Questions;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.Controllers.Instructor;

[ApiController]
[Route("api/[controller]")]
public class QuestionBanksController : ControllerBase
{
    private readonly AppDbContext _db;
    public QuestionBanksController(AppDbContext db) => _db = db;

    // GET: api/QuestionBanks
    [HttpGet]
    public async Task<ActionResult<List<QuestionBankReadDto>>> GetAll()
    {
        var banks = await _db.QuestionBanks
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new QuestionBankReadDto
            {
                Id = x.Id,
                UserId = x.UserId,
                CourseId = x.CourseId,
                LessonId = x.LessonId,
                SourceType = x.SourceType,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(banks);
    }

    // GET: api/QuestionBanks/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<QuestionBankReadDto>> GetById(int id)
    {
        var bank = await _db.QuestionBanks.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new QuestionBankReadDto
            {
                Id = x.Id,
                UserId = x.UserId,
                CourseId = x.CourseId,
                LessonId = x.LessonId,
                SourceType = x.SourceType,
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync();

        return bank is null ? NotFound() : Ok(bank);
    }

    // POST: api/QuestionBanks
    [HttpPost]
    public async Task<ActionResult<QuestionBankReadDto>> Create([FromBody] QuestionBankCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        // Validate User
        var userExists = await _db.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists) return BadRequest("UserId not found.");

        // Validate optional Course/Lesson if provided
        if (dto.CourseId.HasValue)
        {
            var courseExists = await _db.Courses.AnyAsync(c => c.Id == dto.CourseId.Value);
            if (!courseExists) return BadRequest("CourseId not found.");
        }

        if (dto.LessonId.HasValue)
        {
            var lessonExists = await _db.Lessons.AnyAsync(l => l.Id == dto.LessonId.Value);
            if (!lessonExists) return BadRequest("LessonId not found.");
        }

        var bank = new QuestionBank
        {
            UserId = dto.UserId,
            CourseId = dto.CourseId,
            LessonId = dto.LessonId,
            SourceType = dto.SourceType,
            CreatedAt = DateTime.UtcNow
        };

        _db.QuestionBanks.Add(bank);
        await _db.SaveChangesAsync();

        var result = new QuestionBankReadDto
        {
            Id = bank.Id,
            UserId = bank.UserId,
            CourseId = bank.CourseId,
            LessonId = bank.LessonId,
            SourceType = bank.SourceType,
            CreatedAt = bank.CreatedAt
        };

        return CreatedAtAction(nameof(GetById), new { id = bank.Id }, result);
    }

    // DELETE: api/QuestionBanks/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var bank = await _db.QuestionBanks.FirstOrDefaultAsync(x => x.Id == id);
        if (bank is null) return NotFound();

        _db.QuestionBanks.Remove(bank);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
