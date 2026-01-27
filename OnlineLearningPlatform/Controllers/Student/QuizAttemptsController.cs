using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Attempts;
using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Domain.Models;
using OnlineLearningPlatform.Infrastructure;

namespace OnlineLearningPlatform.API;

[ApiController]
[Route("api/student/quizzes")]
[Authorize(Roles = "Student")]
public class QuizAttemptsController : ControllerBase
{
    private readonly AppDbContext _db;
    public QuizAttemptsController(AppDbContext db) => _db = db;

    private int GetUserIdFromToken()
    {
        // Works with common JWT setups (NameIdentifier) and your custom "id" claim
        var idStr =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirst("id")?.Value;

        if (string.IsNullOrWhiteSpace(idStr))
            throw new UnauthorizedAccessException("Missing user id claim.");

        return int.Parse(idStr);
    }

    // ✅ OPTION B: Used by dashboard to compute Pending Quizzes correctly
    // GET: api/student/quizzes/final/status/{courseId}
    [HttpGet("final/status/{courseId:int}")]
    public async Task<IActionResult> GetFinalQuizStatus(int courseId)
    {
        var userId = GetUserIdFromToken();

        // Must be actively enrolled
        var enrolled = await _db.CourseEnrollments.AsNoTracking().AnyAsync(e =>
            e.CourseId == courseId &&
            e.UserId == userId &&
            e.Status == EnrollmentStatus.Active);

        if (!enrolled)
            return Ok(new
            {
                courseId,
                enrolled = false,
                hasFinalQuiz = false,
                lessonsCompleted = false,
                attempted = false,
                passed = false
            });

        // Find final quiz for this course
        var finalQuiz = await _db.Quizzes.AsNoTracking()
            .Where(q => q.CourseId == courseId && q.IsFinal)
            .Select(q => new { q.Id, q.PassingScorePercent })
            .FirstOrDefaultAsync();

        if (finalQuiz is null)
        {
            return Ok(new
            {
                courseId,
                enrolled = true,
                hasFinalQuiz = false,
                lessonsCompleted = false,
                attempted = false,
                passed = false
            });
        }

        // Lessons completion status
        var totalLessons = await _db.Lessons.AsNoTracking()
            .CountAsync(l => l.CourseId == courseId);

        var completedLessons = await _db.LessonCompletions.AsNoTracking()
            .Join(_db.Lessons.AsNoTracking(),
                lc => lc.LessonId,
                l => l.Id,
                (lc, l) => new { lc, l })
            .CountAsync(x => x.lc.UserId == userId && x.l.CourseId == courseId);

        var lessonsCompleted = (totalLessons == 0) ? false : completedLessons >= totalLessons;

        // Latest submitted attempt for that final quiz
        var latestAttempt = await _db.QuizAttempts.AsNoTracking()
            .Where(a => a.QuizId == finalQuiz.Id && a.UserId == userId && a.SubmittedAt != null)
            .OrderByDescending(a => a.SubmittedAt)
            .Select(a => new { a.Id, a.ScorePercent, a.SubmittedAt })
            .FirstOrDefaultAsync();

        var attempted = latestAttempt != null;
        var passed = attempted && latestAttempt!.ScorePercent >= finalQuiz.PassingScorePercent;

        return Ok(new
        {
            courseId,
            enrolled = true,
            hasFinalQuiz = true,
            finalQuizId = finalQuiz.Id,
            passingScorePercent = finalQuiz.PassingScorePercent,
            lessonsCompleted,
            totalLessons,
            completedLessons,
            attempted,
            lastAttemptId = latestAttempt?.Id,
            lastScorePercent = latestAttempt?.ScorePercent,
            passed
        });
    }

    // POST: api/student/quizzes/{quizId}/attempts/start
    [HttpPost("{quizId:int}/attempts/start")]
    public async Task<ActionResult<QuizAttemptStartedDto>> StartAttempt(
        int quizId,
        [FromBody] StartQuizAttemptDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        // ✅ Always trust JWT, not body
        var userId = GetUserIdFromToken();

        var quiz = await _db.Quizzes.AsNoTracking()
            .Where(q => q.Id == quizId)
            .Select(q => new { q.Id, q.CourseId, q.IsFinal, q.PassingScorePercent })
            .FirstOrDefaultAsync();

        if (quiz is null) return NotFound("Quiz not found.");

        var enrolled = await _db.CourseEnrollments.AnyAsync(e =>
            e.CourseId == quiz.CourseId &&
            e.UserId == userId &&
            e.Status == EnrollmentStatus.Active);

        if (!enrolled)
            return BadRequest("User is not actively enrolled in the course of this quiz.");

        // Block final quiz unless all lessons completed
        if (quiz.IsFinal)
        {
            var totalLessons = await _db.Lessons.AsNoTracking()
                .CountAsync(l => l.CourseId == quiz.CourseId);

            var completedLessons = await _db.LessonCompletions.AsNoTracking()
                .Join(_db.Lessons.AsNoTracking(),
                      lc => lc.LessonId,
                      l => l.Id,
                      (lc, l) => new { lc, l })
                .CountAsync(x => x.lc.UserId == userId && x.l.CourseId == quiz.CourseId);

            if (totalLessons > 0 && completedLessons < totalLessons)
                return BadRequest("Complete all lessons before taking the final quiz.");
        }

        var lastAttemptNumber = await _db.QuizAttempts.AsNoTracking()
            .Where(a => a.QuizId == quizId && a.UserId == userId)
            .MaxAsync(a => (int?)a.AttemptNumber) ?? 0;

        var attempt = new QuizAttempt
        {
            QuizId = quizId,
            UserId = userId,
            AttemptNumber = lastAttemptNumber + 1,
            StartedAt = DateTime.UtcNow,
            SubmittedAt = null,
            ScorePercent = 0
        };

        _db.QuizAttempts.Add(attempt);
        await _db.SaveChangesAsync();

        return Ok(new QuizAttemptStartedDto
        {
            AttemptId = attempt.Id,
            QuizId = attempt.QuizId,
            UserId = attempt.UserId,
            AttemptNumber = attempt.AttemptNumber,
            StartedAt = attempt.StartedAt
        });
    }

    // POST: api/student/quizzes/attempts/{attemptId}/submit
    [HttpPost("attempts/{attemptId:int}/submit")]
    public async Task<ActionResult<QuizAttemptResultDto>> SubmitAttempt(
        int attemptId,
        [FromBody] SubmitQuizAttemptDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var userId = GetUserIdFromToken();

        var attempt = await _db.QuizAttempts
            .Include(a => a.Quiz)
                .ThenInclude(q => q.QuizQuestions)
                    .ThenInclude(qq => qq.Question)
                        .ThenInclude(qu => qu.AnswerOptions)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

        if (attempt is null) return NotFound("Attempt not found.");
        if (attempt.UserId != userId) return Forbid("You cannot submit another user's attempt.");
        if (attempt.SubmittedAt != null) return BadRequest("This attempt is already submitted.");

        // safety: must still be enrolled
        var enrolled = await _db.CourseEnrollments.AnyAsync(e =>
            e.CourseId == attempt.Quiz.CourseId &&
            e.UserId == attempt.UserId &&
            e.Status == EnrollmentStatus.Active);

        if (!enrolled) return BadRequest("User is not actively enrolled in the course of this quiz.");

        var quizQuestions = attempt.Quiz.QuizQuestions.OrderBy(x => x.OrderIndex).ToList();
        var totalPoints = quizQuestions.Sum(x => x.Points);

        var answers = dto.Answers ?? new List<SubmitAnswerDto>();
        var answerMap = answers.ToDictionary(a => a.QuestionId, a => a);

        var earnedPoints = 0;
        var resultAnswers = new List<AttemptAnswerResultDto>();

        foreach (var qq in quizQuestions)
        {
            var question = qq.Question;
            answerMap.TryGetValue(question.Id, out var submitted);

            var correctOptionIds = question.AnswerOptions
                .Where(o => o.IsCorrect)
                .Select(o => o.Id)
                .ToHashSet();

            bool isCorrect = false;

            if (submitted != null)
            {
                switch (question.QuestionType)
                {
                    case QuestionType.MCQ:
                    case QuestionType.TrueFalse:
                        if (submitted.SelectedAnswerOptionId.HasValue)
                            isCorrect = correctOptionIds.Contains(submitted.SelectedAnswerOptionId.Value);
                        break;

                    case QuestionType.MSQ:
                        var selected = (submitted.SelectedAnswerOptionIds ?? new List<int>()).ToHashSet();
                        isCorrect = selected.SetEquals(correctOptionIds) && selected.Count > 0;
                        break;

                    case QuestionType.ShortAnswer:
                        // You can later implement text comparison or manual grading
                        isCorrect = false;
                        break;
                }
            }

            var pointsEarned = isCorrect ? qq.Points : 0;
            earnedPoints += pointsEarned;

            var attemptAnswer = new AttemptAnswer
            {
                AttemptId = attempt.Id,
                QuestionId = question.Id,
                SelectedAnswerOptionId = (question.QuestionType is QuestionType.MCQ or QuestionType.TrueFalse)
                    ? submitted?.SelectedAnswerOptionId
                    : null,
                ShortAnswerText = question.QuestionType == QuestionType.ShortAnswer ? submitted?.ShortAnswerText : null,
                IsCorrect = isCorrect,
                PointsEarned = pointsEarned
            };

            _db.AttemptAnswers.Add(attemptAnswer);
            await _db.SaveChangesAsync(); // keeps attemptAnswer.Id available for selections

            if (question.QuestionType == QuestionType.MSQ)
            {
                var selectedIds = submitted?.SelectedAnswerOptionIds ?? new List<int>();
                foreach (var optId in selectedIds.Distinct())
                {
                    _db.AttemptAnswerSelections.Add(new AttemptAnswerSelection
                    {
                        AttemptAnswerId = attemptAnswer.Id,
                        AnswerOptionId = optId
                    });
                }
                await _db.SaveChangesAsync();
            }

            resultAnswers.Add(new AttemptAnswerResultDto
            {
                QuestionId = question.Id,
                IsCorrect = isCorrect,
                PointsEarned = pointsEarned
            });
        }

        var scorePercent = totalPoints == 0 ? 0 : (earnedPoints * 100.0 / totalPoints);

        attempt.SubmittedAt = DateTime.UtcNow;
        attempt.ScorePercent = scorePercent;
        await _db.SaveChangesAsync();

        return Ok(new QuizAttemptResultDto
        {
            AttemptId = attempt.Id,
            QuizId = attempt.QuizId,
            UserId = attempt.UserId,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt.Value,
            ScorePercent = attempt.ScorePercent,
            TotalPoints = totalPoints,
            EarnedPoints = earnedPoints,
            Answers = resultAnswers
        });
    }
}
