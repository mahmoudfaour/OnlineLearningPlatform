using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Domain.Models;

public class AiQuizDraftOption
{
    [Key]
    public int Id { get; set; }

    public int DraftQuestionId { get; set; }
    public AiQuizDraftQuestion DraftQuestion { get; set; } = null!;

    [Required]
    public string AnswerText { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }
}
