namespace OnlineLearningPlatform;

public class CourseProgressDto
{
    public int CourseId { get; set; }
    public int UserId { get; set; }

    public int TotalLessons { get; set; }
    public int CompletedLessons { get; set; }

    public double LessonsProgressPercent { get; set; } // 0-100

    public List<QuizAttemptSummaryDto> QuizHistory { get; set; } = new();

    // Optional overall combining lessons + quizzes (simple version)
    public double OverallPercent { get; set; } // 0-100
}

public class QuizAttemptSummaryDto
{
    public int QuizId { get; set; }
    public string QuizTitle { get; set; } = string.Empty;
    public double BestScorePercent { get; set; }
    public int AttemptsCount { get; set; }
    public DateTime? LastAttemptAt { get; set; }
}
