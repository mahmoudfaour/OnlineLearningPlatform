using OnlineLearningPlatform.Domain;
using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Quizzes;

public class QuizQuestionAddDto
{
    [Required]
    public int QuestionId { get; set; }

    [Range(1, 100)]
    public int Points { get; set; } = 1;

    [Range(1, 100000)]
    public int OrderIndex { get; set; } = 1;
}

public class QuizQuestionReadDto
{
    public int Id { get; set; }
    public int QuizId { get; set; }
    public int QuestionId { get; set; }
    public int Points { get; set; }
    public int OrderIndex { get; set; }

    // useful for Swagger display
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }
}
