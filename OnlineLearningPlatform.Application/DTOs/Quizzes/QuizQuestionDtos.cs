using OnlineLearningPlatform.Domain;
using OnlineLearningPlatform.Application.DTOs.Questions; // ✅ for AnswerOptionReadDto
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

    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }

    // ✅ ADD THIS so controller can return options
    public List<AnswerOptionReadDto> AnswerOptions { get; set; } = new();
}
