using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Attempts;

public class StartQuizAttemptDto
{
    [Required]
    public int UserId { get; set; }
}

public class QuizAttemptStartedDto
{
    public int AttemptId { get; set; }
    public int QuizId { get; set; }
    public int UserId { get; set; }
    public int AttemptNumber { get; set; }
    public DateTime StartedAt { get; set; }
}

public class SubmitQuizAttemptDto
{
    [Required]
    public List<SubmitAnswerDto> Answers { get; set; } = new();
}

public class SubmitAnswerDto
{
    [Required]
    public int QuestionId { get; set; }

    // For MCQ / TrueFalse
    public int? SelectedAnswerOptionId { get; set; }

    // For MSQ
    public List<int>? SelectedAnswerOptionIds { get; set; }

    // For ShortAnswer
    public string? ShortAnswerText { get; set; }
}

public class QuizAttemptResultDto
{
    public int AttemptId { get; set; }
    public int QuizId { get; set; }
    public int UserId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime SubmittedAt { get; set; }

    public double ScorePercent { get; set; }
    public int TotalPoints { get; set; }
    public int EarnedPoints { get; set; }

    public List<AttemptAnswerResultDto> Answers { get; set; } = new();
}

public class AttemptAnswerResultDto
{
    public int QuestionId { get; set; }
    public bool IsCorrect { get; set; }
    public int PointsEarned { get; set; }
}
