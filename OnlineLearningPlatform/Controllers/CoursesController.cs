using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Courses;
using OnlineLearningPlatform.Application.DTOs.Enrollments;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;
using System.Security.Claims;

namespace OnlineLearningPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CoursesController(AppDbContext db) => _db = db;

    private int GetCurrentUserId()
        => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private bool IsAdmin()
        => User.IsInRole("Admin");

    private static CourseReadDto ToReadDto(Course c) => new()
    {
        Id = c.Id,
        Title = c.Title,
        Description = c.Description,
        UserId = c.UserId,
        CreatedAt = c.CreatedAt,
        IsPublished = c.IsPublished
    };

    // =========================
    // ADMIN
    // =========================

    // GET: api/Courses  (Admin sees all)
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(List<CourseReadDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CourseReadDto>>> GetAll()
    {
        var courses = await _db.Courses
            .AsNoTracking()
            .Select(c => ToReadDto(c))
            .ToListAsync();

        return Ok(courses);
    }

    // =========================
    // PUBLIC / STUDENT BROWSING
    // =========================

    // GET: api/Courses/published (Public: only published)
    [AllowAnonymous]
    [HttpGet("published")]
    [ProducesResponseType(typeof(List<CourseReadDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CourseReadDto>>> GetPublished()
    {
        var courses = await _db.Courses
            .AsNoTracking()
            .Where(c => c.IsPublished)
            .Select(c => ToReadDto(c))
            .ToListAsync();

        return Ok(courses);
    }

    // GET: api/Courses/5 (Public: only published)
    [AllowAnonymous]
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CourseReadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CourseReadDto>> GetById(int id)
    {
        var course = await _db.Courses
            .AsNoTracking()
            .Where(c => c.Id == id && c.IsPublished)
            .FirstOrDefaultAsync();

        return course is null ? NotFound() : Ok(ToReadDto(course));
    }

    // =========================
    // INSTRUCTOR / ADMIN (MANAGEMENT)
    // =========================

    // GET: api/Courses/manage/5
    // Instructor/Admin can see a course even if NOT published.
    // Instructor can only see their own course.
    [Authorize(Roles = "Instructor,Admin")]
    [HttpGet("manage/{id:int}")]
    [ProducesResponseType(typeof(CourseReadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<CourseReadDto>> GetManageById(int id)
    {
        var course = await _db.Courses
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (course is null) return NotFound();

        if (!IsAdmin())
        {
            var userId = GetCurrentUserId();
            if (course.UserId != userId) return Forbid();
        }

        return Ok(ToReadDto(course));
    }

    // POST: api/Courses
    // NOTE: we ignore dto.UserId completely for security.
    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    [ProducesResponseType(typeof(CourseReadDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CourseReadDto>> Create([FromBody] CourseCreateDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var userId = GetCurrentUserId();

        // (Optional safety) Ensure user exists (should be true if token is valid)
        var userExists = await _db.Users.AnyAsync(u => u.Id == userId);
        if (!userExists) return Unauthorized("Invalid token user.");

        var course = new Course
        {
            Title = dto.Title,
            Description = dto.Description,
            UserId = userId,               // ✅ from token
            CreatedAt = DateTime.UtcNow,
            IsPublished = false
        };

        _db.Courses.Add(course);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetManageById), new { id = course.Id }, ToReadDto(course));
    }

    // PUT: api/Courses/5
    // Instructor can update only their own course. Admin can update any.
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Update(int id, [FromBody] CourseCreateDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        if (!IsAdmin())
        {
            var userId = GetCurrentUserId();
            if (course.UserId != userId) return Forbid();
        }

        course.Title = dto.Title;
        course.Description = dto.Description;
        // ✅ NEVER set course.UserId from dto

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PATCH: api/Courses/5/publish
    [HttpPatch("{id:int}/publish")]
    [Authorize(Roles = "Instructor,Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Publish(int id)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        if (!IsAdmin())
        {
            var userId = GetCurrentUserId();
            if (course.UserId != userId) return Forbid();
        }

        course.IsPublished = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PATCH: api/Courses/5/unpublish
    [HttpPatch("{id:int}/unpublish")]
    [Authorize(Roles = "Instructor,Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Unpublish(int id)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        if (!IsAdmin())
        {
            var userId = GetCurrentUserId();
            if (course.UserId != userId) return Forbid();
        }

        course.IsPublished = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Courses/5  (Admin only)
    // DELETE: api/Courses/5  (Admin only)
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        using var tx = await _db.Database.BeginTransactionAsync();

        try
        {
            // 1) Get lesson ids for this course
            var lessonIds = await _db.Lessons
                .Where(l => l.CourseId == id)
                .Select(l => l.Id)
                .ToListAsync();

            // 2) ===== AI Drafts (Options -> Questions -> Drafts) =====
            var draftIds = await _db.AiQuizDrafts
                .Where(d => d.CourseId == id || lessonIds.Contains(d.LessonId))
                .Select(d => d.Id)
                .ToListAsync();

            if (draftIds.Count > 0)
            {
                var draftQuestionIds = await _db.AiQuizDraftQuestions
                    .Where(q => draftIds.Contains(q.DraftId))
                    .Select(q => q.Id)
                    .ToListAsync();

                if (draftQuestionIds.Count > 0)
                {
                    var draftOptions = await _db.AiQuizDraftOptions
                        .Where(o => draftQuestionIds.Contains(o.DraftQuestionId))
                        .ToListAsync();

                    _db.AiQuizDraftOptions.RemoveRange(draftOptions);

                    var draftQuestions = await _db.AiQuizDraftQuestions
                        .Where(q => draftIds.Contains(q.DraftId))
                        .ToListAsync();

                    _db.AiQuizDraftQuestions.RemoveRange(draftQuestions);
                }

                var drafts = await _db.AiQuizDrafts
                    .Where(d => draftIds.Contains(d.Id))
                    .ToListAsync();

                _db.AiQuizDrafts.RemoveRange(drafts);
            }

            // 3) ===== QuestionBank -> Questions -> AnswerOptions =====
            var bankIds = await _db.QuestionBanks
                .Where(b => b.CourseId == id)
                .Select(b => b.Id)
                .ToListAsync();

            if (bankIds.Count > 0)
            {
                var questionIds = await _db.Questions
                    .Where(q => bankIds.Contains(q.QuestionBankId))
                    .Select(q => q.Id)
                    .ToListAsync();

                if (questionIds.Count > 0)
                {
                    var answerOptions = await _db.AnswerOptions
                        .Where(a => questionIds.Contains(a.QuestionId))
                        .ToListAsync();

                    _db.AnswerOptions.RemoveRange(answerOptions);

                    var questions = await _db.Questions
                        .Where(q => questionIds.Contains(q.Id))
                        .ToListAsync();

                    _db.Questions.RemoveRange(questions);
                }

                var banks = await _db.QuestionBanks
                    .Where(b => bankIds.Contains(b.Id))
                    .ToListAsync();

                _db.QuestionBanks.RemoveRange(banks);
            }

            // 4) ===== Quizzes / QuizQuestions (if you have them linked to Course) =====
            var quizIds = await _db.Quizzes
                .Where(q => q.CourseId == id)
                .Select(q => q.Id)
                .ToListAsync();

            if (quizIds.Count > 0)
            {
                var quizQuestions = await _db.QuizQuestions
                    .Where(qq => quizIds.Contains(qq.QuizId))
                    .ToListAsync();

                _db.QuizQuestions.RemoveRange(quizQuestions);

                var quizzes = await _db.Quizzes
                    .Where(q => quizIds.Contains(q.Id))
                    .ToListAsync();

                _db.Quizzes.RemoveRange(quizzes);
            }

            // 5) ===== Lesson attachments (if linked by LessonId) =====
            if (lessonIds.Count > 0)
            {
                var attachments = await _db.LessonAttachments
                    .Where(a => lessonIds.Contains(a.LessonId))
                    .ToListAsync();

                _db.LessonAttachments.RemoveRange(attachments);
            }

            // 6) ===== Lessons =====
            if (lessonIds.Count > 0)
            {
                var lessons = await _db.Lessons
                    .Where(l => lessonIds.Contains(l.Id))
                    .ToListAsync();

                _db.Lessons.RemoveRange(lessons);
            }

            // 7) ===== Enrollments =====
            var enrollments = await _db.CourseEnrollments
                .Where(e => e.CourseId == id)
                .ToListAsync();

            _db.CourseEnrollments.RemoveRange(enrollments);

            // 8) ===== Finally Course =====
            _db.Courses.Remove(course);

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return NoContent();
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            return Conflict(ex.InnerException?.Message ?? ex.Message);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            return StatusCode(500, ex.Message);
        }
    }



    // GET: api/Courses/mine
    [HttpGet("mine")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<List<CourseReadDto>>> GetMine()
    {
        var userId = GetCurrentUserId();

        var query = _db.Courses.AsNoTracking();

        if (!IsAdmin())
            query = query.Where(c => c.UserId == userId);

        var courses = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => ToReadDto(c))
            .ToListAsync();

        return Ok(courses);
    }


    // GET: api/Courses/{id}/enrollments
    [HttpGet("{id:int}/enrollments")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<List<CourseEnrollmentInstructorReadDto>>> GetEnrollments(int id)
    {
        var course = await _db.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound("Course not found.");

        if (!IsAdmin())
        {
            var userId = GetCurrentUserId();
            if (course.UserId != userId) return Forbid();
        }

        var enrollments = await _db.CourseEnrollments.AsNoTracking()
            .Where(e => e.CourseId == id)
            .OrderByDescending(e => e.EnrolledAt)
            .Select(e => new CourseEnrollmentInstructorReadDto
            {
                Id = e.Id,
                CourseId = e.CourseId,
                UserId = e.UserId,
                StudentName = e.User.FullName,
                StudentEmail = e.User.Email,
                EnrolledAt = e.EnrolledAt,
                Status = e.Status
            })
            .ToListAsync();

        return Ok(enrollments);
    }


}
