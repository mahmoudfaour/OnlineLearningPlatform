using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Quizzes;

public class QuizCreateDto
{
    [Required]
    public int CourseId { get; set; }

    public int? LessonId { get; set; } // optional

    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Range(0, 100)]
    public int PassingScorePercent { get; set; } = 60;

    [Range(10, 86400)]
    public int TimeLimitSeconds { get; set; } = 600;
}

public class QuizReadDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public int? LessonId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int PassingScorePercent { get; set; }
    public int TimeLimitSeconds { get; set; }
    public DateTime CreatedAt { get; set; }

    // include attached questions
    public List<QuizQuestionReadDto> QuizQuestions { get; set; } = new();
}
