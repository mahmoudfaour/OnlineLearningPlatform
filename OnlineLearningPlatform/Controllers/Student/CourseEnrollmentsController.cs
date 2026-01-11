using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Enrollments;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Infrastructure;
using OnlineLearningPlatform.Models;

namespace OnlineLearningPlatform.API;

[ApiController]
[Route("api/[controller]")]
public class CourseEnrollmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public CourseEnrollmentsController(AppDbContext db) => _db = db;

    // GET: api/CourseEnrollments/user/1
    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<List<CourseEnrollmentReadDto>>> GetByUser(int userId)
    {
        var items = await _db.CourseEnrollments.AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.EnrolledAt)
            .Select(e => new CourseEnrollmentReadDto
            {
                Id = e.Id,
                CourseId = e.CourseId,
                UserId = e.UserId,
                EnrolledAt = e.EnrolledAt,
                Status = e.Status
            })
            .ToListAsync();

        return Ok(items);
    }

    // POST: api/CourseEnrollments
    [HttpPost]
    public async Task<ActionResult<CourseEnrollmentReadDto>> Enroll([FromBody] CourseEnrollmentCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var userExists = await _db.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists) return BadRequest("UserId not found.");

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == dto.CourseId);
        if (course is null) return BadRequest("CourseId not found.");

        if (!course.IsPublished) return BadRequest("Course is not published yet.");

        var already = await _db.CourseEnrollments
            .AnyAsync(e => e.CourseId == dto.CourseId && e.UserId == dto.UserId && e.Status == EnrollmentStatus.Active);

        if (already) return BadRequest("User already enrolled in this course.");

        var enrollment = new CourseEnrollment
        {
            CourseId = dto.CourseId,
            UserId = dto.UserId,
            EnrolledAt = DateTime.UtcNow,
            Status = EnrollmentStatus.Active
        };

        _db.CourseEnrollments.Add(enrollment);
        await _db.SaveChangesAsync();

        return Created(string.Empty, new CourseEnrollmentReadDto
        {
            Id = enrollment.Id,
            CourseId = enrollment.CourseId,
            UserId = enrollment.UserId,
            EnrolledAt = enrollment.EnrolledAt,
            Status = enrollment.Status
        });
    }

    // PATCH: api/CourseEnrollments/5/status?status=Dropped
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromQuery] EnrollmentStatus status)
    {
        var enrollment = await _db.CourseEnrollments.FirstOrDefaultAsync(e => e.Id == id);
        if (enrollment is null) return NotFound();

        enrollment.Status = status;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
