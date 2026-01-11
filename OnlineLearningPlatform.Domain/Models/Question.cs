using OnlineLearningPlatform.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OnlineLearningPlatform.Domain;

public class Question
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(QuestionBank))]
    public int QuestionBankId { get; set; }
    public QuestionBank? QuestionBank { get; set; }

    [Required]
    public string QuestionText { get; set; } = string.Empty;

    public QuestionType QuestionType { get; set; }
    public string? Explanation { get; set; }

    public ICollection<AnswerOption> AnswerOptions { get; set; } = new List<AnswerOption>();
}
