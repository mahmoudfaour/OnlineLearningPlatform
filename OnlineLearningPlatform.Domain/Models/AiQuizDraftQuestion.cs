using System.ComponentModel.DataAnnotations;

namespace OnlineLearningPlatform.Domain.Models;

public class AiQuizDraftQuestion
{
    [Key]
    public int Id { get; set; }

    public int DraftId { get; set; }
    public AiQuizDraft Draft { get; set; } = null!;

    [Required]
    public string QuestionText { get; set; } = string.Empty;

    [Required]
    public QuestionType QuestionType { get; set; } = QuestionType.MCQ;

    public string? Explanation { get; set; }

    public List<AiQuizDraftOption> Options { get; set; } = new();
}
