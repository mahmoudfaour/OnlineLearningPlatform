using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineLearningPlatform.Application.DTOs.Attempts;
using OnlineLearningPlatform.Models;
using OnlineLearningPlatform.Infrastructure;
using OnlineLearningPlatform.Domain;



namespace OnlineLearningPlatform.API;

[ApiController]
[Route("api/student/quizzes")]
public class QuizAttemptsController : ControllerBase
{
    private readonly AppDbContext _db;
    public QuizAttemptsController(AppDbContext db) => _db = db;

    // POST: api/student/quizzes/{quizId}/attempts/start
    [HttpPost("{quizId:int}/attempts/start")]
    public async Task<ActionResult<QuizAttemptStartedDto>> StartAttempt(int quizId, [FromBody] StartQuizAttemptDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var quiz = await _db.Quizzes.AsNoTracking()
            .Select(q => new { q.Id, q.CourseId })
            .FirstOrDefaultAsync(q => q.Id == quizId);

        if (quiz is null) return NotFound("Quiz not found.");

        // Student must be actively enrolled in the course
        var enrolled = await _db.CourseEnrollments.AnyAsync(e =>
            e.CourseId == quiz.CourseId &&
            e.UserId == dto.UserId &&
            e.Status == EnrollmentStatus.Active);

        if (!enrolled) return BadRequest("User is not actively enrolled in the course of this quiz.");

        // AttemptNumber = max + 1
        var lastAttemptNumber = await _db.QuizAttempts
            .Where(a => a.QuizId == quizId && a.UserId == dto.UserId)
            .MaxAsync(a => (int?)a.AttemptNumber) ?? 0;

        var attempt = new QuizAttempt
        {
            QuizId = quizId,
            UserId = dto.UserId,
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
    public async Task<ActionResult<QuizAttemptResultDto>> SubmitAttempt(int attemptId, [FromBody] SubmitQuizAttemptDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        // Load attempt + quiz + quiz questions + correct answers
        var attempt = await _db.QuizAttempts
            .Include(a => a.Quiz)
                .ThenInclude(q => q.QuizQuestions)
                    .ThenInclude(qq => qq.Question)
                        .ThenInclude(qu => qu.AnswerOptions)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

        if (attempt is null) return NotFound("Attempt not found.");
        if (attempt.SubmittedAt != null) return BadRequest("This attempt is already submitted.");

        // Ensure student still enrolled
        var enrolled = await _db.CourseEnrollments.AnyAsync(e =>
            e.CourseId == attempt.Quiz.CourseId &&
            e.UserId == attempt.UserId &&
            e.Status == EnrollmentStatus.Active);

        if (!enrolled) return BadRequest("User is not actively enrolled in the course of this quiz.");

        var quizQuestions = attempt.Quiz.QuizQuestions.OrderBy(x => x.OrderIndex).ToList();
        var totalPoints = quizQuestions.Sum(x => x.Points);

        var answerMap = dto.Answers.ToDictionary(a => a.QuestionId, a => a);

        var earnedPoints = 0;
        var resultAnswers = new List<AttemptAnswerResultDto>();

        foreach (var qq in quizQuestions)
        {
            var question = qq.Question;
            var pointsForQuestion = qq.Points;

            answerMap.TryGetValue(question.Id, out var submitted);

            bool isCorrect = false;

            // Build correct option set
            var correctOptionIds = question.AnswerOptions
                .Where(o => o.IsCorrect)
                .Select(o => o.Id)
                .ToHashSet();

            if (submitted is null)
            {
                isCorrect = false;
            }
            else
            {
                switch (question.QuestionType)
                {
                    case QuestionType.MCQ:
                    case QuestionType.TrueFalse:
                        if (submitted.SelectedAnswerOptionId.HasValue)
                        {
                            isCorrect = correctOptionIds.Contains(submitted.SelectedAnswerOptionId.Value);
                        }
                        break;

                    case QuestionType.MSQ:
                        var selected = (submitted.SelectedAnswerOptionIds ?? new List<int>()).ToHashSet();
                        // Exact match = correct
                        isCorrect = selected.SetEquals(correctOptionIds) && selected.Count > 0;
                        break;

                    case QuestionType.ShortAnswer:
                        // Usually manual grading later (for now: not auto-correct)
                        isCorrect = false;
                        break;
                }
            }

            var pointsEarned = isCorrect ? pointsForQuestion : 0;
            earnedPoints += pointsEarned;

            // Save AttemptAnswer row
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
            await _db.SaveChangesAsync(); // to get attemptAnswer.Id for MSQ selections

            // For MSQ: store selected option ids in AttemptAnswerSelections
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

    // GET: api/student/quizzes/{quizId}/attempts/user/{userId}
    [HttpGet("{quizId:int}/attempts/user/{userId:int}")]
    public async Task<ActionResult<List<QuizAttempt>>> GetAttempts(int quizId, int userId)
    {
        var attempts = await _db.QuizAttempts.AsNoTracking()
            .Where(a => a.QuizId == quizId && a.UserId == userId)
            .OrderByDescending(a => a.AttemptNumber)
            .ToListAsync();

        return Ok(attempts);
    }
}
