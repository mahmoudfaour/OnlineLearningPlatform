using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Application.DTOs.Questions;

public class AnswerOptionCreateDto
{
    [Required]
    public string AnswerText { get; set; } = string.Empty;

    [Required]
    public bool IsCorrect { get; set; }
}

public class AnswerOptionReadDto
{
    public int Id { get; set; }
    public int QuestionId { get; set; }
    public string AnswerText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}
