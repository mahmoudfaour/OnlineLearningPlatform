namespace OnlineLearningPlatform.Application.DTOs.Progress;

public class CourseProgressDto
{
    public int CourseId { get; set; }

    public int TotalLessons { get; set; }
    public int CompletedLessons { get; set; }
    public double LessonsProgressPercent { get; set; }

    public List<QuizAttemptSummaryDto> QuizHistory { get; set; } = new();

    public double OverallPercent { get; set; }
}

public class QuizAttemptSummaryDto
{
    public int QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public double BestScorePercent { get; set; }
    public int AttemptsCount { get; set; }
    public DateTime? LastAttemptAt { get; set; }
}
