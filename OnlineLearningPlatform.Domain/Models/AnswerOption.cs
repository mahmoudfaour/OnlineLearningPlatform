using OnlineLearningPlatform.Domain.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OnlineLearningPlatform.Domain.Models;

public class AnswerOption
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(Question))]
    public int QuestionId { get; set; }
    public Question? Question { get; set; }

    [Required]
    public string AnswerText { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }
}
