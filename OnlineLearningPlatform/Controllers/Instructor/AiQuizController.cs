using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.AiQuiz;
using OnlineLearningPlatform.Application.Services.AiQuiz;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;
using System.Security.Claims;

namespace OnlineLearningPlatform.Controllers.Instructor;

[ApiController]
[Route("api/instructor")]
[Authorize(Roles = "Instructor")]
public class AiQuizController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAiQuizGenerator _ai;

    public AiQuizController(AppDbContext db, IAiQuizGenerator ai)
    {
        _db = db;
        _ai = ai;
    }

    private int GetUserId()
    {
        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirst("id")?.Value;

        if (string.IsNullOrWhiteSpace(idStr))
            throw new UnauthorizedAccessException("Missing user id claim in token.");

        return int.Parse(idStr);
    }

    // POST: api/instructor/lessons/{lessonId}/ai-quiz/generate?count=5
    [HttpPost("lessons/{lessonId:int}/ai-quiz/generate")]
    public async Task<ActionResult<AiQuizDraftReadDto>> Generate(
    int lessonId,
    [FromQuery] int count = 5,
    [FromBody] AiQuizGenerateRequestDto? body = null)
    {
        if (count < 1) count = 1;
        if (count > 20) count = 20;

        var userId = GetUserId();

        var lesson = await _db.Lessons.AsNoTracking()
            .Where(l => l.Id == lessonId)
            .Select(l => new
            {
                l.Id,
                l.CourseId,
                l.Title,
                l.ContentText,
                l.VideoUrl
            })
            .FirstOrDefaultAsync();

        if (lesson is null) return NotFound("Lesson not found.");

        var lessonText = (lesson.ContentText ?? "").Trim();
        if (string.IsNullOrWhiteSpace(lessonText))
            lessonText = (lesson.Title ?? "").Trim();

        if (string.IsNullOrWhiteSpace(lessonText))
            return BadRequest("Lesson has no ContentText (and no Title text) to generate questions from.");

        if (lessonText.Length > 8000)
            lessonText = lessonText[..8000];

        var generated = await _ai.GenerateMcqAsync(lessonText, count);

        var draft = new AiQuizDraft
        {
            LessonId = lesson.Id,
            CourseId = lesson.CourseId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            Questions = generated.Select(g => new AiQuizDraftQuestion
            {
                QuestionText = g.QuestionText,
                QuestionType = QuestionType.MCQ,
                Explanation = g.Explanation,
                Options = g.Options.Select(o => new AiQuizDraftOption
                {
                    AnswerText = o.AnswerText,
                    IsCorrect = o.IsCorrect
                }).ToList()
            }).ToList()
        };

        _db.AiQuizDrafts.Add(draft);
        await _db.SaveChangesAsync();

        return Ok(ToReadDto(draft));
    }

    // GET: api/instructor/ai-quiz/drafts/latest?lessonId=12
    [HttpGet("ai-quiz/drafts/latest")]
    public async Task<ActionResult<AiQuizDraftReadDto>> GetLatest([FromQuery] int lessonId)
    {
        var userId = GetUserId();

        var draft = await _db.AiQuizDrafts.AsNoTracking()
            .Where(d => d.LessonId == lessonId && d.UserId == userId)
            .OrderByDescending(d => d.CreatedAt)
            .Include(d => d.Questions).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync();

        if (draft is null) return NotFound("No draft found for this lesson.");
        return Ok(ToReadDto(draft));
    }

    // PUT: api/instructor/ai-quiz/drafts/{draftId}
    [HttpPut("ai-quiz/drafts/{draftId:int}")]
    public async Task<IActionResult> UpdateDraft(int draftId, [FromBody] AiQuizDraftUpdateDto dto)
    {
        var userId = GetUserId();
        if (dto.Id != draftId) return BadRequest("Draft id mismatch.");

        var draft = await _db.AiQuizDrafts
            .Include(d => d.Questions).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(d => d.Id == draftId && d.UserId == userId);

        if (draft is null) return NotFound("Draft not found.");

        var incomingQIds = dto.Questions.Where(x => x.Id > 0).Select(x => x.Id).ToHashSet();
        var toRemoveQuestions = draft.Questions.Where(q => !incomingQIds.Contains(q.Id)).ToList();
        _db.AiQuizDraftQuestions.RemoveRange(toRemoveQuestions);

        foreach (var qDto in dto.Questions)
        {
            AiQuizDraftQuestion qEntity;

            if (qDto.Id == 0)
            {
                qEntity = new AiQuizDraftQuestion
                {
                    QuestionText = qDto.QuestionText ?? "",
                    QuestionType = qDto.QuestionType,
                    Explanation = qDto.Explanation,
                    Options = new List<AiQuizDraftOption>()
                };
                draft.Questions.Add(qEntity);
            }
            else
            {
                qEntity = draft.Questions.First(q => q.Id == qDto.Id);
                qEntity.QuestionText = qDto.QuestionText ?? "";
                qEntity.QuestionType = qDto.QuestionType;
                qEntity.Explanation = qDto.Explanation;
            }

            var incomingOIds = qDto.Options.Where(o => o.Id > 0).Select(o => o.Id).ToHashSet();
            var removeOptions = qEntity.Options.Where(o => !incomingOIds.Contains(o.Id)).ToList();
            _db.AiQuizDraftOptions.RemoveRange(removeOptions);

            foreach (var oDto in qDto.Options)
            {
                if (oDto.Id == 0)
                {
                    qEntity.Options.Add(new AiQuizDraftOption
                    {
                        AnswerText = oDto.AnswerText ?? "",
                        IsCorrect = oDto.IsCorrect
                    });
                }
                else
                {
                    var oEntity = qEntity.Options.First(o => o.Id == oDto.Id);
                    oEntity.AnswerText = oDto.AnswerText ?? "";
                    oEntity.IsCorrect = oDto.IsCorrect;
                }
            }

            // Enforce single correct for MCQ/TrueFalse
            if (qEntity.QuestionType is QuestionType.MCQ or QuestionType.TrueFalse)
            {
                var correct = qEntity.Options.Where(x => x.IsCorrect).ToList();
                if (correct.Count > 1)
                {
                    for (int i = 1; i < correct.Count; i++) correct[i].IsCorrect = false;
                }
            }
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/instructor/ai-quiz/drafts/{draftId}
    [HttpDelete("ai-quiz/drafts/{draftId:int}")]
    public async Task<IActionResult> DeleteDraft(int draftId)
    {
        var userId = GetUserId();

        var draft = await _db.AiQuizDrafts
            .FirstOrDefaultAsync(d => d.Id == draftId && d.UserId == userId);

        if (draft is null) return NotFound();

        _db.AiQuizDrafts.Remove(draft);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ✅ STEP 3: APPROVE DRAFT -> SAVE INTO REAL TABLES (QuestionBank/Questions/AnswerOptions)
    // POST: api/instructor/ai-quiz/drafts/{draftId}/approve
    [HttpPost("ai-quiz/drafts/{draftId:int}/approve")]
    public async Task<ActionResult<AiQuizApproveResultDto>> Approve(int draftId)
    {
        var userId = GetUserId();

        // Load draft + children (must belong to instructor)
        var draft = await _db.AiQuizDrafts
            .Include(d => d.Questions).ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(d => d.Id == draftId && d.UserId == userId);

        if (draft is null) return NotFound("Draft not found.");

        if (draft.Questions is null || draft.Questions.Count == 0)
            return BadRequest("Draft has no questions to approve.");

        // Validate each question minimally
        foreach (var q in draft.Questions)
        {
            if (string.IsNullOrWhiteSpace(q.QuestionText))
                return BadRequest("One or more questions have empty QuestionText.");

            // For MCQ/TrueFalse: require options + exactly 1 correct (we enforce)
            if (q.QuestionType is QuestionType.MCQ or QuestionType.TrueFalse)
            {
                if (q.Options is null || q.Options.Count < 2)
                    return BadRequest("MCQ questions must have at least 2 options.");

                // enforce exactly 1 correct
                var correctCount = q.Options.Count(o => o.IsCorrect);
                if (correctCount == 0) q.Options[0].IsCorrect = true;
                if (correctCount > 1)
                {
                    var first = q.Options.First(o => o.IsCorrect);
                    foreach (var o in q.Options)
                        o.IsCorrect = (o == first);
                }
            }
        }

        using var tx = await _db.Database.BeginTransactionAsync();

        // Create a new QuestionBank for this approval (marked AI, not manual)
        var bank = new QuestionBank
        {
            UserId = userId,
            CourseId = draft.CourseId,
            LessonId = draft.LessonId,
            SourceType = SourceType.AI,   // ✅ FIX
            CreatedAt = DateTime.UtcNow
        };


        _db.QuestionBanks.Add(bank);
        await _db.SaveChangesAsync(); // bank.Id now available

        var createdQuestionIds = new List<int>();

        foreach (var dq in draft.Questions)
        {
            var qEntity = new Question
            {
                QuestionBankId = bank.Id,
                QuestionText = dq.QuestionText,
                QuestionType = dq.QuestionType,
                Explanation = dq.Explanation
            };

            _db.Questions.Add(qEntity);
            await _db.SaveChangesAsync(); // qEntity.Id now available

            createdQuestionIds.Add(qEntity.Id);

            // Add AnswerOptions (except ShortAnswer)
            if (dq.QuestionType != QuestionType.ShortAnswer)
            {
                var opts = (dq.Options ?? new List<AiQuizDraftOption>())
                    .Where(o => !string.IsNullOrWhiteSpace(o.AnswerText))
                    .ToList();

                // Safety: MCQ requires at least 2 options
                if (dq.QuestionType == QuestionType.MCQ && opts.Count < 2)
                    return BadRequest("One or more MCQ questions has less than 2 valid options.");

                foreach (var o in opts)
                {
                    _db.AnswerOptions.Add(new AnswerOption
                    {
                        QuestionId = qEntity.Id,
                        AnswerText = o.AnswerText,
                        IsCorrect = o.IsCorrect
                    });
                }

                await _db.SaveChangesAsync();
            }
        }

        // OPTIONAL behavior: delete draft after approve (prevents double-approve duplicates)
        _db.AiQuizDrafts.Remove(draft);
        await _db.SaveChangesAsync();

        await tx.CommitAsync();

        var result = new AiQuizApproveResultDto
        {
            QuestionBankId = bank.Id,
            CreatedQuestionsCount = createdQuestionIds.Count,
            CreatedQuestionIds = createdQuestionIds
        };

        return Created(string.Empty, result);
    }

    // --------------------
    // Helpers
    // --------------------
    private static AiQuizDraftReadDto ToReadDto(AiQuizDraft draft)
    {
        return new AiQuizDraftReadDto
        {
            Id = draft.Id,
            CourseId = draft.CourseId,
            LessonId = draft.LessonId,
            UserId = draft.UserId,
            CreatedAt = draft.CreatedAt,
            Questions = (draft.Questions ?? new List<AiQuizDraftQuestion>())
                .Select(q => new AiQuizDraftQuestionReadDto
                {
                    Id = q.Id,
                    QuestionText = q.QuestionText ?? "",
                    QuestionType = q.QuestionType,
                    Explanation = q.Explanation,
                    Options = (q.Options ?? new List<AiQuizDraftOption>())
                        .Select(o => new AiQuizDraftOptionReadDto
                        {
                            Id = o.Id,
                            AnswerText = o.AnswerText ?? "",
                            IsCorrect = o.IsCorrect
                        })
                        .ToList()
                })
                .ToList()
        };
    }
}
