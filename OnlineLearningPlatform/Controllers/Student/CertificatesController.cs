using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;
using System.Security.Cryptography;

namespace OnlineLearningPlatform.API;

[ApiController]
[Route("api/student/certificates")]
[Authorize(Roles = "Student")]
public class CertificatesController : ControllerBase
{
    private readonly AppDbContext _db;
    public CertificatesController(AppDbContext db) => _db = db;

    // POST: api/student/certificates/generate
    [HttpPost("generate")]
    public async Task<ActionResult<CertificateReadDto>> Generate([FromBody] GenerateCertificateDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        // must be enrolled
        var enrollment = await _db.CourseEnrollments.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CourseId == dto.CourseId && e.UserId == dto.UserId);

        if (enrollment is null)
            return BadRequest("User is not enrolled in this course.");

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
            .CountAsync(lc => lc.UserId == dto.UserId && lc.Lesson.CourseId == dto.CourseId);

        if (totalLessons > 0 && completedLessons < totalLessons)
            return BadRequest("Certificate not eligible: not all lessons completed.");

        // RULE 2: all required quizzes passed
        // In your DB you don't have "IsRequired", so we assume ALL quizzes are required.
        var quizzes = await _db.Quizzes.AsNoTracking()
            .Where(q => q.CourseId == dto.CourseId)
            .Select(q => new { q.Id, q.PassingScorePercent })
            .ToListAsync();

        foreach (var quiz in quizzes)
        {
            var bestScore = await _db.QuizAttempts.AsNoTracking()
                .Where(a => a.UserId == dto.UserId && a.QuizId == quiz.Id && a.SubmittedAt != null)
                .MaxAsync(a => (double?)a.ScorePercent);

            if (bestScore is null || bestScore < quiz.PassingScorePercent)
                return BadRequest($"Certificate not eligible: quiz {quiz.Id} not passed yet.");
        }

        // Generate a verification code
        var code = GenerateCode();

        var cert = new Certificate
        {
            CourseId = dto.CourseId,
            UserId = dto.UserId,
            CertificateCode = code,
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

    private static string GenerateCode()
    {
        // 12-char uppercase code
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var bytes = RandomNumberGenerator.GetBytes(12);
        return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
    }
}
