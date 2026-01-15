using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Enrollments;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;
using System.Security.Claims;

namespace OnlineLearningPlatform.API;

[ApiController]
[Route("api/student/[controller]")]
[Authorize(Roles = "Student")]
public class CourseEnrollmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public CourseEnrollmentsController(AppDbContext db) => _db = db;

    private int CurrentUserId()
        => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ✅ GET: api/student/courseenrollments/my
    // Returns enrollments of the logged-in student only
    [HttpGet("my")]
    [ProducesResponseType(typeof(List<CourseEnrollmentReadDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CourseEnrollmentReadDto>>> GetMyEnrollments()
    {
        var userId = CurrentUserId();

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

    // ✅ POST: api/student/courseenrollments
    // Body: { "courseId": 1 }
    [HttpPost]
    [ProducesResponseType(typeof(CourseEnrollmentReadDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CourseEnrollmentReadDto>> Enroll([FromBody] CourseEnrollmentCreateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var userId = CurrentUserId();

        var course = await _db.Courses.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == dto.CourseId);

        if (course is null) return BadRequest("CourseId not found.");
        if (!course.IsPublished) return BadRequest("Course is not published yet.");

        var already = await _db.CourseEnrollments
            .AnyAsync(e => e.CourseId == dto.CourseId && e.UserId == userId && e.Status == EnrollmentStatus.Active);

        if (already) return BadRequest("You are already enrolled in this course.");

        var enrollment = new CourseEnrollment
        {
            CourseId = dto.CourseId,
            UserId = userId, // ✅ from token
            EnrolledAt = DateTime.UtcNow,
            Status = EnrollmentStatus.Active
        };

        _db.CourseEnrollments.Add(enrollment);
        await _db.SaveChangesAsync();

        var result = new CourseEnrollmentReadDto
        {
            Id = enrollment.Id,
            CourseId = enrollment.CourseId,
            UserId = enrollment.UserId,
            EnrolledAt = enrollment.EnrolledAt,
            Status = enrollment.Status
        };

        // optional: CreatedAt route could be added if you have GetById
        return Created(string.Empty, result);
    }

    // ✅ PATCH: api/student/courseenrollments/5/status?status=Dropped
    // Student can only update status of THEIR OWN enrollment
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateStatus(int id, [FromQuery] EnrollmentStatus status)
    {
        var userId = CurrentUserId();

        var enrollment = await _db.CourseEnrollments
            .FirstOrDefaultAsync(e => e.Id == id);

        if (enrollment is null) return NotFound();

        if (enrollment.UserId != userId)
            return Forbid(); // ✅ cannot modify another student's enrollment

        enrollment.Status = status;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
