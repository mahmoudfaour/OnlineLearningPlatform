using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.API.Services;
using OnlineLearningPlatform.Application.DTOs;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;
using System.Security.Claims;
using System.Security.Cryptography;

namespace OnlineLearningPlatform.API;

[ApiController]
[Route("api/student/certificates")]
[Authorize(Roles = "Student")]
public class CertificatesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly CertificatePdfGenerator _pdf;

    public CertificatesController(AppDbContext db, IWebHostEnvironment env, CertificatePdfGenerator pdf)
    {
        _db = db;
        _env = env;
        _pdf = pdf;
    }

    // POST: api/student/certificates/generate
    [HttpPost("generate")]
    public async Task<ActionResult<CertificateReadDto>> Generate([FromBody] GenerateCertificateDto dto)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        // Security: student can only generate for himself (if token has user id)
        var tokenUserId = GetUserIdFromClaims();
        if (tokenUserId.HasValue && tokenUserId.Value != dto.UserId)
            return Forbid();

        // must be enrolled & active
        var enrollment = await _db.CourseEnrollments.AsNoTracking()
            .FirstOrDefaultAsync(e =>
                e.CourseId == dto.CourseId &&
                e.UserId == dto.UserId &&
                e.Status == EnrollmentStatus.Active);

        if (enrollment is null)
            return BadRequest("User is not actively enrolled in this course.");

        // already generated?
        var existing = await _db.Certificates.AsNoTracking()
            .FirstOrDefaultAsync(c => c.CourseId == dto.CourseId && c.UserId == dto.UserId);

        if (existing is not null)
        {
            return Ok(new CertificateReadDto
            {
                Id = existing.Id,
                CourseId = existing.CourseId,
                UserId = existing.UserId,
                CertificateCode = existing.CertificateCode,
                GeneratedAt = existing.GeneratedAt
            });
        }

        // RULE 1: all lessons completed
        var totalLessons = await _db.Lessons.AsNoTracking()
            .CountAsync(l => l.CourseId == dto.CourseId);

        var completedLessons = await _db.LessonCompletions.AsNoTracking()
            .Join(_db.Lessons.AsNoTracking(),
                  lc => lc.LessonId,
                  l => l.Id,
                  (lc, l) => new { lc, l })
            .CountAsync(x => x.lc.UserId == dto.UserId && x.l.CourseId == dto.CourseId);

        if (totalLessons > 0 && completedLessons < totalLessons)
            return BadRequest("Certificate not eligible: not all lessons completed.");

        // RULE 2: FINAL QUIZ must exist + passed
        var finalQuiz = await _db.Quizzes.AsNoTracking()
            .Where(q => q.CourseId == dto.CourseId && q.IsFinal)
            .Select(q => new { q.Id, q.PassingScorePercent })
            .FirstOrDefaultAsync();

        if (finalQuiz is null)
            return BadRequest("Certificate not eligible: final quiz is not configured for this course.");

        var bestFinalScore = await _db.QuizAttempts.AsNoTracking()
            .Where(a => a.UserId == dto.UserId && a.QuizId == finalQuiz.Id && a.SubmittedAt != null)
            .MaxAsync(a => (double?)a.ScorePercent);

        if (bestFinalScore is null || bestFinalScore < finalQuiz.PassingScorePercent)
            return BadRequest($"Certificate not eligible: final quiz not passed (need {finalQuiz.PassingScorePercent}%).");

        // create certificate
        var cert = new Certificate
        {
            CourseId = dto.CourseId,
            UserId = dto.UserId,
            CertificateCode = GenerateCode(),
            GeneratedAt = DateTime.UtcNow
        };

        _db.Certificates.Add(cert);
        await _db.SaveChangesAsync();

        return Ok(new CertificateReadDto
        {
            Id = cert.Id,
            CourseId = cert.CourseId,
            UserId = cert.UserId,
            CertificateCode = cert.CertificateCode,
            GeneratedAt = cert.GeneratedAt
        });
    }

    // GET: api/student/certificates/user/{userId}
    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<List<CertificateReadDto>>> GetByUser(int userId)
    {
        // Security: student can only read his own
        var tokenUserId = GetUserIdFromClaims();
        if (tokenUserId.HasValue && tokenUserId.Value != userId)
            return Forbid();

        var list = await _db.Certificates.AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.GeneratedAt)
            .Select(c => new CertificateReadDto
            {
                Id = c.Id,
                CourseId = c.CourseId,
                UserId = c.UserId,
                CertificateCode = c.CertificateCode,
                GeneratedAt = c.GeneratedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // ✅ Download PDF
    // GET: api/student/certificates/{certificateId}/download
    [HttpGet("{certificateId:int}/download")]
    public async Task<IActionResult> Download(int certificateId)
    {
        var cert = await _db.Certificates.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == certificateId);

        if (cert is null)
            return NotFound("Certificate not found.");

        // Security: only owner can download
        var tokenUserId = GetUserIdFromClaims();
        if (tokenUserId.HasValue && tokenUserId.Value != cert.UserId)
            return Forbid();

        // ✅ IMPORTANT FIX: Courses primary key is Id (not CourseId)
        var courseTitle = await _db.Courses.AsNoTracking()
            .Where(c => c.Id == cert.CourseId)
            .Select(c => c.Title)
            .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(courseTitle))
            courseTitle = $"Course #{cert.CourseId}";

        // ✅ IMPORTANT FIX: Users primary key is Id (not UserId)
        var studentName = await _db.Users.AsNoTracking()
            .Where(u => u.Id == cert.UserId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(studentName))
            studentName = $"User #{cert.UserId}";

        var templatePath = Path.Combine(_env.WebRootPath, "certificate-templates", "default.svg");

        byte[] pdfBytes;
        try
        {
            pdfBytes = _pdf.Generate(
                courseTitle: courseTitle,
                studentName: studentName,
                certificateCode: cert.CertificateCode,
                generatedAtUtc: cert.GeneratedAt,
                templatePath: templatePath
            );
        }
        catch (FileNotFoundException ex)
        {
            return Problem($"Template missing: {ex.FileName}", statusCode: 500);
        }
        catch (Exception ex)
        {
            return Problem($"PDF generation failed: {ex.Message}", statusCode: 500);
        }

        var safeCourse = string.Join("_", courseTitle.Split(Path.GetInvalidFileNameChars()))
            .Replace(" ", "_");

        var fileName = $"Certificate_{safeCourse}_{cert.CertificateCode}.pdf";

        return File(pdfBytes, "application/pdf", fileName);
    }

    private int? GetUserIdFromClaims()
    {
        var val =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("nameid") ??
            User.FindFirstValue("sub") ??
            User.Claims.FirstOrDefault(c => c.Type.EndsWith("/nameidentifier"))?.Value;

        return int.TryParse(val, out var id) ? id : null;
    }

    private static string GenerateCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var bytes = RandomNumberGenerator.GetBytes(12);
        return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
    }
}
