using OnlineLearningPlatform.Domain;
using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Questions;

public class QuestionCreateDto
{
    [Required]
    public string QuestionText { get; set; } = string.Empty;

    [Required]
    public QuestionType QuestionType { get; set; } // MCQ / MSQ / TrueFalse / ShortAnswer

    public string? Explanation { get; set; }
}

public class QuestionReadDto
{
    public int Id { get; set; }
    public int QuestionBankId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; }
    public string? Explanation { get; set; }

    public List<AnswerOptionReadDto> AnswerOptions { get; set; } = new();
}
