using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Lessons;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.Controllers.Instructor;

[ApiController]
[Route("api")]
public class LessonAttachmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public LessonAttachmentsController(AppDbContext db) => _db = db;

    // GET: api/lessons/{lessonId}/attachments
    [HttpGet("lessons/{lessonId:int}/attachments")]
    public async Task<ActionResult<List<LessonAttachmentReadDto>>> GetByLesson(int lessonId)
    {
        var lessonExists = await _db.Lessons.AnyAsync(l => l.Id == lessonId);
        if (!lessonExists) return NotFound("Lesson not found.");

        var items = await _db.LessonAttachments.AsNoTracking()
            .Where(a => a.LessonId == lessonId)
            .Select(a => new LessonAttachmentReadDto
            {
                Id = a.Id,
                LessonId = a.LessonId,
                FileUrl = a.FileUrl,
                FileType = a.FileType
            })
            .ToListAsync();

        return Ok(items);
    }

    // POST: api/lessons/{lessonId}/attachments
    [HttpPost("lessons/{lessonId:int}/attachments")]
    public async Task<ActionResult<LessonAttachmentReadDto>> Create(int lessonId, [FromBody] LessonAttachmentCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var lessonExists = await _db.Lessons.AnyAsync(l => l.Id == lessonId);
        if (!lessonExists) return NotFound("Lesson not found.");

        var attachment = new LessonAttachment
        {
            LessonId = lessonId,
            FileUrl = dto.FileUrl,
            FileType = dto.FileType
        };

        _db.LessonAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        return Created(string.Empty, new LessonAttachmentReadDto
        {
            Id = attachment.Id,
            LessonId = attachment.LessonId,
            FileUrl = attachment.FileUrl,
            FileType = attachment.FileType
        });
    }

    // DELETE: api/attachments/{id}
    [HttpDelete("attachments/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var attachment = await _db.LessonAttachments.FirstOrDefaultAsync(a => a.Id == id);
        if (attachment is null) return NotFound();

        _db.LessonAttachments.Remove(attachment);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
