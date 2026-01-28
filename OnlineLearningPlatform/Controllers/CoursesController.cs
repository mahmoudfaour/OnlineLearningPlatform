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
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        _db.Courses.Remove(course);
        await _db.SaveChangesAsync();
        return NoContent();
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
