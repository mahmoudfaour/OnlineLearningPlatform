using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Courses;
using OnlineLearningPlatform.Domain;

namespace OnlineLearningPlatform.Infrastructure;



[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CoursesController(AppDbContext db) => _db = db;

    // GET: api/Courses
    [HttpGet]
    [ProducesResponseType(typeof(List<CourseReadDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CourseReadDto>>> GetAll()
    {
        var courses = await _db.Courses
            .AsNoTracking()
            .Select(c => new CourseReadDto
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                UserId = c.UserId,
                CreatedAt = c.CreatedAt,
                IsPublished = c.IsPublished
            })
            .ToListAsync();

        return Ok(courses);
    }

    // GET: api/Courses/5
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CourseReadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CourseReadDto>> GetById(int id)
    {
        var course = await _db.Courses
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new CourseReadDto
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                UserId = c.UserId,
                CreatedAt = c.CreatedAt,
                IsPublished = c.IsPublished
            })
            .FirstOrDefaultAsync();

        return course is null ? NotFound() : Ok(course);
    }

    // POST: api/Courses
    [HttpPost]
    [ProducesResponseType(typeof(CourseReadDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CourseReadDto>> Create([FromBody] CourseCreateDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        // Ensure creator user exists
        var userExists = await _db.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists) return BadRequest("UserId not found.");

        var course = new Course
        {
            Title = dto.Title,
            Description = dto.Description,
            UserId = dto.UserId,
            CreatedAt = DateTime.UtcNow,
            IsPublished = false
        };

        _db.Courses.Add(course);
        await _db.SaveChangesAsync();

        var result = new CourseReadDto
        {
            Id = course.Id,
            Title = course.Title,
            Description = course.Description,
            UserId = course.UserId,
            CreatedAt = course.CreatedAt,
            IsPublished = course.IsPublished
        };

        return CreatedAtAction(nameof(GetById), new { id = course.Id }, result);
    }

    // PUT: api/Courses/5
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] CourseCreateDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        var userExists = await _db.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists) return BadRequest("UserId not found.");

        course.Title = dto.Title;
        course.Description = dto.Description;
        course.UserId = dto.UserId;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PATCH: api/Courses/5/publish
    [HttpPatch("{id:int}/publish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Publish(int id)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        course.IsPublished = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PATCH: api/Courses/5/unpublish
    [HttpPatch("{id:int}/unpublish")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unpublish(int id)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id);
        if (course is null) return NotFound();

        course.IsPublished = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Courses/5
    [HttpDelete("{id:int}")]
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


    // student workflow 
    // GET: api/courses/published
    [HttpGet("published")]
    public async Task<ActionResult<List<CourseReadDto>>> GetPublished()
    {
        var courses = await _db.Courses
            .AsNoTracking()
            .Where(c => c.IsPublished)
            .Select(c => new CourseReadDto
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                UserId = c.UserId,
                CreatedAt = c.CreatedAt,
                IsPublished = c.IsPublished
            })
            .ToListAsync();

        return Ok(courses);
    }

}
